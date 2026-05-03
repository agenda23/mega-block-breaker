import { CONFIG } from './config.js';

export class Projectiles {
  constructor() {
    this.lasers = []; // { x, y, vy, active }
    this.ufo = null;  // { x, y, vx, beamTimer }
    this.obstacles = []; // { x, y, w, h }
  }

  reset() {
    this.lasers = [];
    this.ufo = null;
    this.obstacles = [];
  }

  spawnLaser(x, y) {
    this.lasers.push({ x, y, vy: -400, active: true });
  }

  spawnUFO() {
    this.ufo = {
      x: -50,
      y: CONFIG.BLOCK_OFFSET_Y - 20,
      vx: 100,
      beamTimer: 0
    };
  }

  spawnObstacle() {
    // プレイエリア中央付近に生成
    const w = 40;
    const h = 20;
    const x = Math.random() * (CONFIG.CANVAS_W - w * 2) + w;
    const y = CONFIG.CANVAS_H / 2 + (Math.random() - 0.5) * 100;
    this.obstacles.push({ x, y, w, h });
  }

  clearObstacles() {
    this.obstacles = [];
  }

  update(dt, blocks, effects, scoreObj, audio, items) {
    let gainedScore = 0;

    // Laser update
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.y += l.vy * dt;
      
      // Hit blocks
      const col = Math.floor((l.x - CONFIG.BLOCK_OFFSET_X) / CONFIG.BLOCK_W);
      const row = Math.floor((l.y - CONFIG.BLOCK_OFFSET_Y) / CONFIG.BLOCK_H);
      if (col >= 0 && col < CONFIG.BLOCK_COLS && row >= 0 && row < CONFIG.BLOCK_ROWS) {
        const hitData = blocks.hit(col, row);
        if (hitData) {
          gainedScore += hitData.score;
          effects.spawn(l.x, l.y, hitData.color);
          if (items && hitData.itemDrop) items.spawnItem(hitData.itemDrop, l.x, l.y);
          l.active = false;
        }
      }
      
      if (l.y < 0) l.active = false;
      if (!l.active) this.lasers.splice(i, 1);
    }

    // UFO update
    if (this.ufo) {
      this.ufo.x += this.ufo.vx * dt;
      this.ufo.beamTimer -= dt;

      if (this.ufo.beamTimer <= 0) {
        // Fire beam down
        const col = Math.floor((this.ufo.x - CONFIG.BLOCK_OFFSET_X) / CONFIG.BLOCK_W);
        if (col >= 0 && col < CONFIG.BLOCK_COLS) {
          const broken = blocks.hitColumn(col, (bx, by, bData) => {
            effects.spawn(bx, by, bData.color);
            gainedScore += bData.score;
            if (items && bData.itemDrop) items.spawnItem(bData.itemDrop, bx, by);
          });
          if (broken > 0) audio.playElectric();
        }
        this.ufo.beamTimer = 0.5; // Fire every 0.5 sec
      }

      if (this.ufo.x > CONFIG.CANVAS_W + 50) {
        this.ufo = null;
      }
    }

    scoreObj.val += gainedScore;
    return gainedScore;
  }

  render(ctx) {
    // Lasers
    ctx.fillStyle = '#0ff';
    for (const l of this.lasers) {
      ctx.fillRect(l.x - 2, l.y - 10, 4, 10);
    }

    // UFO
    if (this.ufo) {
      ctx.fillStyle = '#0f0';
      ctx.beginPath();
      ctx.ellipse(this.ufo.x, this.ufo.y, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Obstacles
    ctx.fillStyle = '#555';
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 2;
    for (const obs of this.obstacles) {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
    }
  }
}
