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

## How to play
- Dodge, jump and roll past buses, cabs, phone boxes, post boxes, roadworks,
  pigeons, "Mind the Gap" gantries and Royal Guards. Ramps lead up onto bus roofs.
- Running head-on into something solid gets you caught at once.
- Clipping the side of something, or running into pigeons, is a stumble:
  Inspector Bones catches right up. Stumble again within 10 seconds and he's got you.
- Puddles slow you down for a moment. Jump them.
- Collect pennies, rare gold sovereigns (worth 10) and Teapot Tokens.
- Score is distance plus coins, times your multiplier.

## Power-ups
Grab the floating bubbles on the road. Each lasts 8–15 seconds (shown by a timer
ring in the corner), and shop upgrades make them last longer.

| Power-up | What it does |
| --- | --- |
| Helicopter Tail | Jack's tail becomes a rotor: fly above the traffic along a trail of coins, then land with a short safe window |
| Spring Tail | The tail coils into a spring: jumps go 3× higher, enough to clear a bus |
| Brolly Glide | A black umbrella pops open: big, floaty jumps and gentle falls |
| Teacup Magnet | A floating teacup pulls in nearby coins from every lane |
| Bobby's Helmet | A police custodian helmet that takes one hit for you |
| Black Cab Dash | Hop in a cab: an invincible speed burst that smashes barriers and swerves round buses |
| Tea Time | Time slows to half while steam swirls around Jack |
| Corgi Pal (rare) | A corgi trots alongside and barks Inspector Bones back by one stumble |

Helicopter, Spring, Brolly and Cab change how Jack moves, so picking one of them up
replaces another. The others stack.

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
- `set=props`: show all the street obstacles instead of the characters

## Debug URL options
- `?seed=<n>`: start with a fixed obstacle layout (repeatable runs)
- `?god`: Jack can't be caught (for automated playtests and screenshots)

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
  game/                Game loop and states, World (pooled street chunks),
                       Track (obstacle/coin spawner), Collision rules, Score,
                       Chase (stumbles and catches), Lanes, Difficulty, CameraRig
  data/                obstacle patterns (each one tested to leave a way through)
  entities/            PlayerController (pure movement logic), Player and Detective
                       views, CharacterAnimator + Poses (procedural animation),
                       pooled obstacle views and instanced coins
  input/               keyboard + swipe input, SwipeDetector (pure)
  models/              procedural builders: Biped rig, Cat (Jack), Detective,
                       Bus, Cab, Teapot, street props (phone box, post box,
                       roadworks, Mind the Gap gantry, Royal Guard, pigeons...)
  debug/               model gallery (open the game with ?gallery)
  render/              renderer, toon materials, outlines, canvas textures,
                       static mesh merging
  powerups/            PowerUps timers (pure), magnet pull, effects and pickups
  ui/                  HTML/CSS overlays (HUD, power-up timer rings)
  utils/               small pure helpers (math, seeded random)
tests/                 Vitest unit tests for pure logic
```

## Credits
See [CREDITS.md](CREDITS.md).
