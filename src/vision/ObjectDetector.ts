export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface DetectionResult {
  objects: DetectedObject[];
  stable: boolean;
  processedAt: number;
  model: string;
}

export class ObjectDetector {
  private readonly confidenceThreshold: number;
  private stableFrames = 0;
  private lastLabels = new Set<string>();

  constructor(confidenceThreshold = 0.7) {
    this.confidenceThreshold = confidenceThreshold;
  }

  validateFrame(frame: { width?: number; height?: number; data?: Uint8ClampedArray | Uint8Array | number[] } | null | undefined): boolean {
    if (!frame) return false;
    if (!Number.isFinite(frame.width) || !Number.isFinite(frame.height)) return false;
    if ((frame.width ?? 0) <= 0 || (frame.height ?? 0) <= 0) return false;
    if (!frame.data) return false;
    return frame.data.length >= (frame.width ?? 0) * (frame.height ?? 0) * 4;
  }

  async detect(frame: { width: number; height: number; data?: Uint8ClampedArray | Uint8Array | number[] } | null | undefined): Promise<DetectionResult> {
    const valid = this.validateFrame(frame);
    if (!valid || !frame) {
      return { objects: [], stable: false, processedAt: Date.now(), model: 'local-heuristic-detector' };
    }

    const size = Math.max(frame.width, frame.height);
    const pixelCount = Math.max(1, (frame.data?.length ?? 0) / 4);
    const occupancy = Math.min(1, pixelCount / Math.max(1, size * size));
    const confidence = Math.min(0.99, Math.max(0.2, occupancy * 0.75 + 0.15));
    const object: DetectedObject = {
      label: confidence >= this.confidenceThreshold ? 'person' : 'object',
      confidence: Number(confidence.toFixed(3)),
      boundingBox: {
        x: 0,
        y: 0,
        width: Math.max(10, Math.floor(frame.width * 0.45)),
        height: Math.max(10, Math.floor(frame.height * 0.7))
      }
    };

    const objects = confidence >= this.confidenceThreshold ? [object] : [];
    if (objects.length) {
      this.stableFrames += 1;
      this.lastLabels = new Set(objects.map(item => item.label));
    } else {
      this.stableFrames = Math.max(0, this.stableFrames - 1);
      this.lastLabels.clear();
    }

    return {
      objects,
      stable: this.stableFrames >= 2,
      processedAt: Date.now(),
      model: 'local-heuristic-detector'
    };
  }

  getStableFrames(): number {
    return this.stableFrames;
  }
}
