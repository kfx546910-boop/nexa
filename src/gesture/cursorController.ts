export class CursorController {
  private element: HTMLDivElement | null = null;
  private point = { x: 0, y: 0 };

  show() {
    if (this.element) return;
    this.element = document.createElement('div');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.style.cssText = 'position:fixed;z-index:9999;width:18px;height:18px;border:2px solid #22d3ee;border-radius:50%;box-shadow:0 0 18px #22d3ee;pointer-events:none;transform:translate(-50%,-50%);transition:transform 70ms linear;';
    document.body.appendChild(this.element);
  }

  move(normalized: { x: number; y: number }, sensitivity: number) {
    this.show();
    const targetX = Math.max(8, Math.min(window.innerWidth - 8, normalized.x * window.innerWidth * sensitivity));
    const targetY = Math.max(8, Math.min(window.innerHeight - 8, normalized.y * window.innerHeight * sensitivity));
    this.point = { x: targetX, y: targetY };
    this.element!.style.left = `${targetX}px`;
    this.element!.style.top = `${targetY}px`;
  }

  click() {
    const target = document.elementFromPoint(this.point.x, this.point.y) as HTMLElement | null;
    target?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }

  hide() {
    this.element?.remove();
    this.element = null;
  }
}
