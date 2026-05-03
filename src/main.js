import { CONFIG, GAME_STATE } from './config.js';
import { Blocks } from './blocks.js';
import { Ball } from './ball.js';
import { Paddle } from './paddle.js';
import { Items, ITEM_DESCRIPTIONS, DEBUFF_ITEMS } from './items.js';
import { Effects } from './effects.js';
import { Audio } from './audio.js';
import { Projectiles } from './projectiles.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// HiDPI (Retina) 対応
const dpr = window.devicePixelRatio || 1;
canvas.width = CONFIG.CANVAS_W * dpr;
canvas.height = CONFIG.CANVAS_H * dpr;
canvas.style.width = CONFIG.CANVAS_W + 'px';
canvas.style.height = CONFIG.CANVAS_H + 'px';
ctx.scale(dpr, dpr);

const blocks = new Blocks();
let balls = [];
const paddle = new Paddle();
const items = new Items();
const effects = new Effects();
const audio = new Audio();
const projectiles = new Projectiles();

let lastTime = 0;
let fps = 0;
let attractTimer = 0; // タイトル画面のループ用タイマー

// 入力状態
const input = { left: false, right: false, mouseX: null, space: false, click: false };

// ゲーム状態
let currentState = GAME_STATE.TITLE;
let lives = CONFIG.INITIAL_LIVES;
let score = 0;
let nextExtendScore = CONFIG.EXTEND_SCORE;
let yieldTimer = 0; // スコア2倍タイマー
const stateObj = { combo: 0 };

window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
  if (e.code === 'Space') {
    input.space = true;
    audio.init();
    if (currentState === GAME_STATE.TITLE) {
      resetGame(GAME_STATE.PLAYING);
      balls = [new Ball()];
      balls[0].spawn(paddle.x, paddle.y, paddle.w);
    } else if (currentState === GAME_STATE.READY) {
      currentState = GAME_STATE.PLAYING;
      balls = [new Ball()];
      balls[0].spawn(paddle.x, paddle.y, paddle.w);
    } else if (currentState === GAME_STATE.CLEAR) {
      resetGame(GAME_STATE.TITLE);
    }
  }
  if (e.code === 'Escape') {
    if (currentState === GAME_STATE.PLAYING) {
      currentState = GAME_STATE.PAUSE;
    } else if (currentState === GAME_STATE.PAUSE) {
      currentState = GAME_STATE.PLAYING; // RESUME via ESC
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
  if (e.code === 'Space') input.space = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width / dpr;
  const scaleY = canvas.height / rect.height / dpr;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  input.mouseX = x;
  input.mouseY = y;
});

// PAUSE画面のクリック領域定義
const PAUSE_MENU = {
  resume: { x: CONFIG.CANVAS_W / 2 - 80, y: CONFIG.CANVAS_H / 2 - 20, w: 160, h: 40 },
  quit: { x: CONFIG.CANVAS_W / 2 - 80, y: CONFIG.CANVAS_H / 2 + 40, w: 160, h: 40 }
};

// UI表示用PAUSEボタンの領域
const UI_PAUSE_BTN = { x: CONFIG.CANVAS_W / 2 - 30, y: 5, w: 60, h: 20 };

// GAMEOVERメニューのクリック領域定義
const GAMEOVER_MENU = {
  continue: { x: CONFIG.CANVAS_W / 2 - 80, y: CONFIG.CANVAS_H / 2 + 20, w: 160, h: 40 },
  quit: { x: CONFIG.CANVAS_W / 2 - 80, y: CONFIG.CANVAS_H / 2 + 80, w: 160, h: 40 }
};

function handleInputPress(x, y) {
  audio.init();
  input.click = true;
  
  if (currentState === GAME_STATE.TITLE) {
    resetGame(GAME_STATE.PLAYING);
    balls = [new Ball()];
    balls[0].spawn(paddle.x, paddle.y, paddle.w);
  } else if (currentState === GAME_STATE.READY) {
    currentState = GAME_STATE.PLAYING;
    balls = [new Ball()];
    balls[0].spawn(paddle.x, paddle.y, paddle.w);
  } else if (currentState === GAME_STATE.GAMEOVER) {
    if (x > GAMEOVER_MENU.continue.x && x < GAMEOVER_MENU.continue.x + GAMEOVER_MENU.continue.w &&
        y > GAMEOVER_MENU.continue.y && y < GAMEOVER_MENU.continue.y + GAMEOVER_MENU.continue.h) {
      resetGame(GAME_STATE.PLAYING);
      balls = [new Ball()];
      balls[0].spawn(paddle.x, paddle.y, paddle.w);
    } else if (x > GAMEOVER_MENU.quit.x && x < GAMEOVER_MENU.quit.x + GAMEOVER_MENU.quit.w &&
               y > GAMEOVER_MENU.quit.y && y < GAMEOVER_MENU.quit.y + GAMEOVER_MENU.quit.h) {
      resetGame(GAME_STATE.TITLE);
    }
  } else if (currentState === GAME_STATE.CLEAR) {
    resetGame(GAME_STATE.TITLE);
  } else if (currentState === GAME_STATE.PLAYING) {
    // 上部のPAUSEボタンクリック判定
    if (x > UI_PAUSE_BTN.x && x < UI_PAUSE_BTN.x + UI_PAUSE_BTN.w &&
        y > UI_PAUSE_BTN.y && y < UI_PAUSE_BTN.y + UI_PAUSE_BTN.h) {
      currentState = GAME_STATE.PAUSE;
      input.click = false; // ボタン押しによる発射を防ぐ
    }
  } else if (currentState === GAME_STATE.PAUSE) {
    if (x > PAUSE_MENU.resume.x && x < PAUSE_MENU.resume.x + PAUSE_MENU.resume.w &&
        y > PAUSE_MENU.resume.y && y < PAUSE_MENU.resume.y + PAUSE_MENU.resume.h) {
      currentState = GAME_STATE.PLAYING;
    } else if (x > PAUSE_MENU.quit.x && x < PAUSE_MENU.quit.x + PAUSE_MENU.quit.w &&
               y > PAUSE_MENU.quit.y && y < PAUSE_MENU.quit.y + PAUSE_MENU.quit.h) {
      resetGame(GAME_STATE.TITLE);
    }
  }
}

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width / dpr;
  const scaleY = canvas.height / rect.height / dpr;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  handleInputPress(x, y);
});

// Touch Events
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); // 画面スクロール防止
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width / dpr;
  const scaleY = canvas.height / rect.height / dpr;
  const touch = e.touches[0];
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;
  input.mouseX = x;
  input.mouseY = y;
  handleInputPress(x, y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width / dpr;
  const scaleY = canvas.height / rect.height / dpr;
  const touch = e.touches[0];
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;
  input.mouseX = x;
  input.mouseY = y;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  input.click = false;
}, { passive: false });

// 画面外クリック（フォーカス外れ）でPAUSE
window.addEventListener('blur', () => {
  if (currentState === GAME_STATE.PLAYING) {
    currentState = GAME_STATE.PAUSE;
  }
});

// Canvas外をクリックした場合もPAUSE
window.addEventListener('mousedown', (e) => {
  if (e.target !== canvas && currentState === GAME_STATE.PLAYING) {
    currentState = GAME_STATE.PAUSE;
  }
});

window.addEventListener('mouseup', () => {
  input.click = false;
});

function resetGame(toState = GAME_STATE.TITLE) {
  blocks.initBlocks();
  lives = CONFIG.INITIAL_LIVES;
  score = 0;
  nextExtendScore = CONFIG.EXTEND_SCORE;
  yieldTimer = 0;
  stateObj.combo = 0;
  balls = [];
  currentState = toState;
  paddle.reset();
  items.reset();
  projectiles.reset();
  effects.reset();
}

function update(dt) {
  if (currentState === GAME_STATE.TITLE) {
    attractTimer += dt;
  } else {
    attractTimer = 0;
  }

  paddle.update(input, dt);
  
  if (currentState === GAME_STATE.PLAYING) {
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const ballResult = b.update(dt, blocks, paddle, audio, stateObj, effects, items, input);
      if (ballResult === -1) {
        // ミス（画面下へ落下）
        balls.splice(i, 1);
      } else {
        let gainedScore = ballResult;
        if (yieldTimer > 0) gainedScore *= 2;
        score += gainedScore;
        
        // エクステンド（1UP）チェック
        if (score >= nextExtendScore) {
          lives++;
          nextExtendScore += CONFIG.EXTEND_SCORE;
          audio.playHeal();
        }
      }
    }
    
    // すべてのボールが落下したか判定
    if (balls.length === 0) {
      lives--;
      items.reset();
      projectiles.reset();
      effects.reset();
      paddle.reset();
      if (lives > 0) {
        currentState = GAME_STATE.READY;
      } else {
        currentState = GAME_STATE.GAMEOVER;
      }
    }

    // クリア判定（ブロックが全てなくなったか）
    if (blocks.remainingBlocks <= 0) {
      currentState = GAME_STATE.CLEAR;
      balls = [];
      items.reset();
      projectiles.reset();
      effects.reset();
      paddle.reset();
    }
  }
  
  // PLAYING以外でもアイテム・エフェクトの更新は止める（PAUSE中など）
  if (currentState === GAME_STATE.PLAYING) {
    const caughtItems = items.update(dt, paddle);
    
    // アイテム効果の適用
    if (caughtItems && caughtItems.length > 0) {
      for (const letter of caughtItems) {
        applyItemEffect(letter);
      }
    }
    
    effects.update(dt);
    
    const projScore = { val: 0 };
    projectiles.update(dt, blocks, effects, projScore, audio, items);
    if (projScore.val > 0) {
      let gained = projScore.val;
      if (yieldTimer > 0) gained *= 2;
      score += gained;
      if (score >= nextExtendScore) {
        lives++;
        nextExtendScore += CONFIG.EXTEND_SCORE;
        audio.playHeal();
      }
    }
    
    // Laser auto-fire logic
    if (paddle.laserTimer > 0) {
      paddle.laserTimer -= dt;
      paddle.laserFireTimer -= dt;
      if (paddle.laserFireTimer <= 0) {
        projectiles.spawnLaser(paddle.x, paddle.y);
        projectiles.spawnLaser(paddle.x + paddle.w, paddle.y);
        paddle.laserFireTimer = 0.5; // Every 0.5 sec
      }
    }
  }
}

function applyItemEffect(letter) {
  items.acquireItem(letter, ['B','H','N','Q','Z'].includes(letter) ? 0 : CONFIG.ITEM_DURATION);
  audio.playItemCatch();
  
  switch (letter) {
    case 'A': // Aim: 予測線
      for (const b of balls) b.aimTimer = CONFIG.ITEM_DURATION;
      break;
    case 'B': // Bomb: パドルの真上のブロックを円形に爆発
      audio.playExplosion();
      blocks.hitRadius(paddle.x + paddle.w / 2, paddle.y - 100, 50, (bx, by, bData) => {
        effects.spawn(bx, by, bData.color);
        score += (yieldTimer > 0 ? bData.score * 2 : bData.score);
      });
      break;
    case 'C': // Catch: キャッチ
      for (const b of balls) b.catchTimer = CONFIG.ITEM_DURATION;
      break;
    case 'D': // Double: ボールが分裂
      const newBalls = [];
      for (const b of balls) {
        const nb = new Ball();
        nb.x = b.x;
        nb.y = b.y;
        nb.vx = -b.vx + (Math.random() - 0.5) * 100; // X方向の速度を少し変えて反転
        nb.vy = b.vy;
        nb.active = true;
        // パワー状態なども引き継ぐ
        nb.power = b.power;
        nb.powerTimer = b.powerTimer;
        nb.slowTimer = b.slowTimer;
        newBalls.push(nb);
        // 重くなりすぎないように最大50個でストップ
        if (balls.length + newBalls.length >= 50) break;
      }
      balls.push(...newBalls);
      if (balls.length > 50) balls.length = 50; // 上限を50個に制限
      break;
    case 'E': // Expand: パドルが伸びる
      paddle.expandTimer = CONFIG.ITEM_DURATION;
      break;
    case 'F': // Fire: 無限貫通
      for (const b of balls) b.fireTimer = CONFIG.ITEM_DURATION;
      break;
    case 'G': // Gravity: ブロックが落ちてくるデバフ
      audio.playDebuff();
      blocks.gravityTimer = CONFIG.ITEM_DURATION;
      break;
    case 'H': // Heal: 1UP
      lives++;
      audio.playHeal();
      break;
    case 'I': // Invisible: 点滅デバフ
      audio.playDebuff();
      for (const b of balls) b.invisibleTimer = CONFIG.ITEM_DURATION;
      break;
    case 'J': // Jump: パドルのY軸移動
      paddle.jumpTimer = CONFIG.ITEM_DURATION;
      break;
    case 'K': // Killer: 常時3xパワー
      paddle.killerTimer = CONFIG.ITEM_DURATION;
      break;
    case 'L': // Laser: パドルからレーザー発射
      paddle.laserTimer = CONFIG.ITEM_DURATION;
      paddle.laserFireTimer = 0;
      break;
    case 'M': // Magnet: 吸い寄せ
      paddle.magnetTimer = CONFIG.ITEM_DURATION;
      break;
    case 'N': // Normal: 全状態異常リセット
      paddle.expandTimer = 0;
      paddle.reverseTimer = 0;
      paddle.laserTimer = 0;
      paddle.jumpTimer = 0;
      paddle.killerTimer = 0;
      paddle.magnetTimer = 0;
      paddle.twinTimer = 0;
      projectiles.clearObstacles();
      blocks.gravityTimer = 0;
      blocks.xrayTimer = 0;
      for (const b of balls) {
        b.slowTimer = 0;
        b.powerTimer = 0;
        b.fireTimer = 0;
        b.invisibleTimer = 0;
        b.vortexTimer = 0;
        b.warpTimer = 0;
        b.aimTimer = 0;
        b.catchTimer = 0;
      }
      yieldTimer = 0;
      break;
    case 'O': // Obstacle: 障害物
      audio.playDebuff();
      projectiles.spawnObstacle();
      break;
    case 'Q': // Quake: ランダムに10個破壊
      audio.playExplosion();
      blocks.hitRandom(10, (bx, by, bData) => {
        effects.spawn(bx, by, bData.color);
        score += (yieldTimer > 0 ? bData.score * 2 : bData.score);
      });
      break;
    case 'R': // Reverse: 操作反転
      audio.playDebuff();
      paddle.reverseTimer = CONFIG.ITEM_DURATION;
      break;
    case 'S': // Slow: ボール速度半減
      for (const b of balls) {
        b.slowTimer = CONFIG.ITEM_DURATION;
      }
      break;
    case 'T': // Twin: パドル分裂
      paddle.twinTimer = CONFIG.ITEM_DURATION;
      break;
    case 'U': // UFO: 上部からビーム
      projectiles.spawnUFO();
      break;
    case 'V': // Vortex: ボールがブラックホール化
      for (const b of balls) b.vortexTimer = CONFIG.ITEM_DURATION;
      break;
    case 'W': // Warp: 壁ループ
      for (const b of balls) b.warpTimer = CONFIG.ITEM_DURATION;
      break;
    case 'X': // Xtend: ボール10個追加
      audio.playHeal();
      const xtendBalls = [];
      const baseBall = balls.length > 0 ? balls[0] : null;
      const spawnX = baseBall ? baseBall.x : paddle.x + paddle.w / 2;
      const spawnY = baseBall ? baseBall.y : paddle.y - CONFIG.BALL_SIZE;
      
      for (let i = 0; i < 10; i++) {
        const nb = new Ball();
        nb.x = spawnX;
        nb.y = spawnY;
        nb.vx = (Math.random() - 0.5) * 400; // ランダムに散らす
        nb.vy = -200 - Math.random() * 100;  // 上方向に打ち出す
        nb.active = true;
        if (baseBall) {
          nb.power = baseBall.power;
          nb.powerTimer = baseBall.powerTimer;
          nb.slowTimer = baseBall.slowTimer;
        }
        xtendBalls.push(nb);
        // 最大50個でストップ
        if (balls.length + xtendBalls.length >= 50) break;
      }
      balls.push(...xtendBalls);
      if (balls.length > 50) balls.length = 50; // 上限を50個に制限
      break;
    case 'Y': // Yield: スコア2倍
      yieldTimer = CONFIG.ITEM_DURATION;
      break;
    case 'Z': // Zap: ランダム1列破壊
      audio.playElectric();
      const randomCol = Math.floor(Math.random() * CONFIG.BLOCK_COLS);
      blocks.hitColumn(randomCol, (bx, by, bData) => {
        effects.spawn(bx, by, bData.color);
        score += (yieldTimer > 0 ? bData.score * 2 : bData.score);
      });
      break;
    case 'P': // Power: ボール巨大化
      for (const b of balls) {
        b.powerTimer = CONFIG.ITEM_DURATION;
      }
      break;
  }
}

function render() {
  ctx.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

  blocks.render(ctx);
  for (const b of balls) {
    b.render(ctx);
  }
  paddle.render(ctx);
  projectiles.render(ctx);
  items.render(ctx);
  effects.render(ctx);

  if (currentState === GAME_STATE.TITLE) {
    // ブロックで文字が潰れないように暗い背景を敷く
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    // 4秒ごとに画面を切り替え: 0=ロゴ, 1=EXTEND, 2〜10=アイテム説明
    const cycle = Math.floor(attractTimer / 4) % 11;
    
    ctx.textAlign = 'center';
    
    // ロゴ画面
    if (cycle === 0) {
      ctx.font = '40px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#f0f';
      ctx.fillText('MEGA BLOCK', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 - 40);
      ctx.fillStyle = '#0ff';
      ctx.fillText('BREAKER', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 + 20);
    } 
    // EXTEND説明画面
    else if (cycle === 1) {
      ctx.font = '24px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#0f0';
      ctx.fillText('EXTEND AT', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 - 20);
      ctx.fillText('1000 PTS', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 + 20);
    } 
    // アイテム図鑑画面（3つずつ表示）
    else {
      const itemScreen = cycle - 2; // 0 to 8
      ctx.font = '20px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#ff0';
      ctx.fillText('- ITEM ENCYCLOPEDIA -', CONFIG.CANVAS_W / 2, 100);
      
      ctx.font = '12px "Press Start 2P", sans-serif';
      ctx.fillStyle = '#e5f'; // 紫色で警告表示
      ctx.fillText('PURPLE ITEMS ARE CURSED', CONFIG.CANVAS_W / 2, 130);
      
      const startIndex = itemScreen * 3;
      for (let i = 0; i < 3; i++) {
        const idx = startIndex + i;
        if (idx >= ITEM_DESCRIPTIONS.length) break;
        const item = ITEM_DESCRIPTIONS[idx];
        
        const y = 180 + i * 100;
        const isDebuff = DEBUFF_ITEMS.includes(item.l);
        
        // 四角形の背景
        ctx.fillStyle = isDebuff ? 'rgba(50, 0, 80, 0.8)' : 'rgba(0, 0, 0, 0.7)';
        ctx.strokeStyle = isDebuff ? '#a0f' : '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(CONFIG.CANVAS_W / 2 - 200, y - 25, 40, 40, 4);
        ctx.fill();
        ctx.stroke();
        
        // 文字 (L)
        ctx.fillStyle = isDebuff ? '#e5f' : '#ff0';
        ctx.font = '24px "Press Start 2P", sans-serif';
        ctx.fillText(item.l, CONFIG.CANVAS_W / 2 - 180, y + 6);
        
        // Name and description
        ctx.textAlign = 'left';
        ctx.fillStyle = isDebuff ? '#e5f' : '#fff';
        ctx.font = '16px "Press Start 2P", sans-serif';
        ctx.fillText(item.n, CONFIG.CANVAS_W / 2 - 130, y - 5);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px "Press Start 2P", sans-serif';
        ctx.fillText(item.d, CONFIG.CANVAS_W / 2 - 130, y + 15);
        ctx.textAlign = 'center';
      }
    }

    // 「CLICK OR SPACE TO START」を点滅表示
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px "Press Start 2P", sans-serif';
      ctx.fillText('CLICK OR SPACE TO START', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H - 50);
    }
  } else if (currentState === GAME_STATE.READY) {
    ctx.textAlign = 'center';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px "Press Start 2P", sans-serif';
      ctx.fillText('CLICK OR SPACE TO LAUNCH', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 + 50);
    }
    // レディ状態でもボールをパドルの上に描画
    ctx.fillStyle = '#fff';
    ctx.fillRect(paddle.x + paddle.w / 2 - CONFIG.BALL_SIZE / 2, paddle.y - CONFIG.BALL_SIZE, CONFIG.BALL_SIZE, CONFIG.BALL_SIZE);
  } else if (currentState === GAME_STATE.GAMEOVER) {
    ctx.fillStyle = '#f00';
    ctx.font = '30px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 - 20);

    // CONTINUE Button
    ctx.fillStyle = '#555';
    ctx.fillRect(GAMEOVER_MENU.continue.x, GAMEOVER_MENU.continue.y, GAMEOVER_MENU.continue.w, GAMEOVER_MENU.continue.h);
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Press Start 2P", sans-serif';
    ctx.fillText('CONTINUE', CONFIG.CANVAS_W / 2, GAMEOVER_MENU.continue.y + 25);

    // QUIT Button
    ctx.fillStyle = '#555';
    ctx.fillRect(GAMEOVER_MENU.quit.x, GAMEOVER_MENU.quit.y, GAMEOVER_MENU.quit.w, GAMEOVER_MENU.quit.h);
    ctx.fillStyle = '#fff';
    ctx.fillText('QUIT', CONFIG.CANVAS_W / 2, GAMEOVER_MENU.quit.y + 25);
  } else if (currentState === GAME_STATE.PAUSE) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSE', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 - 60);

    // RESUME Button
    ctx.fillStyle = '#555';
    ctx.fillRect(PAUSE_MENU.resume.x, PAUSE_MENU.resume.y, PAUSE_MENU.resume.w, PAUSE_MENU.resume.h);
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Press Start 2P", sans-serif';
    ctx.fillText('RESUME', CONFIG.CANVAS_W / 2, PAUSE_MENU.resume.y + 25);

    // QUIT Button
    ctx.fillStyle = '#555';
    ctx.fillRect(PAUSE_MENU.quit.x, PAUSE_MENU.quit.y, PAUSE_MENU.quit.w, PAUSE_MENU.quit.h);
    ctx.fillStyle = '#fff';
    ctx.fillText('QUIT', CONFIG.CANVAS_W / 2, PAUSE_MENU.quit.y + 25);
  } else if (currentState === GAME_STATE.CLEAR) {
    ctx.fillStyle = '#0f0';
    ctx.font = '30px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE CLEAR!', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 - 20);
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Press Start 2P", sans-serif';
    ctx.fillText(`FINAL SCORE: ${score}`, CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 + 10);
    ctx.fillText('CLICK OR SPACE TO RESTART', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 + 50);
  }

  // HUD / FPS
  ctx.fillStyle = '#fff';
  ctx.font = '12px "Press Start 2P", sans-serif';
  ctx.textAlign = 'left';
  const fpsStr = fps.toString().padStart(3, ' ');
  ctx.fillText(`FPS:${fpsStr} LIVES:${lives}`, 10, 25);
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE:${score}`, CONFIG.CANVAS_W - 10, 25);
  
  // UI PAUSE Button
  if (currentState === GAME_STATE.PLAYING) {
    ctx.fillStyle = '#555';
    ctx.fillRect(UI_PAUSE_BTN.x, UI_PAUSE_BTN.y, UI_PAUSE_BTN.w, UI_PAUSE_BTN.h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSE', CONFIG.CANVAS_W / 2, 23);
  }
}

function loop(ts) {
  const dt = (ts - lastTime) / 1000;
  if (dt > 0) {
    fps = Math.round(1 / dt);
  }
  lastTime = ts;

  // Cap dt to avoid huge jumps
  update(Math.min(dt, 0.1));
  render();

  requestAnimationFrame(loop);
}

// フォントがロードされてから開始する
document.fonts.ready.then(() => {
  requestAnimationFrame(loop);
});
