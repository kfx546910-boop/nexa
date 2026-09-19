export interface VisionSceneSummary {
  description: string;
  confidence: number;
}

export interface VisionContext {
  timestamp: number;
  objects: Array<{ label: string; confidence: number; boundingBox: { x: number; y: number; width: number; height: number } }>;
  text: string[];
  scene: VisionSceneSummary;
  privacy: {
    localOnly: boolean;
    sensitive: boolean;
    consented: boolean;
  };
}

export class VisionContextBuilder {
  static create(objects: Array<{ label: string; confidence: number; boundingBox: { x: number; y: number; width: number; height: number } }> = [], text: string[] = [], sceneDescription = 'Scene analysis is unavailable.', confidence = 0.7, localOnly = true): VisionContext {
    return {
      timestamp: Date.now(),
      objects,
      text,
      scene: {
        description: sceneDescription,
        confidence
      },
      privacy: {
        localOnly,
        sensitive: false,
        consented: true
      }
    };
  }
}
