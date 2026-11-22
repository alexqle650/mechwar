# Mech Wars: Crate Clash

A browser mech game in a single self-contained HTML file (WebGL2, no dependencies).

Open `index.html` in a browser to play. Progress saves in the browser's localStorage.

## Controls
- WASD move, mouse aim, click/hold to shoot, wheel zoom, Z / C or right-drag to turn the camera
- Q pulse blast, Space leg ability, E open crate / buy off the belt
- R get in or out of your mech, B workshop, I index, K skins, U upgrades, M sound
- F / G / H fight, flee or send a crate to the yard
- P multiplayer menu

## Multiplayer (online, 2 players)
1. One player presses **P → Host and get a code** and sends the 6-character code to a friend.
2. The friend opens the same page, presses **P**, types the code and presses **Join**.
3. You'll see each other move. The host finds the friend's base through the **east** gate of their base; the guest finds the host's base through the **west** gate.

Each player keeps their own save; nothing about your progress is sent. The browsers meet through the free [PeerJS](https://peerjs.com) cloud server, then talk directly over WebRTC. No server of your own and no API key are needed. Your friend can see your IP address, so only play with people you know. Some school or work networks block direct connections.

## Contributing
See `AGENTS.md` for repo rules, especially: never commit API keys or other secrets. After cloning, run `git config core.hooksPath .githooks` to turn on the secret check.
