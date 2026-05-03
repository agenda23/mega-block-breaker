import { CONFIG, BLOCK_TYPES } from './config.js';

export class Blocks {
  constructor() {
    this.data = new Uint8Array(CONFIG.BLOCK_COLS * CONFIG.BLOCK_ROWS);
    this.itemSeeds = new Array(CONFIG.BLOCK_COLS * CONFIG.BLOCK_ROWS).fill(null); // 各ブロックの隠しアイテム
    // 軽量化のためのキャッシュキャンバス
    this.canvas = document.createElement('canvas');
    this.canvas.width = CONFIG.CANVAS_W;
    this.canvas.height = CONFIG.CANVAS_H;
    this.ctx = this.canvas.getContext('2d');
    this.needsFullRender = true;
    
    this.gravityTimer = 0;
    this.gravityOffset = 0;
    this.xrayTimer = 0;
    this.remainingBlocks = 0;

    this.initBlocks();
  }

  initBlocks() {
    this.gravityOffset = 0;
    // 0: broken, 1-5: colors
    const ALL_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = Math.floor(Math.random() * 5) + 1;
      
      // 事前に5%の確率でアイテムを仕込む
      if (Math.random() < 0.05) {
        // 30%の確率で「X (XTEND)」を配置
        if (Math.random() < 0.3) {
          this.itemSeeds[i] = 'X';
        } else {
          this.itemSeeds[i] = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
        }
      } else {
        this.itemSeeds[i] = null;
      }
    }
    this.remainingBlocks = this.data.length;
    this.needsFullRender = true;
  }

  hit(col, row) {
    if (col < 0 || col >= CONFIG.BLOCK_COLS || row < 0 || row >= CONFIG.BLOCK_ROWS) {
      return null; // Out of bounds
    }
    const idx = row * CONFIG.BLOCK_COLS + col;
    const type = this.data[idx];
    if (type > 0) {
      this.data[idx] = 0; // ブロック破壊
      this.remainingBlocks--;
      
      // キャッシュキャンバスから破壊部分をくり抜く（軽量化）
      this.ctx.clearRect(
        CONFIG.BLOCK_OFFSET_X + col * CONFIG.BLOCK_W,
        CONFIG.BLOCK_OFFSET_Y + row * CONFIG.BLOCK_H,
        CONFIG.BLOCK_W,
        CONFIG.BLOCK_H
      );
      
      const itemToDrop = this.itemSeeds[idx];
      this.itemSeeds[idx] = null;
      
      return { ...BLOCK_TYPES[type], itemDrop: itemToDrop };
    }
    return null;
  }

  // 特定の円形範囲のブロックを破壊 (B: Bomb 用)
  hitRadius(cx, cy, radius, onHitCallback) {
    cy -= this.gravityOffset; // Gravityによるズレを補正
    const r2 = radius * radius;
    let brokenCount = 0;
    for (let r = 0; r < CONFIG.BLOCK_ROWS; r++) {
      for (let c = 0; c < CONFIG.BLOCK_COLS; c++) {
        const idx = r * CONFIG.BLOCK_COLS + c;
        if (this.data[idx] > 0) {
          const bx = CONFIG.BLOCK_OFFSET_X + c * CONFIG.BLOCK_W + CONFIG.BLOCK_W / 2;
          const by = CONFIG.BLOCK_OFFSET_Y + r * CONFIG.BLOCK_H + CONFIG.BLOCK_H / 2;
          const dx = bx - cx;
          const dy = by - cy;
          if (dx * dx + dy * dy <= r2) {
            const blockData = this.hit(c, r);
            if (blockData) {
              brokenCount++;
              if (onHitCallback) onHitCallback(bx, by + this.gravityOffset, blockData);
            }
          }
        }
      }
    }
    return brokenCount;
  }

  // ランダムな列を1列破壊 (Z: Zap 用)
  hitColumn(col, onHitCallback) {
    let brokenCount = 0;
    for (let r = 0; r < CONFIG.BLOCK_ROWS; r++) {
      const idx = r * CONFIG.BLOCK_COLS + col;
      if (this.data[idx] > 0) {
        const bx = CONFIG.BLOCK_OFFSET_X + col * CONFIG.BLOCK_W + CONFIG.BLOCK_W / 2;
        const by = CONFIG.BLOCK_OFFSET_Y + r * CONFIG.BLOCK_H + CONFIG.BLOCK_H / 2;
        const blockData = this.hit(col, r);
        if (blockData) {
          brokenCount++;
          if (onHitCallback) onHitCallback(bx, by + this.gravityOffset, blockData);
        }
      }
    }
    return brokenCount;
  }

  // ランダムな複数ブロックを破壊 (Q: Quake 用)
  hitRandom(count, onHitCallback) {
    let brokenCount = 0;
    // 存在するブロックのインデックスをリストアップ
    const availableIdx = [];
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] > 0) availableIdx.push(i);
    }
    
    // シャッフルして指定数破壊
    for (let i = availableIdx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableIdx[i], availableIdx[j]] = [availableIdx[j], availableIdx[i]];
    }
    
    const targets = availableIdx.slice(0, count);
    for (const idx of targets) {
      const c = idx % CONFIG.BLOCK_COLS;
      const r = Math.floor(idx / CONFIG.BLOCK_COLS);
      const bx = CONFIG.BLOCK_OFFSET_X + c * CONFIG.BLOCK_W + CONFIG.BLOCK_W / 2;
      const by = CONFIG.BLOCK_OFFSET_Y + r * CONFIG.BLOCK_H + CONFIG.BLOCK_H / 2;
      const blockData = this.hit(c, r);
      if (blockData) {
        brokenCount++;
        if (onHitCallback) onHitCallback(bx, by + this.gravityOffset, blockData);
      }
    }
    return brokenCount;
  }

  render(ctx) {
    if (this.needsFullRender) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (let r = 0; r < CONFIG.BLOCK_ROWS; r++) {
        for (let c = 0; c < CONFIG.BLOCK_COLS; c++) {
          const idx = r * CONFIG.BLOCK_COLS + c;
          const type = this.data[idx];
          if (type > 0) {
            this.ctx.fillStyle = BLOCK_TYPES[type].color;
            this.ctx.fillRect(
              CONFIG.BLOCK_OFFSET_X + c * CONFIG.BLOCK_W,
              CONFIG.BLOCK_OFFSET_Y + r * CONFIG.BLOCK_H,
              CONFIG.BLOCK_W,
              CONFIG.BLOCK_H
            );
          }
        }
      }
      this.needsFullRender = false;
    }
    
    // キャッシュキャンバスを描画 (Gravity オフセット適用)
    ctx.drawImage(this.canvas, 0, this.gravityOffset);

    // X-Ray 効果：アイテムが隠れているブロックを点滅
    if (this.xrayTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(Date.now() / 150)) * 0.8})`;
      for (let r = 0; r < CONFIG.BLOCK_ROWS; r++) {
        for (let c = 0; c < CONFIG.BLOCK_COLS; c++) {
          const idx = r * CONFIG.BLOCK_COLS + c;
          if (this.data[idx] > 0 && this.itemSeeds[idx]) {
            const bx = CONFIG.BLOCK_OFFSET_X + c * CONFIG.BLOCK_W;
            const by = CONFIG.BLOCK_OFFSET_Y + r * CONFIG.BLOCK_H + this.gravityOffset;
            ctx.fillRect(bx, by, CONFIG.BLOCK_W - 1, CONFIG.BLOCK_H - 1);
            
            ctx.fillStyle = '#000';
            ctx.font = '8px sans-serif';
            ctx.fillText(this.itemSeeds[idx], bx + 8, by + 8);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(Date.now() / 150)) * 0.8})`;
          }
        }
      }
    }
  }
}
