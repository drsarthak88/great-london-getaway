import './style.css';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLDivElement;

if (new URLSearchParams(location.search).has('gallery')) {
  // Model review page; split into its own chunk so players never download it.
  void import('./debug/Gallery').then((m) => m.startGallery(canvas, uiRoot));
} else {
  void import('./game/Game').then(({ Game }) => {
    const game = new Game(canvas, uiRoot);
    // Handle for automated browser tests and console debugging.
    (window as unknown as { __GLG: unknown }).__GLG = game;
  });
}
