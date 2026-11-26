// Smoke test: opens the game in headless Chrome and checks that the main things work.
// Run: npm test   (needs: npm install && npx playwright install chromium)
// Nothing here talks to the internet: PeerJS is replaced by tests/fakepeer.js, which links pages through a BroadcastChannel.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// a test-only hook so the test can read and nudge game state (never shipped: added to the page in memory)
const HOOK = `window.__mw = {P, S, NET, get R(){ return NET.R; }, tp:(x,y)=>{P.x=x;P.y=y;},
  build:(tier,area)=>{ S.parts.length = 0; for (const sl of SLOTS){ const p = newPart(tier, sl, area, 1); S.parts.push(p); S.eq[sl] = p.id; }
    S.mechBuilt = true; ST = stats(); MECH.state='parked'; MECH.x=P.x; MECH.y=P.y; enterMech(); MECH.hp = ST.maxhp; },
  fire:()=>{ P.aim = Math.atan2(NET.R.y - P.y, NET.R.x - P.x); fire(); }, live:()=>pvpLive()};
/* ================= loop ================= */`;
const page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace('/* ================= loop ================= */', HOOK);
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/index.html')){ res.writeHead(200, {'content-type': 'text/html'}); return res.end(page); }
  res.writeHead(404); res.end();
}).listen(0);
const URL_ = `http://localhost:${server.address().port}/`;

let failed = 0;
const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) failed++; };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } });
  await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());   // no internet: fonts and CDNs are blocked
  await ctx.addInitScript({ content: fs.readFileSync(path.join(ROOT, 'tests/fakepeer.js'), 'utf8') });
  const errors = [];
  const open = async tag => { const p = await ctx.newPage(); p.on('pageerror', e => errors.push(tag + ': ' + e.message));
    await p.goto(URL_); await p.waitForTimeout(600); await p.click('#playBtn'); await p.waitForTimeout(1500); return p; };

  const A = await open('A');
  check(await A.evaluate(() => !!window.__mw && window.__mw.P.hp > 0), 'game starts and the pilot is alive');
  await A.keyboard.press('Escape'); check(await A.isVisible('#ovSet'), 'Esc opens Settings'); await A.keyboard.press('Escape');
  await A.evaluate(() => { window.__mw.tp(0, -1000); window.__mw.build(3, 1); }); await A.waitForTimeout(1500);
  check(await A.evaluate(() => window.__mw.P.inMech), 'a mech can be built and entered');
  await A.screenshot({ path: path.join(ROOT, 'tests/out-mech.png') });

  // multiplayer: host on A, join on B
  await A.keyboard.press('KeyP'); await A.click('#netHostBtn'); await A.waitForTimeout(500);
  const code = (await A.textContent('#netCodeShow')).trim(); await A.keyboard.press('KeyP');
  check(/^[A-Z0-9]{6}$/.test(code), 'hosting shows a 6-character room code');
  const B = await open('B');
  await B.keyboard.press('KeyP'); await B.fill('#netCode', code); await B.click('#netJoinBtn'); await B.waitForTimeout(1500); await B.keyboard.press('KeyP');
  check(await A.evaluate(() => window.__mw.NET.status === 'online') && await B.evaluate(() => window.__mw.NET.status === 'online'), 'both players are connected');
  // PvP: both in Zone 1, A shoots B until B is knocked out
  await B.evaluate(() => window.__mw.tp(100, -1000)); await A.evaluate(() => window.__mw.tp(0, -1000));
  await A.waitForTimeout(2500);
  for (let i = 0; i < 60 && !(await B.evaluate(() => (window.__mw.S.pvpDeaths||0) > 0)); i++){ await A.evaluate(() => window.__mw.live() && window.__mw.fire()); await A.waitForTimeout(200); }
  check(await B.evaluate(() => (window.__mw.S.pvpDeaths||0) > 0), 'PvP hits land and knock the other player out');
  check(errors.length === 0, 'no errors on either page' + (errors.length ? ': ' + errors.join(' | ') : ''));
} finally { await browser.close(); server.close(); }
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
