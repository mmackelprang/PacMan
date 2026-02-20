import { Game } from './game.js';

// Boot up the game
const game = new Game();

// Expose for debugging
(window as any).__game = game;
