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

## London zones
The run cycles through eight bright, storybook parts of London, each with its own
colours and landmarks. A banner announces each zone, and a "Did you know?" postcard
pops up with a true fact the first time each landmark appears.

1. **Westminster**: the Houses of Parliament and Big Ben (its clock shows the real time)
2. **South Bank**: the London Eye turning slowly beside the turquoise Thames
3. **Tower Bridge**: the Tower of London and its ravens, then the road crosses the
   bridge, where lifted bascules leave gaps you must jump
4. **Buckingham Palace & The Mall**: a red road, park trees, the palace, the Victoria
   Memorial and extra Royal Guards
5. **Trafalgar Square & Piccadilly Circus**: Nelson's Column and its lions, and bright
   screens with made-up adverts
6. **Baker Street**: warm brick terraces, gas lamps and the 221B door; Inspector Bones
   knows these streets and is faster here
7. **St Paul's & the City**: the great dome, with the Shard and the Gherkin on the skyline
8. **Camden & Notting Hill**: rainbow houses, market stalls and carnival bunting

**Weather:** fog patches (a soft lilac pea-souper where the lanterns glow) and
drizzle showers (rain and extra puddles), followed by a rainbow.

## Menus and progress
- **Storybook intro:** four illustrated pages on first launch (skippable, replay from Settings).
- **Title screen:** an open storybook with Play, Shop, Missions and Settings.
- **Missions:** sets of three. Finish a set to raise your score multiplier for good.
- **Shop:**
  - **Wardrobe:** flat cap, bowler hat, Union Jack scarf, pearly king jacket.
  - **Upgrades:** each power-up lasts longer with every level.
- **Second chance:** when caught, spend a Teapot Token to escape (once per run).
- **Case File:** your score, best, coins, mission progress, a "Did you know?" fact and a
  Share button (uses the phone's share sheet, or copies the message).
- **Settings:** music and sound volume, reduced motion, colour-blind friendly UI.
- Progress saves automatically on the device.

## Sound
All sound is made live with the Web Audio API, so there are no audio files to download:
- **Music:** an original, bouncy music-hall tune, with a gentler version on the menus.
  It slows down during Tea Time.
- **Sound effects:** coins, jumps, rolls, crashes, splashes, a police whistle when
  you're caught, a corgi bark, a taxi horn, a helicopter rotor and a kettle whistle.
- **Big Ben:** plays the Westminster Quarters (public domain) on synthesised bells
  as you pass.

Sound starts after the first tap or key press (browsers require this). Music and
sound-effect volumes are in Settings.

## Performance
- **Characters:** each one is a single skinned mesh (a few draw calls instead of dozens).
- **Street:** furniture is instanced once across all chunks, and static props and
  landmarks are merged into vertex-coloured meshes.
- **Sky:** the clouds are merged into one mesh.
- **Draw calls:** a busy scene draws about 85–150 times per frame.
- **Adaptive resolution:** if a device can't keep up, the render resolution steps down
  automatically (and back up when there's headroom). High-DPI phones skip costly MSAA.
- **No per-frame garbage:** pooled obstacles, coins and particles mean no
  garbage-collection hitches during a run.

## Phones, tablets and desktop
The game runs in any modern browser. Touch controls (swipe), notch-safe layout and
menus that scale with the screen make it comfortable on phones, iPads/tablets and
desktops, in portrait or landscape. It can be added to the home screen to run full
screen (web app manifest included).

Loading is light: an instant HTML splash, no images or 3D model files (everything is
drawn in code), and about 200 KB of gzipped JavaScript, with Three.js in its own
long-cached chunk.

## Ready for future updates
The code is arranged so these can be added later without rewrites:
- **Accounts and cloud saves:** all saving goes through `services/Storage.ts`
  (`KeyValueStore`). Swap `LocalStore` for a cloud-backed store. The save format is
  versioned and migrated (`profile/Profile.ts`), so old saves upgrade cleanly.
- **Online scores and friends:** `services/Leaderboard.ts` defines a `Leaderboard`
  interface. Today it's a local top 10; an online version can implement the same interface.
- **Sharing:** `services/Share.ts` (Web Share API with a copy fallback).
- **Costume packs, including paid ones:** wardrobe items and packs are data in
  `data/wardrobe.ts`. Items can belong to a `pack`, and the shop already shows packs
  as "Coming soon". Ownership is a list in the profile, ready for purchases or entitlements.
- **Android and iOS apps:** the game is a self-contained web app, so it can be wrapped
  with a tool such as Capacitor. Storage would switch to native preferences behind the same
  interface.

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
  data/                obstacle patterns (each one tested to leave a way through),
                       zones (palettes, landmarks, rivers, bridge), postcard facts
  entities/            PlayerController (pure movement logic), Player and Detective
                       views, CharacterAnimator + Poses (procedural animation),
                       pooled obstacle views and instanced coins
  input/               keyboard + swipe input, SwipeDetector (pure)
  models/              procedural builders: landmarks, sky (dome, clouds, rainbow,
                       skyline), Biped rig, Cat (Jack), Detective,
                       Bus, Cab, Teapot, street props (phone box, post box,
                       roadworks, Mind the Gap gantry, Royal Guard, pigeons...)
  debug/               model gallery (open the game with ?gallery)
  render/              renderer, toon materials, outlines, canvas textures,
                       static mesh merging
  powerups/            PowerUps timers (pure), magnet pull, effects and pickups
  profile/             versioned save data, shop rules, multiplier
  services/            storage, leaderboard and sharing (swappable backends)
  ui/                  HUD (detective meter, power-up rings), menus (App), SVG art
  utils/               small pure helpers (math, seeded random)
tests/                 Vitest unit tests for pure logic
```

## Credits
See [CREDITS.md](CREDITS.md).
