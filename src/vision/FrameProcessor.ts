export interface FrameLike {
  width: number;
  height: number;
  timestamp?: number;
  data?: Uint8ClampedArray | Uint8Array | number[];
}

export interface ProcessedFrame extends FrameLike {
  motionScore: number;
  isDuplicate: boolean;
  throttled: boolean;
  hash: string;
}

export class FrameProcessor {
  private lastFrameHash = '';
  private lastFramePixels: Uint8ClampedArray | null = null;
  private lastTimestamp = 0;
  private readonly maxQueueLength = 4;
  private readonly targetFps: number;

  constructor(targetFps = 10) {
    this.targetFps = targetFps;
  }

  validate(frame: FrameLike | null | undefined): boolean {
    if (!frame || !Number.isFinite(frame.width) || !Number.isFinite(frame.height)) return false;
    if (frame.width <= 0 || frame.height <= 0) return false;
    if (frame.data && frame.data.length < frame.width * frame.height * 4) return false;
    return true;
  }

  private computeHash(frame: FrameLike): string {
    if (!frame.data) return `${frame.width}x${frame.height}:${frame.timestamp ?? 0}`;
    let hash = 0;
    for (let i = 0; i < Math.min(frame.data.length, 1024); i += 1) {
      hash = (hash * 31 + frame.data[i]) >>> 0;
    }
    return `${frame.width}x${frame.height}:${hash}`;
  }

  private computeMotion(frame: FrameLike): number {
    if (!frame.data || !this.lastFramePixels) return 0;
    let total = 0;
    const max = Math.min(frame.data.length, this.lastFramePixels.length);
    for (let i = 0; i < max; i += 4) {
      total += Math.abs(frame.data[i] - this.lastFramePixels[i]);
      total += Math.abs(frame.data[i + 1] - this.lastFramePixels[i + 1]);
      total += Math.abs(frame.data[i + 2] - this.lastFramePixels[i + 2]);
    }
    return total / Math.max(1, max / 4);
  }

  process(frame: FrameLike | null | undefined, now = Date.now()): ProcessedFrame | null {
    if (!this.validate(frame)) return null;

    const throttleMs = 1000 / Math.max(1, this.targetFps);
    const isDuplicate = this.lastFrameHash !== '' && this.computeHash(frame) === this.lastFrameHash;
    const throttled = now - this.lastTimestamp < throttleMs;
    const motionScore = this.computeMotion(frame);
    const processed: ProcessedFrame = {
      ...frame,
      motionScore,
      isDuplicate,
      throttled,
      hash: this.computeHash(frame)
    };

    if (isDuplicate || throttled) {
      return processed;
    }

    this.lastFrameHash = processed.hash;
    this.lastFramePixels = frame.data instanceof Uint8ClampedArray || frame.data instanceof Uint8Array
      ? new Uint8ClampedArray(frame.data)
      : new Uint8ClampedArray(frame.data ?? []);
    this.lastTimestamp = now;

    return processed;
  }

  getQueueLimit(): number {
    return this.maxQueueLength;
  }

  shouldBackpressure(queueLength: number): boolean {
    return queueLength >= this.maxQueueLength;
  }
}
