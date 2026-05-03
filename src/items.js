import { CONFIG } from './config.js';

export const ITEM_DATA = {
  A: 'AIM', B: 'BOMB', C: 'CATCH', D: 'DOUBLE', E: 'EXPAND',
  F: 'FIRE', G: 'GRAVITY', H: 'HEAL', I: 'INVISIBLE', J: 'JUMP',
  K: 'KILLER', L: 'LASER', M: 'MAGNET', N: 'NORMAL', O: 'OBSTACLE',
  P: 'POWER', Q: 'QUAKE', R: 'REVERSE', S: 'SLOW', T: 'TWIN',
  U: 'UFO', V: 'VORTEX', W: 'WARP', X: 'XTEND', Y: 'YIELD', Z: 'ZAP'
};

export const DEBUFF_ITEMS = ['G', 'I', 'O', 'R'];

export const ITEM_DESCRIPTIONS = [
  { l: 'A', n: 'AIM', d: 'SHOWS BALL TRAJECTORY' },
  { l: 'B', n: 'BOMB', d: 'EXPLODES SURROUNDING BLOCKS' },
  { l: 'C', n: 'CATCH', d: 'CATCH BALL ON PADDLE' },
  { l: 'D', n: 'DOUBLE', d: 'SPLITS BALL INTO TWO' },
  { l: 'E', n: 'EXPAND', d: 'WIDENS THE PADDLE' },
  { l: 'F', n: 'FIRE', d: 'PIERCING FIREBALL' },
  { l: 'G', n: 'GRAVITY', d: 'BLOCKS FALL DOWN (DANGER)' },
  { l: 'H', n: 'HEAL', d: 'RECOVERS ONE LIFE' },
  { l: 'I', n: 'INVISIBLE', d: 'BALL BLINKS (DANGER)' },
  { l: 'J', n: 'JUMP', d: 'MOVE PADDLE VERTICALLY' },
  { l: 'K', n: 'KILLER', d: 'SUPER PIERCING PADDLE' },
  { l: 'L', n: 'LASER', d: 'SHOOT LASERS UPWARD' },
  { l: 'M', n: 'MAGNET', d: 'ATTRACTS BALL TO PADDLE' },
  { l: 'N', n: 'NORMAL', d: 'RESETS ALL STATUS' },
  { l: 'O', n: 'OBSTACLE', d: 'SPAWNS BLOCK OBSTACLES (DANGER)' },
  { l: 'P', n: 'POWER', d: 'GIANT PIERCING BALL' },
  { l: 'Q', n: 'QUAKE', d: 'DESTROY RANDOM BLOCKS' },
  { l: 'R', n: 'REVERSE', d: 'REVERSES CONTROLS (DANGER)' },
  { l: 'S', n: 'SLOW', d: 'SLOWS DOWN BALL' },
  { l: 'T', n: 'TWIN', d: 'SPLITS PADDLE IN TWO' },
  { l: 'U', n: 'UFO', d: 'SPAWNS UFO BEAM' },
  { l: 'V', n: 'VORTEX', d: 'BLACK HOLE BALL' },
  { l: 'W', n: 'WARP', d: 'LOOPS SCREEN EDGES' },
  { l: 'X', n: 'XTEND', d: 'SPAWNS 10 BALLS' },
  { l: 'Y', n: 'YIELD', d: 'DOUBLE SCORE' },
  { l: 'Z', n: 'ZAP', d: 'DESTROY RANDOM COLUMN' }
];

export class Items {
  constructor() {
    this.fallingItems = []; // 落下中のアイテム { letter, x, y, vy }
    this.activeUI = []; // { letter, name, timer, isDebuff } の配列
    this.uiDisplayTimer = 0; // 表示切り替え用タイマー
  }

  reset() {
    this.fallingItems = [];
    this.activeUI = [];
    this.uiDisplayTimer = 0;
  }

  // 仮の実装: アイテムを取得した時のインターフェース
  acquireItem(letter, duration = CONFIG.ITEM_DURATION) {
    const isDebuff = DEBUFF_ITEMS.includes(letter);
    const name = ITEM_DATA[letter] || letter;
    
    const time = duration > 0 ? duration : 1.5; // 即時発動系は短時間だけ表示
    
    // 既存の同じアイテムがあれば上書き、なければ追加
    const existing = this.activeUI.find(ui => ui.letter === letter);
    if (existing) {
      existing.timer = time;
    } else {
      this.activeUI.push({ letter, name, timer: time, isDebuff });
    }
  }

  clearUI() {
    this.activeUI = [];
    this.uiDisplayTimer = 0;
  }

  // ブロックからドロップされたアイテムを生成
  spawnItem(letter, x, y) {
    if (letter) {
      this.fallingItems.push({
        letter: letter,
        x: x,
        y: y,
        vy: 150 // 落下速度
      });
    }
  }

  update(dt, paddle) {
    const caughtLetters = [];

    // 落下アイテムの更新とパドルとの当たり判定
    for (let i = this.fallingItems.length - 1; i >= 0; i--) {
      const item = this.fallingItems[i];
      item.y += item.vy * dt;

      // パドルとの衝突判定（アイテムサイズを 20x20 と仮定）
      const size = 20;
      if (
        item.y + size >= paddle.y &&
        item.y <= paddle.y + paddle.h &&
        item.x + size >= paddle.x &&
        item.x <= paddle.x + paddle.w
      ) {
        caughtLetters.push(item.letter);
        this.fallingItems.splice(i, 1);
        continue;
      }

      // 画面外へ消えた場合
      if (item.y > CONFIG.CANVAS_H) {
        this.fallingItems.splice(i, 1);
      }
    }
    
    // UIタイマー更新
    for (let i = this.activeUI.length - 1; i >= 0; i--) {
      this.activeUI[i].timer -= dt;
      if (this.activeUI[i].timer <= 0) {
        this.activeUI.splice(i, 1);
      }
    }
    
    if (this.activeUI.length > 0) {
      this.uiDisplayTimer += dt;
    } else {
      this.uiDisplayTimer = 0;
    }
    
    return caughtLetters;
  }

  render(ctx) {
    // 落下アイテムの描画
    ctx.font = '16px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    for (const item of this.fallingItems) {
      const isDebuffItem = DEBUFF_ITEMS.includes(item.letter);
      
      // 四角形の背景
      ctx.fillStyle = isDebuffItem ? 'rgba(50, 0, 80, 0.8)' : 'rgba(0, 0, 0, 0.7)';
      ctx.strokeStyle = isDebuffItem ? '#a0f' : '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(item.x - 2, item.y - 14, 20, 20, 4);
      ctx.fill();
      ctx.stroke();
      
      // 文字
      ctx.fillStyle = isDebuffItem ? '#e5f' : '#ff0';
      ctx.fillText(item.letter, item.x + 8, item.y + 2);
    }
    
    // アイテム名とタイマーのUI描画
    if (this.activeUI.length > 0) {
      // ローテーション表示: 1秒ごとに次のアイテムを表示
      const displayIndex = Math.floor(this.uiDisplayTimer) % this.activeUI.length;
      const currentUI = this.activeUI[displayIndex];
      
      const isDebuff = currentUI.isDebuff;
      
      let offsetX = 0;
      let offsetY = 0;
      if (isDebuff) {
        // デバフ時の不穏なシェイク演出と紫色の文字
        offsetX = (Math.random() - 0.5) * 6;
        offsetY = (Math.random() - 0.5) * 6;
        ctx.fillStyle = `rgba(200, 50, 255, ${0.8 + Math.random() * 0.2})`;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      }
      
      ctx.font = '20px "Press Start 2P", sans-serif';
      ctx.textAlign = 'center';
      
      const textY = CONFIG.CANVAS_H / 2 + 100;
      ctx.fillText(currentUI.name, CONFIG.CANVAS_W / 2 + offsetX, textY + offsetY);
      
      if (currentUI.timer > 2) {
        // 2秒より長い場合はタイマーとして表示
        ctx.font = '12px "Press Start 2P", sans-serif';
        ctx.fillText(`TIME: ${Math.ceil(currentUI.timer)}s`, CONFIG.CANVAS_W / 2 + offsetX, textY + 25 + offsetY);
      }
    }
  }
}
