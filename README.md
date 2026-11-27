# Mech Wars: Crate Clash

A browser mech game in a single self-contained HTML file (WebGL2, no dependencies).

Open `index.html` in a browser to play. Progress saves in the browser's localStorage.

## Controls
- WASD move, mouse aim, click/hold to shoot, wheel zoom, Z / C or right-drag to turn the camera
- Q pulse blast, Space jump, X dodge or leg ability (dash, slam, web, fly), E open crate / buy off the belt
- R get in or out of your mech, B workshop, I index, K skins, U upgrades, M sound
- F / G / H fight, flee or send a crate to the yard
- P multiplayer menu, N world map, Esc settings
- In multiplayer: E at a friend's display pad steals the part, L locks your own base for 60 seconds

## What's in it
- 8 zones with their own parts, enemies, mini-bosses and boss arenas (bosses have 3 phases)
- 8 rarities, each a completely different mech design; wear 3, 5 or 6 parts of the same rarity for a set bonus
- Enemy roles from Zone 2 (shield, sniper, healer, bomber) and elite modifiers (Swift, Armored, Volatile, Regen)
- Pets (J): 8 robot critters with perks, some fight; hatch capsules or win them from bosses
- World events (meteor showers, golden bots), 19 achievements in the Index, kill streaks, combos, missions, rebirths, skins, trails, display pads that earn scrap, and a guided start

## Testing
Settings (Esc) has **Admin tools** for testing: scrap, full sets of any rarity, speed x2/x4, god mode and instant crates. They change your save.
`npm test` runs a headless smoke test (see `tests/smoke.mjs`).

## Multiplayer (online, 2 players)
1. One player presses **P → Host and get a code** and sends the 6-character code to a friend.
2. The friend opens the same page, presses **P**, types the code and presses **Join**.
3. You'll see each other move. The host finds the friend's base through the **east** gate of their base; the guest finds the host's base through the **west** gate.

**Stealing:** walk into your friend's base and press E at one of their display pads. You carry the part home slowly and can't shoot; if they hit you, it flies back. Press L in your base to lock your gate for 60 seconds.

**PvP is always on outside the bases**: on the bridges, in the zones and in boss arenas you can ambush each other. Both bases are safe. If you're knocked out you respawn at home with a few seconds of spawn shield and lose nothing; the winner gets a kill and a scrap bonus (at most once every 2 minutes).

Each player keeps their own save; nothing about your progress is sent. The browsers meet through the free [PeerJS](https://peerjs.com) cloud server, then talk directly over WebRTC. No server of your own and no API key are needed. Your friend can see your IP address, so only play with people you know. Some school or work networks block direct connections.

## Contributing
See `AGENTS.md` for repo rules, especially: never commit API keys or other secrets. After cloning, run `git config core.hooksPath .githooks` to turn on the secret check.
