import { CONFIG } from './config.js';

export class Ball {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.active = false;
    this.power = 1; // 1: 通常, 3: 3xパワー（貫通）
    
    this.slowTimer = 0;
    this.powerTimer = 0; // P (Power) item
    this.fireTimer = 0; // F (Fire)
    this.invisibleTimer = 0; // I (Invisible)
    this.vortexTimer = 0; // V (Vortex)
    this.warpTimer = 0; // W (Warp)
    this.aimTimer = 0; // A (Aim)
    this.catchTimer = 0; // C (Catch)
    this.isCaught = false; // C (Catch) 状態
    this.caughtOffsetX = 0;
  }

  spawn(paddleX, paddleY, paddleW) {
    this.x = paddleX + paddleW / 2 - CONFIG.BALL_SIZE / 2;
    this.y = paddleY - CONFIG.BALL_SIZE;
    
    // 発射角：真上を避け、左右に必ず15度以上の角度をつける
    const sign = Math.random() > 0.5 ? 1 : -1;
    const angleOffset = (15 + Math.random() * 30) * Math.PI / 180; // 15〜45度
    const angle = -Math.PI / 2 + sign * angleOffset;
    
    const speed = 300;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.active = true;
    this.power = 1;
  }

  update(dt, blocks, paddle, audio, gameStateObj, effects, items, input) {
    if (!this.active) return 0; // return score

    if (this.isCaught) {
      // パドルにくっついている
      this.x = paddle.x + this.caughtOffsetX;
      this.y = paddle.y - (this.powerTimer > 0 ? CONFIG.BALL_SIZE * 3 : CONFIG.BALL_SIZE);
      
      // 発射
      if (input.space || input.click) {
        this.isCaught = false;
        audio.playBeep();
      }
      return 0;
    }

    let speedMult = 1.0;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      speedMult = 0.5;
    }
    if (this.powerTimer > 0) this.powerTimer -= dt;
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.invisibleTimer > 0) this.invisibleTimer -= dt;
    if (this.vortexTimer > 0) {
      this.vortexTimer -= dt;
      // ブラックホール効果：周囲のブロックを常に破壊
      blocks.hitRadius(this.x + CONFIG.BALL_SIZE/2, this.y + CONFIG.BALL_SIZE/2, 40, (bx, by, bData) => {
        effects.spawn(bx, by, bData.color);
        if (items && bData.itemDrop) items.spawnItem(bData.itemDrop, bx, by);
      });
    }
    if (this.warpTimer > 0) this.warpTimer -= dt;
    if (this.aimTimer > 0) this.aimTimer -= dt;
    if (this.catchTimer > 0) this.catchTimer -= dt;

    let score = 0;
    
    // 次のフレームの座標
    let nextX = this.x + this.vx * dt * speedMult;
    let nextY = this.y + this.vy * dt * speedMult;
    
    const currentSize = this.powerTimer > 0 ? CONFIG.BALL_SIZE * 3 : CONFIG.BALL_SIZE;
    const halfSize = currentSize / 2;

    // 1. 壁との衝突
    if (this.warpTimer > 0) {
      // W: Warp
      if (nextX < 0) {
        nextX = CONFIG.CANVAS_W;
      } else if (nextX + currentSize > CONFIG.CANVAS_W) {
        nextX = 0;
      }
    } else {
      if (nextX < 0) {
        nextX = 0;
        this.vx *= -1;
        audio.playBeep();
      } else if (nextX + currentSize > CONFIG.CANVAS_W) {
        nextX = CONFIG.CANVAS_W - currentSize;
        this.vx *= -1;
        audio.playBeep();
      }
    }

    if (nextY < 0) {
      nextY = 0;
      this.vy *= -1;
      audio.playBeep();
    } else if (nextY > CONFIG.CANVAS_H) {
      // 画面下への落下（ミス）
      this.active = false;
      return -1; // -1 means missed
    }

    // 2. パドルとの衝突判定 (AABB)
    if (
      this.vy > 0 && // 落ちている時のみ
      nextY + currentSize >= paddle.y &&
      this.y + currentSize <= paddle.y + 10 && // 直前はパドルより上にいた
      nextX + currentSize >= paddle.x &&
      nextX <= paddle.x + paddle.w
    ) {
      nextY = paddle.y - currentSize;
      
      if (this.catchTimer > 0) {
        // C: Catch
        this.isCaught = true;
        this.caughtOffsetX = nextX - paddle.x;
      }
      
      this.vy *= -1;
      
      // パドルの当たる位置による反射角の変化
      const hitX = (nextX + halfSize) - (paddle.x + paddle.w / 2);
      // hitX は -paddle.w/2 から +paddle.w/2 の範囲
      const ratio = hitX / (paddle.w / 2); // -1.0 to 1.0
      
      // パドルの接触位置でボールのパワー判定
      // 中央10px (ratio = -10/80 to 10/80 => -0.125 to 0.125)
      // 左右端5px (ratio < -0.875 or ratio > 0.875)
      if (paddle.killerTimer > 0 || Math.abs(ratio) <= 0.125 || Math.abs(ratio) >= 0.875) {
        this.power = 3;
      } else {
        this.power = 1;
      }

      // 速度（速さ）を維持しつつ、反射角を計算
      const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      
      // 基本反射角：パドルの当たる位置に応じて真上(-90度)から最大±60度
      let baseAngle = -Math.PI / 2 + ratio * (Math.PI / 3);
      
      // ブレを追加（5度だと見えにくいため、±10度とする）
      const variance = (Math.random() - 0.5) * (20 * Math.PI / 180);
      baseAngle += variance;
      
      this.vx = Math.cos(baseAngle) * currentSpeed;
      this.vy = Math.sin(baseAngle) * currentSpeed;
      
      // まっすぐ縦（X速度が0に近い状態）に飛ばないよう、X方向の最低速度を強制する
      if (Math.abs(this.vx) < currentSpeed * 0.15) {
        this.vx = (this.vx < 0 ? -1 : 1) * currentSpeed * 0.15;
        this.vy = -Math.sqrt(currentSpeed * currentSpeed - this.vx * this.vx);
      }
      
      // 極端に水平に飛ばないよう、Y方向の最低速度も確保
      if (Math.abs(this.vy) < currentSpeed * 0.2) {
        this.vy = -currentSpeed * 0.2;
        this.vx = Math.sign(this.vx) * Math.sqrt(currentSpeed * currentSpeed - this.vy * this.vy);
      }

      // 反射角に応じてパドルの色エフェクトを変える
      let hitColor = '#fff';
      if (ratio < -0.3) hitColor = '#00f';
      else if (ratio > 0.3) hitColor = '#f00';
      else hitColor = '#0f0';
      paddle.triggerEffect(hitColor);
      
      audio.playBeep();
      gameStateObj.combo = 0; // コンボリセット
    }

    // 3. ブロックとの衝突判定
    // ボールの中心座標
    const cx = nextX + halfSize;
    const cy = nextY + halfSize;

    const col = Math.floor((cx - CONFIG.BLOCK_OFFSET_X) / CONFIG.BLOCK_W);
    const row = Math.floor((cy - CONFIG.BLOCK_OFFSET_Y) / CONFIG.BLOCK_H);

    if (col >= 0 && col < CONFIG.BLOCK_COLS && row >= 0 && row < CONFIG.BLOCK_ROWS) {
      const blockHitResult = blocks.hit(col, row);
      if (blockHitResult) {
        score += blockHitResult.score;
        gameStateObj.combo++;
        audio.playBreak(gameStateObj.combo);
        
        // 当たったブロックの中心
        const blockCenterX = CONFIG.BLOCK_OFFSET_X + col * CONFIG.BLOCK_W + CONFIG.BLOCK_W / 2;
        const blockCenterY = CONFIG.BLOCK_OFFSET_Y + row * CONFIG.BLOCK_H + CONFIG.BLOCK_H / 2;
        
        // パーティクル生成
        effects.spawn(blockCenterX, blockCenterY, blockHitResult.color);
        
        // アイテム生成試行
        if (items && blockHitResult.itemDrop) {
          items.spawnItem(blockHitResult.itemDrop, blockCenterX, blockCenterY);
        }
        
        // パワー（貫通力）の処理
        if (this.fireTimer > 0) {
          // Fire中は無限貫通なので消費しない
        } else if (this.power > 1) {
          this.power--; // パワーを1消費して貫通（跳ね返らない）
        } else {
          // 簡易的な反射（当たった面を推測）
          if (Math.abs(cx - blockCenterX) > Math.abs(cy - blockCenterY)) {
            this.vx *= -1;
          } else {
            this.vy *= -1;
          }
        }
      }
    }

    this.x = nextX;
    this.y = nextY;

    // M: Magnet 処理
    if (paddle.magnetTimer > 0 && this.vy > 0 && this.y > CONFIG.CANVAS_H / 2) {
      // 下半分の画面にいて、落ちている時、パドルへ吸い寄せる
      const targetX = paddle.x + paddle.w / 2;
      const dx = targetX - (this.x + halfSize);
      this.vx += dx * 2.0 * dt; // 引力
    }
    
    return score;
  }

  render(ctx) {
    if (!this.active) return;
    
    const currentSize = this.powerTimer > 0 ? CONFIG.BALL_SIZE * 3 : CONFIG.BALL_SIZE;
    const halfSize = currentSize / 2;
    
    // A: Aim (予測線の描画)
    if (this.aimTimer > 0 && !this.isCaught) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x + halfSize, this.y + halfSize);
      // 約1秒先の位置を描画
      ctx.lineTo(this.x + halfSize + this.vx, this.y + halfSize + this.vy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // I: Invisible (点滅)
    if (this.invisibleTimer > 0) {
      ctx.globalAlpha = Math.abs(Math.sin(Date.now() / 100));
    }
    
    if (this.fireTimer > 0) {
      ctx.fillStyle = '#f80';
      ctx.shadowColor = '#f00';
      ctx.shadowBlur = 15;
    } else if (this.power > 1) {
      // 3xパワー中は発光エフェクト
      ctx.fillStyle = '#ff0';
      ctx.shadowColor = '#ff0';
      ctx.shadowBlur = 10;
    } else if (this.vortexTimer > 0) {
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#a0a';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#a0a';
      ctx.shadowBlur = 20;
    } else {
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
    }
    
    if (this.vortexTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x + halfSize, this.y + halfSize, currentSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(this.x, this.y, currentSize, currentSize);
    }
    
    ctx.shadowBlur = 0; // リセット
    ctx.globalAlpha = 1.0;
  }
}
