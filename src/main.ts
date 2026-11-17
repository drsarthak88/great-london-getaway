import './style.css';
import { Game } from './game/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLDivElement;

const game = new Game(canvas, uiRoot);

// Handle for automated browser tests and console debugging.
(window as unknown as { __GLG: Game }).__GLG = game;
