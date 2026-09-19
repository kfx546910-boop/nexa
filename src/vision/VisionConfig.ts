export interface VisionConfigOptions {
  VISION_ENABLED?: boolean | string;
  VISION_LOCAL_ONLY?: boolean | string;
  VISION_FPS?: number | string;
  VISION_RESOLUTION?: string;
  VISION_CONFIDENCE_THRESHOLD?: number | string;
  VISION_OCR_ENABLED?: boolean | string;
  VISION_OBJECT_DETECTION_ENABLED?: boolean | string;
  VISION_TRACKING_ENABLED?: boolean | string;
  VISION_EXTERNAL_PROVIDER_ALLOWED?: boolean | string;
}

export class VisionConfig {
  enabled: boolean;
  localOnly: boolean;
  fps: number;
  resolution: string;
  confidenceThreshold: number;
  ocrEnabled: boolean;
  objectDetectionEnabled: boolean;
  trackingEnabled: boolean;
  externalProviderAllowed: boolean;

  constructor(options: VisionConfigOptions = {}) {
    const read = (key: keyof VisionConfigOptions, fallback: boolean | number | string) => {
      const value = options[key];
      if (value === undefined) return fallback;
      if (typeof value === 'string') {
        if (value === 'true') return true;
        if (value === 'false') return false;
        const asNumber = Number(value);
        if (!Number.isNaN(asNumber)) return asNumber;
        return value;
      }
      return value;
    };

    this.enabled = Boolean(read('VISION_ENABLED', false));
    this.localOnly = Boolean(read('VISION_LOCAL_ONLY', true));
    this.fps = Number(read('VISION_FPS', 10));
    this.resolution = String(read('VISION_RESOLUTION', '1280x720'));
    this.confidenceThreshold = Number(read('VISION_CONFIDENCE_THRESHOLD', 0.7));
    this.ocrEnabled = Boolean(read('VISION_OCR_ENABLED', true));
    this.objectDetectionEnabled = Boolean(read('VISION_OBJECT_DETECTION_ENABLED', true));
    this.trackingEnabled = Boolean(read('VISION_TRACKING_ENABLED', true));
    this.externalProviderAllowed = Boolean(read('VISION_EXTERNAL_PROVIDER_ALLOWED', false));

    if (!Number.isFinite(this.fps) || this.fps <= 0) this.fps = 10;
    if (this.confidenceThreshold < 0 || this.confidenceThreshold > 1) this.confidenceThreshold = 0.7;
  }

  static fromProcessEnv(env: Record<string, string | undefined> = {}): VisionConfig {
    return new VisionConfig({
      VISION_ENABLED: env.VISION_ENABLED,
      VISION_LOCAL_ONLY: env.VISION_LOCAL_ONLY,
      VISION_FPS: env.VISION_FPS,
      VISION_RESOLUTION: env.VISION_RESOLUTION,
      VISION_CONFIDENCE_THRESHOLD: env.VISION_CONFIDENCE_THRESHOLD,
      VISION_OCR_ENABLED: env.VISION_OCR_ENABLED,
      VISION_OBJECT_DETECTION_ENABLED: env.VISION_OBJECT_DETECTION_ENABLED,
      VISION_TRACKING_ENABLED: env.VISION_TRACKING_ENABLED,
      VISION_EXTERNAL_PROVIDER_ALLOWED: env.VISION_EXTERNAL_PROVIDER_ALLOWED
    });
  }
}

export const DEFAULT_VISION_CONFIG = new VisionConfig({
  VISION_ENABLED: 'false',
  VISION_LOCAL_ONLY: 'true',
  VISION_FPS: '10',
  VISION_RESOLUTION: '1280x720',
  VISION_CONFIDENCE_THRESHOLD: '0.7',
  VISION_OCR_ENABLED: 'true',
  VISION_OBJECT_DETECTION_ENABLED: 'true',
  VISION_TRACKING_ENABLED: 'true',
  VISION_EXTERNAL_PROVIDER_ALLOWED: 'false'
});
