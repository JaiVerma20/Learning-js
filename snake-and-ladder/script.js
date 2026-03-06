/**
 * Snake & Ladder — script.js
 * Pure HTML/CSS/JS, no dependencies.
 */

/* ============================================================
   GAME DATA — Snakes and Ladders
   ============================================================ */

/** Snakes: key = head (top), value = tail (bottom) */
const SNAKES = {
  99: 54,
  95: 75,
  92: 73,
  83: 19,
  64: 36,
  48: 30,
  16: 6,
};

/** Ladders: key = bottom, value = top */
const LADDERS = {
  2:  38,
  7:  14,
  8:  31,
  15: 26,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  78: 98,
  87: 94,
};

/* ============================================================
   STATE
   ============================================================ */
const state = {
  players: [
    { name: 'Player 1', pos: 0, wins: 0 },
    { name: 'Player 2', pos: 0, wins: 0 },
  ],
  currentPlayer: 0,   // 0 or 1
  rolling: false,      // prevent double-clicks during animation
  gameOver: false,
};

/* ============================================================
   DOM REFS
   ============================================================ */
const startScreen     = document.getElementById('start-screen');
const gameScreen      = document.getElementById('game-screen');
const startBtn        = document.getElementById('start-btn');
const p1NameInput     = document.getElementById('p1-name');
const p2NameInput     = document.getElementById('p2-name');

const boardEl         = document.getElementById('board');
const boardSvg        = document.getElementById('board-svg');
const boardContainer  = document.querySelector('.board-container');

const tokenEls      = [
  document.getElementById('token-p1'),
  document.getElementById('token-p2'),
];

const diceEl        = document.getElementById('dice');
const pipGridEl     = document.getElementById('pip-grid');
const rollBtn       = document.getElementById('roll-btn');

const turnTokenEl   = document.getElementById('turn-token');
const turnLabelEl   = document.getElementById('turn-label');

const logList       = document.getElementById('log-list');

const sbNames       = [document.getElementById('sb-p1-name'), document.getElementById('sb-p2-name')];
const sbWins        = [document.getElementById('sb-p1-wins'), document.getElementById('sb-p2-wins')];

const victoryOverlay = document.getElementById('victory-overlay');
const victoryTitle   = document.getElementById('victory-title');
const victoryMsg     = document.getElementById('victory-msg');
const confettiCont   = document.getElementById('confetti-container');
const playAgainBtn   = document.getElementById('play-again-btn');
const resetBtn       = document.getElementById('reset-btn');

/* ============================================================
   BOARD SETUP
   ============================================================ */

/**
 * Convert square number (1-100) to {row, col} in the visual grid.
 * Row 0 = top of board (squares 91-100), row 9 = bottom (squares 1-10).
 * Even logical rows (from bottom) go left-to-right; odd go right-to-left.
 */
function squareToGrid(sq) {
  const idx  = sq - 1;           // 0-based
  const row  = Math.floor(idx / 10); // 0=bottom, 9=top logically
  const col  = idx % 10;
  const visualRow = 9 - row;     // flip: row 0 in DOM = top
  const visualCol = (row % 2 === 0) ? col : 9 - col; // zigzag
  return { row: visualRow, col: visualCol };
}

/**
 * Get the pixel centre of a board cell (relative to board-container).
 */
function cellCentre(sq) {
  const { row, col } = squareToGrid(sq);
  const boardRect     = boardEl.getBoundingClientRect();
  const containerRect = boardContainer.getBoundingClientRect();
  const cellW = boardRect.width  / 10;
  const cellH = boardRect.height / 10;
  return {
    x: boardRect.left - containerRect.left + col * cellW + cellW / 2,
    y: boardRect.top  - containerRect.top  + row * cellH + cellH / 2,
  };
}

/** Build the 100-cell board */
function buildBoard() {
  boardEl.innerHTML = '';
  for (let sq = 100; sq >= 1; sq--) {
    const { row, col } = squareToGrid(sq);

    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.sq = sq;

    // Checkerboard colouring
    cell.classList.add((row + col) % 2 === 0 ? 'dark' : 'light');

    // Snake / ladder highlight
    if (SNAKES[sq] !== undefined) cell.classList.add('has-snake');
    if (LADDERS[sq] !== undefined) cell.classList.add('has-ladder');

    // Icon
    const icon = document.createElement('div');
    icon.className = 'cell-icon';
    if (SNAKES[sq]  !== undefined) icon.textContent = '🐍';
    else if (LADDERS[sq] !== undefined) icon.textContent = '🪜';
    cell.appendChild(icon);

    // Number
    const num = document.createElement('div');
    num.className = 'cell-num';
    num.textContent = sq;
    cell.appendChild(num);

    // Place in grid using CSS grid-area by visual position
    cell.style.gridRow    = `${row + 1}`;
    cell.style.gridColumn = `${col + 1}`;

    boardEl.appendChild(cell);
  }

  // Draw SVG snakes and ladders after board is in DOM
  requestAnimationFrame(() => drawSVGElements());
}

/* ============================================================
   SVG SNAKES & LADDERS
   ============================================================ */

function drawSVGElements() {
  boardSvg.innerHTML = '';

  const defs = createSVGEl('defs');

  // ---- Snake gradient defs ----
  Object.entries(SNAKES).forEach(([head, tail], i) => {
    const grad = createSVGEl('linearGradient');
    grad.setAttribute('id', `snakeGrad${i}`);
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '0%'); grad.setAttribute('y2', '100%');
    addStop(grad, '0%',   '#ff4b4b');
    addStop(grad, '50%',  '#ff8c00');
    addStop(grad, '100%', '#c0392b');
    defs.appendChild(grad);
  });

  // ---- Ladder gradient defs ----
  Object.entries(LADDERS).forEach(([bottom, top], i) => {
    const grad = createSVGEl('linearGradient');
    grad.setAttribute('id', `ladderGrad${i}`);
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '100%');
    grad.setAttribute('x2', '0%'); grad.setAttribute('y2', '0%');
    addStop(grad, '0%',   '#f9c74f');
    addStop(grad, '50%',  '#f4a261');
    addStop(grad, '100%', '#e9c46a');
    defs.appendChild(grad);
  });

  boardSvg.appendChild(defs);

  // ---- Draw ladders (behind snakes) ----
  Object.entries(LADDERS).forEach(([bottom, top], i) => {
    drawLadder(Number(bottom), Number(top), `ladderGrad${i}`);
  });

  // ---- Draw snakes (on top) ----
  Object.entries(SNAKES).forEach(([head, tail], i) => {
    drawSnake(Number(head), Number(tail), `snakeGrad${i}`);
  });
}

function createSVGEl(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function addStop(grad, offset, color) {
  const stop = createSVGEl('stop');
  stop.setAttribute('offset', offset);
  stop.setAttribute('stop-color', color);
  grad.appendChild(stop);
}

/**
 * Draw a snake using a cubic bezier path with a triangular head.
 */
function drawSnake(head, tail, gradId) {
  const hc = cellCentre(head);
  const tc = cellCentre(tail);

  // Control points for a wavy curve
  const dx = hc.x - tc.x;
  const dy = hc.y - tc.y;
  const cx1 = tc.x + dy * 0.5;
  const cy1 = tc.y - dx * 0.1;
  const cx2 = hc.x - dy * 0.5;
  const cy2 = hc.y + dx * 0.1;

  // Body path
  const path = createSVGEl('path');
  path.setAttribute('d', `M ${tc.x} ${tc.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${hc.x} ${hc.y}`);
  path.setAttribute('stroke', `url(#${gradId})`);
  path.setAttribute('stroke-width', '7');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('opacity', '0.88');
  boardSvg.appendChild(path);

  // Head circle
  const headCircle = createSVGEl('circle');
  headCircle.setAttribute('cx', hc.x);
  headCircle.setAttribute('cy', hc.y);
  headCircle.setAttribute('r', '9');
  headCircle.setAttribute('fill', '#ff4b4b');
  headCircle.setAttribute('stroke', '#fff');
  headCircle.setAttribute('stroke-width', '2');
  boardSvg.appendChild(headCircle);

  // Eyes
  const eyeOffsets = [[-3, -3], [3, -3]];
  eyeOffsets.forEach(([ox, oy]) => {
    const eye = createSVGEl('circle');
    eye.setAttribute('cx', hc.x + ox);
    eye.setAttribute('cy', hc.y + oy);
    eye.setAttribute('r', '2');
    eye.setAttribute('fill', '#fff');
    boardSvg.appendChild(eye);
    const pupil = createSVGEl('circle');
    pupil.setAttribute('cx', hc.x + ox);
    pupil.setAttribute('cy', hc.y + oy);
    pupil.setAttribute('r', '1');
    pupil.setAttribute('fill', '#111');
    boardSvg.appendChild(pupil);
  });

  // Tail circle
  const tailCircle = createSVGEl('circle');
  tailCircle.setAttribute('cx', tc.x);
  tailCircle.setAttribute('cy', tc.y);
  tailCircle.setAttribute('r', '4');
  tailCircle.setAttribute('fill', '#c0392b');
  boardSvg.appendChild(tailCircle);
}

/**
 * Draw a ladder using two rails and several rungs.
 */
function drawLadder(bottom, top, gradId) {
  const bc = cellCentre(bottom);
  const tc = cellCentre(top);

  const OFFSET = 5; // rail separation half-width
  const dx = tc.x - bc.x;
  const dy = tc.y - bc.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len; // perpendicular
  const ny =  dx / len;

  // Left rail
  const leftRail = createSVGEl('line');
  leftRail.setAttribute('x1', bc.x + nx * OFFSET); leftRail.setAttribute('y1', bc.y + ny * OFFSET);
  leftRail.setAttribute('x2', tc.x + nx * OFFSET); leftRail.setAttribute('y2', tc.y + ny * OFFSET);
  leftRail.setAttribute('stroke', `url(#${gradId})`);
  leftRail.setAttribute('stroke-width', '4');
  leftRail.setAttribute('stroke-linecap', 'round');
  leftRail.setAttribute('opacity', '0.92');
  boardSvg.appendChild(leftRail);

  // Right rail
  const rightRail = createSVGEl('line');
  rightRail.setAttribute('x1', bc.x - nx * OFFSET); rightRail.setAttribute('y1', bc.y - ny * OFFSET);
  rightRail.setAttribute('x2', tc.x - nx * OFFSET); rightRail.setAttribute('y2', tc.y - ny * OFFSET);
  rightRail.setAttribute('stroke', `url(#${gradId})`);
  rightRail.setAttribute('stroke-width', '4');
  rightRail.setAttribute('stroke-linecap', 'round');
  rightRail.setAttribute('opacity', '0.92');
  boardSvg.appendChild(rightRail);

  // Rungs
  const numRungs = Math.max(3, Math.round(len / 42));
  for (let i = 1; i <= numRungs; i++) {
    const t = i / (numRungs + 1);
    const rx = bc.x + dx * t;
    const ry = bc.y + dy * t;
    const rung = createSVGEl('line');
    rung.setAttribute('x1', rx + nx * OFFSET * 1.3); rung.setAttribute('y1', ry + ny * OFFSET * 1.3);
    rung.setAttribute('x2', rx - nx * OFFSET * 1.3); rung.setAttribute('y2', ry - ny * OFFSET * 1.3);
    rung.setAttribute('stroke', '#fde68a');
    rung.setAttribute('stroke-width', '3');
    rung.setAttribute('stroke-linecap', 'round');
    rung.setAttribute('opacity', '0.85');
    boardSvg.appendChild(rung);
  }
}

/* ============================================================
   TOKEN POSITIONING
   ============================================================ */

function placeToken(playerIdx, sq) {
  const token = tokenEls[playerIdx];
  if (sq === 0) {
    token.classList.add('off-board');
    return;
  }
  token.classList.remove('off-board');

  const cc = cellCentre(sq);
  const tokenHalf = token.offsetWidth / 2;

  // Offset two tokens if on same square
  const other = state.players[1 - playerIdx];
  const sameSquare = other.pos === sq;

  const offset = sameSquare
    ? (playerIdx === 0 ? -tokenHalf * 0.6 : tokenHalf * 0.6)
    : 0;

  token.style.left = `${cc.x - tokenHalf + offset}px`;
  token.style.top  = `${cc.y - tokenHalf}px`;
}

function updateTokens() {
  state.players.forEach((p, i) => placeToken(i, p.pos));
  // active glow
  tokenEls.forEach((t, i) => {
    t.classList.toggle('active-token', i === state.currentPlayer && !state.gameOver);
  });
}

/* ============================================================
   DICE
   ============================================================ */

/** Pip layout per face value (1-6). Each string = grid-area name. */
const PIP_LAYOUTS = {
  1: [['m']],
  2: [['tl'], ['br']],
  3: [['tl'], ['m'], ['br']],
  4: [['tl','tr'], ['bl','br']],
  5: [['tl','tr'], ['m'], ['bl','br']],
  6: [['tl','tr'], ['ml','mr'], ['bl','br']],
};

const GRID_AREAS = {
  tl: 'tl', tr: 'tr', ml: 'ml', m: 'm', mr: 'mr', bl: 'bl', br: 'br',
};

function renderDiceFace(value) {
  pipGridEl.innerHTML = '';
  const layout = PIP_LAYOUTS[value];
  layout.forEach(row => {
    row.forEach(areaName => {
      const pip = document.createElement('div');
      pip.className = 'pip';
      pip.style.gridArea = areaName;
      pipGridEl.appendChild(pip);
    });
  });
}

function rollDiceAnimation(finalValue) {
  return new Promise(resolve => {
    diceEl.classList.add('rolling');
    let ticks = 0;
    const maxTicks = 8;
    const interval = setInterval(() => {
      renderDiceFace(Math.floor(Math.random() * 6) + 1);
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        diceEl.classList.remove('rolling');
        renderDiceFace(finalValue);
        resolve();
      }
    }, 70);
  });
}

/* ============================================================
   AUDIO (Web Audio API)
   ============================================================ */

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new AudioCtx(); } catch (e) { return null; }
  }
  return audioCtx;
}

function playTone(freq, type, duration, gainVal = 0.25, delay = 0) {
  const ctx = getAudio();
  if (!ctx) return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(gainVal, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

function soundDiceRoll() {
  for (let i = 0; i < 6; i++) {
    playTone(200 + Math.random() * 200, 'square', 0.05, 0.08, i * 0.06);
  }
}

function soundMove() {
  playTone(440, 'sine', 0.12, 0.15);
}

function soundSnake() {
  playTone(180, 'sawtooth', 0.4, 0.2);
  playTone(140, 'sawtooth', 0.4, 0.18, 0.15);
}

function soundLadder() {
  [523, 659, 784].forEach((f, i) => playTone(f, 'sine', 0.2, 0.2, i * 0.1));
}

function soundWin() {
  [523, 659, 784, 1047].forEach((f, i) => {
    playTone(f, 'sine', 0.35, 0.25, i * 0.12);
    playTone(f * 1.5, 'sine', 0.25, 0.12, i * 0.12 + 0.06);
  });
}

/* ============================================================
   MOVE LOG
   ============================================================ */

function addLog(message, type = '') {
  const li = document.createElement('li');
  if (type) li.classList.add(`log-${type}`);
  li.textContent = message;
  logList.prepend(li);
  // Keep log at max 40 entries
  while (logList.children.length > 40) {
    logList.removeChild(logList.lastChild);
  }
}

/* ============================================================
   TURN INDICATOR UI
   ============================================================ */

function updateTurnUI() {
  const cp = state.players[state.currentPlayer];
  turnLabelEl.textContent = `${cp.name}'s Turn`;
  turnTokenEl.className = `token ${state.currentPlayer === 0 ? 'p1-token' : 'p2-token'}`;
  turnTokenEl.style.width = '16px';
  turnTokenEl.style.height = '16px';
  turnTokenEl.style.animation = 'tokenPulse 1.2s ease-in-out infinite';
}

/* ============================================================
   TOKEN ANIMATION (step by step)
   ============================================================ */

/**
 * Animate a token moving step-by-step from its current pos to targetSq.
 */
async function animateTokenMove(playerIdx, fromSq, toSq) {
  const step = fromSq < toSq ? 1 : -1;
  let cur = fromSq;
  while (cur !== toSq) {
    cur += step;
    state.players[playerIdx].pos = cur;
    placeToken(playerIdx, cur);
    soundMove();
    await sleep(110);
  }
}

/**
 * Animate token jumping directly (snake slide or ladder climb).
 */
async function animateTokenJump(playerIdx, toSq, delay = 320) {
  await sleep(delay);
  state.players[playerIdx].pos = toSq;
  placeToken(playerIdx, toSq);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ============================================================
   CORE GAME LOGIC
   ============================================================ */

async function takeTurn() {
  if (state.rolling || state.gameOver) return;
  state.rolling = true;
  rollBtn.disabled = true;

  // Roll
  const roll = Math.floor(Math.random() * 6) + 1;
  soundDiceRoll();
  await rollDiceAnimation(roll);

  const cp = state.currentPlayer;
  const player = state.players[cp];
  const prevPos = player.pos;
  let newPos = prevPos + roll;

  addLog(`${player.name} rolled a ${roll}  (${prevPos === 0 ? 'start' : prevPos} → ${Math.min(newPos, 100)})`);

  // Overshoot — stay
  if (newPos > 100) {
    addLog(`${player.name} needs ${100 - prevPos} to win — stays at ${prevPos}.`);
    newPos = prevPos;
  }

  // Animate movement
  if (newPos !== prevPos) {
    await animateTokenMove(cp, prevPos, newPos);
  }

  // Snake check
  if (SNAKES[newPos] !== undefined) {
    const snakeTail = SNAKES[newPos];
    soundSnake();
    addLog(`🐍 Oh no! ${player.name} hit a snake at ${newPos} → slides to ${snakeTail}`, 'snake');
    await animateTokenJump(cp, snakeTail, 350);
    newPos = snakeTail;
  }
  // Ladder check
  else if (LADDERS[newPos] !== undefined) {
    const ladderTop = LADDERS[newPos];
    soundLadder();
    addLog(`🪜 Woohoo! ${player.name} climbed a ladder at ${newPos} → rises to ${ladderTop}`, 'ladder');
    await animateTokenJump(cp, ladderTop, 350);
    newPos = ladderTop;
  }

  state.players[cp].pos = newPos;
  updateTokens();

  // Win check
  if (newPos === 100) {
    state.gameOver = true;
    state.players[cp].wins++;
    updateScoreboard();
    addLog(`🏆 ${player.name} wins the game!`, 'win');
    soundWin();
    await sleep(400);
    showVictory(player.name);
    state.rolling = false;
    return;
  }

  // Switch player
  state.currentPlayer = 1 - cp;
  updateTurnUI();
  updateTokens();

  state.rolling = false;
  rollBtn.disabled = false;
}

/* ============================================================
   SCOREBOARD
   ============================================================ */

function updateScoreboard() {
  state.players.forEach((p, i) => {
    sbNames[i].textContent = p.name;
    sbWins[i].textContent  = p.wins;
  });
}

/* ============================================================
   VICTORY
   ============================================================ */

function showVictory(name) {
  victoryTitle.textContent = '🎉 ' + name + ' Wins!';
  victoryMsg.textContent   = `Congratulations, ${name}! You reached square 100!`;
  confettiCont.innerHTML   = '';
  spawnConfetti();
  victoryOverlay.classList.remove('hidden');
}

function spawnConfetti() {
  const colours = ['#ef233c','#4361ee','#f9c74f','#00f5a0','#ff6b35','#a663cc','#4cc9f0'];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colours[Math.floor(Math.random() * colours.length)];
    piece.style.width  = `${6 + Math.random() * 8}px`;
    piece.style.height = `${6 + Math.random() * 8}px`;
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    const dur = 1.2 + Math.random() * 1.6;
    piece.style.animationDuration  = `${dur}s`;
    piece.style.animationDelay     = `${Math.random() * 0.8}s`;
    confettiCont.appendChild(piece);
  }
}

/* ============================================================
   RESET / NEW ROUND
   ============================================================ */

function resetRound() {
  state.players.forEach(p => { p.pos = 0; });
  state.currentPlayer = 0;
  state.rolling  = false;
  state.gameOver = false;

  victoryOverlay.classList.add('hidden');
  logList.innerHTML = '';

  renderDiceFace(1);
  updateTurnUI();
  updateTokens();
  rollBtn.disabled = false;
  addLog('🎮 New round started!');
}

function resetGame() {
  state.players.forEach(p => { p.wins = 0; });
  updateScoreboard();
  resetRound();
}

/* ============================================================
   START / INIT
   ============================================================ */

function startGame() {
  const name1 = p1NameInput.value.trim() || 'Player 1';
  const name2 = p2NameInput.value.trim() || 'Player 2';
  state.players[0].name = name1;
  state.players[1].name = name2;
  state.players[0].wins = 0;
  state.players[1].wins = 0;

  startScreen.classList.remove('active');
  gameScreen.classList.add('active');

  buildBoard();
  resetRound();
  updateScoreboard();
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

startBtn.addEventListener('click', startGame);

p1NameInput.addEventListener('keydown', e => { if (e.key === 'Enter') p2NameInput.focus(); });
p2NameInput.addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });

rollBtn.addEventListener('click', takeTurn);

resetBtn.addEventListener('click', () => {
  resetGame();
});

playAgainBtn.addEventListener('click', () => {
  resetRound();
});

/* Initialise dice display on load */
renderDiceFace(1);

/* Redraw SVG + tokens on window resize (debounced, registered once) */
let _resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    requestAnimationFrame(() => {
      drawSVGElements();
      updateTokens();
    });
  }, 120);
});
