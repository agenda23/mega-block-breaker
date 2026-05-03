import { CONFIG } from './config.js';

export class Paddle {
  constructor() {
    this.baseW = CONFIG.PADDLE_W;
    this.w = this.baseW;
    this.h = CONFIG.PADDLE_H;
    this.x = (CONFIG.CANVAS_W - this.w) / 2;
    this.y = CONFIG.PADDLE_Y;
    
    // エフェクト用
    this.effectColor = null;
    this.effectTimer = 0;
    
    // アイテム状態
    this.expandTimer = 0;
    this.reverseTimer = 0;
    this.jumpTimer = 0;
    this.twinTimer = 0;
    this.killerTimer = 0;
    this.magnetTimer = 0;
  }

  reset() {
    this.w = this.baseW;
    this.x = (CONFIG.CANVAS_W - this.w) / 2;
    this.y = CONFIG.PADDLE_Y;
    this.effectColor = null;
    this.effectTimer = 0;
    this.expandTimer = 0;
    this.reverseTimer = 0;
    this.jumpTimer = 0;
    this.twinTimer = 0;
    this.killerTimer = 0;
    this.magnetTimer = 0;
  }

  update(input, dt) {
    // アイテム状態の更新
    if (this.expandTimer > 0) {
      this.expandTimer -= dt;
      this.w = this.baseW * 2;
    } else {
      this.w = this.baseW;
    }

    if (this.reverseTimer > 0) this.reverseTimer -= dt;
    if (this.jumpTimer > 0) this.jumpTimer -= dt;
    if (this.twinTimer > 0) this.twinTimer -= dt;
    if (this.killerTimer > 0) this.killerTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;

    if (input.mouseX !== null) {
      let targetX = input.mouseX;
      if (this.reverseTimer > 0) {
        // 反転時は画面中央を軸にマウスXを反転させる
        targetX = CONFIG.CANVAS_W - targetX;
      }
      // マウス操作（パドル中央をマウスカーソルに合わせる）
      this.x = targetX - this.w / 2;
      
      if (this.jumpTimer > 0 && input.mouseY !== undefined) {
        this.y = input.mouseY - this.h / 2;
        if (this.y > CONFIG.CANVAS_H - this.h) this.y = CONFIG.CANVAS_H - this.h;
        if (this.y < CONFIG.CANVAS_H / 2) this.y = CONFIG.CANVAS_H / 2;
      } else {
        this.y = CONFIG.PADDLE_Y;
      }
      
      // マウス位置を使ったらリセット（キーボードと混在させるため）
      input.mouseX = null;
    } else {
      let moveLeft = input.left;
      let moveRight = input.right;
      if (this.reverseTimer > 0) {
        moveLeft = input.right;
        moveRight = input.left;
      }
      
      if (moveLeft) this.x -= CONFIG.PADDLE_SPEED * dt;
      if (moveRight) this.x += CONFIG.PADDLE_SPEED * dt;
    }

    // 壁との衝突（画面外に出ないようにする）
    if (this.x < 0) {
      this.x = 0;
    } else if (this.x + this.w > CONFIG.CANVAS_W) {
      this.x = CONFIG.CANVAS_W - this.w;
    }
    
    // エフェクト更新
    if (this.effectTimer > 0) {
      this.effectTimer -= dt;
      if (this.effectTimer <= 0) {
        this.effectTimer = 0;
        this.effectColor = null;
      }
    }
  }

  triggerEffect(color) {
    this.effectColor = color;
    this.effectTimer = 0.2; // 0.2秒間発光
  }

  render(ctx) {
    if (this.effectTimer > 0 && this.effectColor) {
      // エフェクト中
      ctx.fillStyle = this.effectColor;
      ctx.shadowColor = this.effectColor;
      ctx.shadowBlur = 10 * (this.effectTimer / 0.2);
    } else {
      if (this.killerTimer > 0) {
        ctx.fillStyle = '#f80';
        ctx.shadowColor = '#f00';
        ctx.shadowBlur = 10;
      } else if (this.reverseTimer > 0) {
        ctx.fillStyle = '#a0a'; // 反転時は紫
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#f00'; // 通常は赤
        ctx.shadowBlur = 0;
      }
    }
    
    if (this.twinTimer > 0) {
      // 分裂描画
      const halfW = this.w / 2 - 20;
      ctx.fillRect(this.x, this.y, halfW, this.h);
      ctx.fillRect(this.x + this.w - halfW, this.y, halfW, this.h);
    } else {
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
    
    // シャドウリセット
    ctx.shadowBlur = 0;
  }
}
