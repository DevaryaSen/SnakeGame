const ROWS = 20;
const COLS = 20;

// ── DOM refs ──
const board       = document.querySelector('.board');
const boardWrap   = document.querySelector('.board-wrap');
const scoreEl     = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const timeEl      = document.getElementById('time');
const startBtn    = document.getElementById('start-btn');
const restartBtn  = document.getElementById('restart-btn');
const modal       = document.getElementById('modal');
const modalTitle  = document.getElementById('modal-title');
const modalMsg    = document.getElementById('modal-msg');
const modalBtn    = document.getElementById('modal-btn');

// ── State ──
const blocks  = {};
let snake     = [];
let food      = {};
let dir       = 'down';
let lastDir   = 'down';
let gameLoop  = null;
let timerLoop = null;
let score     = 0;
let time      = 0;
let running   = false;

const FOOD_COLORS = ['#ff0044', '#00ffee', '#ffea00', '#b700ff', '#00ff11'];
let foodColor = FOOD_COLORS[0];

let highScore = Number(localStorage.getItem('snakeHighScore')) || 0;
highScoreEl.textContent = highScore;

// ── Dynamic cell size ──
// Recalculates how large each cell should be so the board fills as much of
// the available space as possible (constrained to a square).
function updateCellSize() {
  const wrapW = boardWrap.clientWidth  - 6;  // subtract border width
  const wrapH = boardWrap.clientHeight - 6;
  const maxSide = Math.min(wrapW, wrapH);
  // cell size must be a whole pixel so the grid aligns perfectly
  const cellPx = Math.floor(maxSide / COLS);
  document.documentElement.style.setProperty('--cell-size', cellPx + 'px');
}

// Run once immediately, then whenever the wrapper changes size
updateCellSize();
new ResizeObserver(updateCellSize).observe(boardWrap);

// ── Build grid ──
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const el = document.createElement('div');
    el.classList.add('block');
    blocks[`${r},${c}`] = el;
    board.appendChild(el);
  }
}

// ── Helpers ──
function cellAt(r, c) {
  return blocks[`${r},${c}`] || null;
}

function clearCell(r, c) {
  const el = cellAt(r, c);
  if (!el) return;
  el.classList.remove('snake-head', 'snake-body', 'food');
  el.style.backgroundColor = '';
}

function spawnFood() {
  const occupied = new Set(snake.map(s => `${s.r},${s.c}`));
  let r, c;
  do {
    r = Math.floor(Math.random() * ROWS);
    c = Math.floor(Math.random() * COLS);
  } while (occupied.has(`${r},${c}`));
  food = { r, c };
  foodColor = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
}

// ── Render ──
function render() {
  snake.forEach((seg, i) => {
    const el = cellAt(seg.r, seg.c);
    if (!el) return;
    el.classList.add(i === 0 ? 'snake-head' : 'snake-body');
  });
  const foodEl = cellAt(food.r, food.c);
  if (foodEl) {
    foodEl.classList.add('food');
    foodEl.style.backgroundColor = foodColor;
  }
}

// ── Setup / reset ──
function setupGame() {
  Object.values(blocks).forEach(el => {
    el.classList.remove('snake-head', 'snake-body', 'food');
    el.style.backgroundColor = '';
  });

  snake   = [{ r: 1, c: 5 }, { r: 0, c: 5 }];
  dir     = 'down';
  lastDir = 'down';
  score   = 0;
  time    = 0;
  scoreEl.textContent = 0;
  timeEl.textContent  = 0;

  spawnFood();
  render();
}

// ── Game tick ──
function tick() {
  snake.forEach(seg => clearCell(seg.r, seg.c));
  clearCell(food.r, food.c);

  lastDir = dir;

  let { r, c } = snake[0];
  if      (lastDir === 'up')    r--;
  else if (lastDir === 'down')  r++;
  else if (lastDir === 'left')  c--;
  else if (lastDir === 'right') c++;

  // Wall collision
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) { endGame(); return; }

  // Self collision (exclude tail — it vacates before head arrives)
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].r === r && snake[i].c === c) { endGame(); return; }
  }

  const newHead = { r, c };

  if (r === food.r && c === food.c) {
    snake.unshift(newHead);
    score += 10;
    scoreEl.textContent = score;
    spawnFood();
  } else {
    snake.unshift(newHead);
    snake.pop();
  }

  render();
}

// ── Timers ──
function startTimers() {
  gameLoop  = setInterval(tick, 150);
  timerLoop = setInterval(() => { time++; timeEl.textContent = time; }, 1000);
}

function stopTimers() {
  clearInterval(gameLoop);
  clearInterval(timerLoop);
  gameLoop = timerLoop = null;
}

// ── Game over ──
function endGame() {
  stopTimers();
  running = false;

  let title = 'Game Over';
  let msg   = `Score: ${score}  •  Time: ${time}s`;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snakeHighScore', highScore);
    highScoreEl.textContent = highScore;
    title = '🏆 New High Score!';
    msg   = `You scored ${score} in ${time}s`;
  }

  modalTitle.textContent = title;
  modalMsg.textContent   = msg;
  modal.classList.remove('hidden');
  startBtn.disabled   = false;
  restartBtn.disabled = true;
}

// ── Button handlers ──
startBtn.addEventListener('click', () => {
  if (running) return;
  running = true;
  modal.classList.add('hidden');
  startBtn.disabled   = true;
  restartBtn.disabled = false;
  setupGame();
  startTimers();
});

restartBtn.addEventListener('click', () => {
  stopTimers();
  running = true;
  modal.classList.add('hidden');
  setupGame();
  startTimers();
});

modalBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
  stopTimers();
  running = false;
  startBtn.disabled   = false;
  restartBtn.disabled = true;
  setupGame();
});

// ── Keyboard ──
document.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === 'ArrowUp'    && lastDir !== 'down')  dir = 'up';
  if (e.key === 'ArrowDown'  && lastDir !== 'up')    dir = 'down';
  if (e.key === 'ArrowLeft'  && lastDir !== 'right') dir = 'left';
  if (e.key === 'ArrowRight' && lastDir !== 'left')  dir = 'right';
});
