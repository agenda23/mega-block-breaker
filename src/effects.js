export class Effects {
  constructor() {
    this.particles = [];
  }

  reset() {
    this.particles = [];
  }

  spawn(x, y, color) {
    // 5〜10個のパーティクルを生成
    const count = Math.floor(Math.random() * 6) + 5;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0, // 寿命1秒
        maxLife: 1.0,
        color: color
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    if (this.particles.length === 0) return;
    
    // 軽量化のため、グローバルアルファを活用し一括で描画できるところはする
    // 今回は色ごとに分けて描画するなどの最適化も考えられるが、まずはシンプルに。
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2, 2);
    }
    ctx.globalAlpha = 1.0;
  }
}
