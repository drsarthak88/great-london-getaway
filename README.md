# The Great London Getaway

A storybook-style 3D endless runner through the streets of London, built with
Vite, TypeScript and Three.js.

**Marmalade Jack**, a cheeky ginger tomcat, has pinched the **Golden Teapot** from a
museum, and **Inspector Hemlock Bones** is hot on his tail. Dodge and climb red
double-decker buses, collect pennies and sovereigns, and leg it past London's landmarks.

Everything (characters, vehicles, buildings, music and sound) is generated
procedurally in code. No external models are downloaded.

## Play
- **Desktop:** ← → / A D change lane, ↑ / W / Space jump, ↓ / S roll
- **Mobile:** swipe left, right, up or down; tap to start
- **Pause:** Esc / P or the pause button

## Run locally
Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # dev server at http://localhost:5173/
npm test           # Vitest unit tests
npm run build      # type-check and production build into dist/
npm run preview    # serve the build at http://localhost:4173/great-london-getaway/
```

## Model gallery
Add `?gallery` to the URL to review the procedural models side by side, e.g.
`http://localhost:5173/?gallery&anim=run&view=front&focus=cat`.

- `anim`: `run`, `idle`, `jump`, `fall` or `roll`
- `view`: `front`, `back` or `side`
- `focus`: `cat` or `detective` for a close-up
- `t`: freeze the animation at that many seconds (useful for screenshots)

## Deploy to GitHub Pages
The workflow in `.github/workflows/deploy.yml` tests, builds and deploys every push
to `main`. Pull requests are built and tested but not deployed.

One-time setup:
1. In the repository on GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow by hand from the **Actions** tab).

The game is then served at `https://<your-user>.github.io/great-london-getaway/`.
The sub-path comes from `base` in `vite.config.ts`. If you rename the repository,
update `REPO_BASE` there to match.

## Project layout
```
src/
  main.ts              entry point
  config.ts            all gameplay tunables in one place
  game/                Game loop and states, World (pooled track chunks),
                       TrackLayout, Lanes, Difficulty, CameraRig
  entities/            PlayerController (pure movement logic), Player and Detective
                       views, CharacterAnimator + Poses (procedural animation)
  input/               keyboard + swipe input, SwipeDetector (pure)
  models/              procedural builders: Biped rig, Cat (Jack), Detective,
                       Bus, Cab, Teapot
  debug/               model gallery (open the game with ?gallery)
  render/              renderer, toon materials, outlines, canvas textures,
                       static mesh merging
  ui/                  HTML/CSS overlays (HUD)
  utils/               small pure helpers (math, seeded random)
tests/                 Vitest unit tests for pure logic
```

## Credits
See [CREDITS.md](CREDITS.md).
