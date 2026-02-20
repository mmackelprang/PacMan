import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 672, height: 864 });

const errors = [];
page.on('pageerror', err => errors.push(err.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

const wait = ms => new Promise(r => setTimeout(r, ms));

// Screenshot 1: Menu
await page.screenshot({ path: 'final_menu.png', fullPage: false });

// Start game
await page.click('canvas');
await page.keyboard.down('ArrowLeft');
await wait(100);
await page.keyboard.up('ArrowLeft');
await wait(2500); // Ready timer

// Play: move left to eat dots
await page.keyboard.down('ArrowLeft');
await wait(2000);
await page.keyboard.up('ArrowLeft');

// Move down
await page.keyboard.down('ArrowDown');
await wait(800);
await page.keyboard.up('ArrowDown');

// Move right
await page.keyboard.down('ArrowRight');
await wait(1000);
await page.keyboard.up('ArrowRight');

// Move up toward energizer
await page.keyboard.down('ArrowUp');
await wait(1500);
await page.keyboard.up('ArrowUp');

await wait(300);

// Screenshot 2: Mid-game with dots eaten, ghosts active
const state1 = await page.evaluate(() => ({
  state: window.__game.fsm.currentKey,
  score: window.__game.score,
  dots: window.__game.dotsEaten,
  lives: window.__game.lives,
  ghosts: window.__game.ghosts.map(g => ({ name: g.name, mode: g.mode, tile: `${g.tileCol},${g.tileRow}` })),
}));
console.log('Mid-game state:', JSON.stringify(state1, null, 2));
await page.screenshot({ path: 'final_gameplay.png', fullPage: false });

// Now trigger frightened mode for a dramatic shot
await page.evaluate(() => window.__game.triggerFrightened());
await wait(500);
await page.screenshot({ path: 'final_frightened.png', fullPage: false });

// Wait for flashing phase
await wait(4000);
await page.screenshot({ path: 'final_flashing.png', fullPage: false });

// Activate fruit for showcase
await page.evaluate(() => {
  const g = window.__game;
  g.fruitActive = true;
  g.fruitTimer = 99;
});
await wait(200);
await page.screenshot({ path: 'final_fruit.png', fullPage: false });

console.log('Final screenshots saved');
if (errors.length > 0) console.log('JS errors:', errors);
await browser.close();
