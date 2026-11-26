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
  build:(tier,area)=>{ S.parts.length = 0; for (const sl of SLOTS){ const p = newPart(tier, sl, area, 1); if (sl === 'Weapon'){ const it = ITEMS.find(i => i.slot === 'Weapon' && i.k === 'Blaster'); p.name = it.name; p.area = it.area; } S.parts.push(p); S.eq[sl] = p.id; }   // a gun, not a random melee weapon
    S.mechBuilt = true; ST = stats(); MECH.state='parked'; MECH.x=P.x; MECH.y=P.y; enterMech(); MECH.hp = ST.maxhp; },
  fire:()=>{ P.aim = Math.atan2(NET.R.y - P.y, NET.R.x - P.x); fire(); }, live:()=>pvpLive(), PADS, LOCK, pad:(i)=>{ const q = newPart(4, 'Head', 1, 1); S.parts.push(q); S.pads[i] = q.id; NET.baseT = 0; return q.name; }};
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
  for (let i = 0; i < 150 && !(await B.evaluate(() => (window.__mw.S.pvpDeaths||0) > 0)); i++){ await A.evaluate(() => window.__mw.live() && window.__mw.fire()); await A.waitForTimeout(200); }
  for (let i = 0; i < 20 && !(await B.evaluate(() => (window.__mw.S.pvpDeaths||0) > 0)); i++) await A.waitForTimeout(250);   // hits are applied on the victim's side, a moment later
  check(await B.evaluate(() => (window.__mw.S.pvpDeaths||0) > 0), 'PvP hits land and knock the other player out');
  // stealing: A puts a part on pad 0, B walks into A's base (west of B's own on B's map) and grabs it, then runs home
  await A.evaluate(() => { window.__mw.tp(0, 300); window.__mw.pad(0); }); await A.waitForTimeout(4000);
  const nB = await B.evaluate(() => window.__mw.S.parts.length);
  await B.evaluate(() => { const m = window.__mw, d = m.PADS[0]; m.P.dead = false; m.tp(d.x + m.NET.side*1800, d.y); });
  await B.waitForTimeout(300); await B.keyboard.press('KeyE'); await B.waitForTimeout(800);
  check(await B.evaluate(() => !!window.__mw.P.carry) && await A.evaluate(() => window.__mw.S.pads[0] === null), 'a part on a friend\'s pad can be grabbed');
  await B.evaluate(() => window.__mw.tp(0, 300)); await B.waitForTimeout(1000);
  check(await B.evaluate(n => !window.__mw.P.carry && window.__mw.S.parts.length === n + 1, nB), 'carrying it home keeps the stolen part');
  // base lock: A locks, then B can't grab
  await A.evaluate(() => window.__mw.pad(1)); await A.keyboard.press('KeyL'); await A.waitForTimeout(4000);
  await B.evaluate(() => { const m = window.__mw, d = m.PADS[1]; m.tp(d.x + m.NET.side*1800, d.y); });
  await B.waitForTimeout(300); await B.keyboard.press('KeyE'); await B.waitForTimeout(800);
  check(await A.evaluate(() => window.__mw.S.pads[1] !== null && window.__mw.LOCK.until > 0) && await B.evaluate(() => !window.__mw.P.carry), 'a locked base can\'t be robbed');
  check(errors.length === 0, 'no errors on either page' + (errors.length ? ': ' + errors.join(' | ') : ''));
} finally { await browser.close(); server.close(); }
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
