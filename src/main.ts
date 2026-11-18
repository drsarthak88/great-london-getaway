import './style.css';
import './ui/screens.css';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLDivElement;

/** Hide the instant HTML splash once the first frame of the game has been drawn. */
function hideSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('splash-out');
  window.setTimeout(() => splash.remove(), 500);
}

async function boot(): Promise<void> {
  if (new URLSearchParams(location.search).has('gallery')) {
    // Model review page; split into its own chunk so players never download it.
    const m = await import('./debug/Gallery');
    m.startGallery(canvas, uiRoot);
    hideSplash();
    return;
  }
  const [{ Game }, { App }, { LocalStore }, { loadProfile }, { AudioEngine }] = await Promise.all([
    import('./game/Game'),
    import('./ui/App'),
    import('./services/Storage'),
    import('./profile/Profile'),
    import('./audio/Audio'),
  ]);
  const store = new LocalStore();
  const profile = await loadProfile(store);
  const audio = new AudioEngine();
  const game = new Game(canvas, uiRoot, profile);
  game.events.on(audio.onEvent);
  const app = new App(game, store, uiRoot, audio);
  requestAnimationFrame(() => requestAnimationFrame(hideSplash));
  // Handles for automated browser tests and console debugging.
  Object.assign(window as object, { __GLG: game, __APP: app, __AUDIO: audio });
}

void boot();
