# AGENTS.md

Instructions for AI coding agents (and humans) working on this repo.

## Project

Mech Wars: Crate Clash is a browser game in one self-contained file, `index.html` (WebGL2, no build step, no dependencies).
This repo is **public**, and `main` is deployed to GitHub Pages at https://alexqle650.github.io/mechwar/.
Everything committed here, and everything in `index.html`, can be read by anyone.

## Secrets: hard rules

1. **Never commit secrets.** That includes API keys, tokens, passwords, private keys, OAuth client secrets, webhook URLs with tokens in them, and `.env` files.
2. **Never put a secret in `index.html` or any file the site serves.** A static page is public: anyone can view its source. A key belongs on a server, never in client code.
3. **If a feature needs a key** (leaderboards, AI calls, analytics), stop and ask the user. The answer is a small backend or serverless function that keeps the key, which the game calls instead.
4. **Before every commit**, review the staged diff (`git diff --cached`) for anything that looks like a credential. Do not commit files you have not read.
5. **Never bypass the safeguards**: no `git commit --no-verify`, no bypassing GitHub push protection, and no removing patterns from `.gitignore` or `.githooks/` to make a commit go through.
6. **If a secret was committed or pushed**, deleting it in a new commit is not enough, because it stays in git history. Tell the user right away so the key gets **revoked and rotated** at its provider first, then clean the history.

## Safeguards in this repo

- `.gitignore` excludes common secret files (`.env*`, `*.key`, `*.pem`, `secrets.*`, `credentials*.json`, `config.local.*`).
- `.githooks/pre-commit` blocks commits whose staged changes look like API keys or tokens. Turn it on once per clone:

  ```sh
  git config core.hooksPath .githooks
  ```

- GitHub push protection blocks known secret formats on pushes to this public repo.

These are backstops. They catch common key formats, not everything, so rule 4 still applies.

## Working on the game

- Keep the game a single self-contained `index.html` unless the user asks otherwise.
- Saves use `localStorage` key `mechwars-v2`. Don't change the save format without telling the user, since it can wipe or break existing progress.
- Run `node --check` on the extracted `<script>` contents after edits to catch syntax errors.

## Multiplayer

- Online play uses PeerJS (loaded on demand from unpkg, with jsDelivr as a fallback) and the free PeerJS cloud signaling server. It needs no keys; keep it that way.
- Never add a TURN server username/password or any other credential to `index.html`. If a relay is needed, it must hand out short-lived credentials from a server.
- Everything received from the other player is untrusted: run it through the `clean*` functions, and show it with canvas text or `textContent`, never `innerHTML`.
- The friend's base is drawn `DX` to the side (host: east, guest: west). Positions inside the base area (`y > -24`) are shifted by `NET.side*DX` when received; zone positions are used as they are.
