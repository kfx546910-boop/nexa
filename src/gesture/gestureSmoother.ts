export class GestureSmoother {
  private point: { x: number; y: number } | null = null;

  constructor(private readonly smoothingFrames: number, private readonly deadZone: number) {}

  update(next: { x: number; y: number }) {
    if (!this.point) {
      this.point = next;
      return next;
    }
    const dx = next.x - this.point.x;
    const dy = next.y - this.point.y;
    if (Math.hypot(dx, dy) < this.deadZone) return this.point;
    const factor = Math.min(1, 2 / Math.max(2, this.smoothingFrames));
    this.point = { x: this.point.x + dx * factor, y: this.point.y + dy * factor };
    return this.point;
  }

  reset() {
    this.point = null;
  }
}
