export interface TrackedObject {
  id: string;
  label: string;
  confidence: number;
  position: { x: number; y: number };
  movement: { dx: number; dy: number };
  firstSeen: number;
  lastSeen: number;
}

export class ObjectTracker {
  private tracked = new Map<string, TrackedObject>();

  update(objects: Array<{ label: string; confidence: number; boundingBox: { x: number; y: number; width: number; height: number } }>, timestamp = Date.now()): TrackedObject[] {
    const next = new Map<string, TrackedObject>();
    for (const object of objects) {
      const id = `${object.label}-${Math.round(object.boundingBox.x)}-${Math.round(object.boundingBox.y)}`;
      const previous = this.tracked.get(id);
      const position = { x: object.boundingBox.x, y: object.boundingBox.y };
      const movement = previous ? {
        dx: position.x - previous.position.x,
        dy: position.y - previous.position.y
      } : { dx: 0, dy: 0 };

      const tracked: TrackedObject = {
        id,
        label: object.label,
        confidence: object.confidence,
        position,
        movement,
        firstSeen: previous?.firstSeen ?? timestamp,
        lastSeen: timestamp
      };
      next.set(id, tracked);
    }

    this.tracked = next;
    return Array.from(next.values());
  }

  getTracked(): TrackedObject[] {
    return Array.from(this.tracked.values());
  }
}
