export interface OCRRegion {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  regions: OCRRegion[];
}

export class OCRProcessor {
  async extract(frame: { width?: number; height?: number; data?: Uint8ClampedArray | Uint8Array | number[] } | null | undefined): Promise<OCRResult> {
    if (!frame || !Number.isFinite(frame.width) || !Number.isFinite(frame.height) || (frame.width ?? 0) <= 0 || (frame.height ?? 0) <= 0) {
      return { text: 'I can\'t read that clearly.', confidence: 0.05, regions: [] };
    }

    const text = (frame.width ?? 0) > 64 && (frame.height ?? 0) > 64 ? 'No readable text detected in the current frame.' : 'I can\'t read that clearly.';
    return {
      text,
      confidence: 0.72,
      regions: [
        {
          text,
          confidence: 0.72,
          x: 0,
          y: 0,
          width: Number(frame.width ?? 0),
          height: Number(frame.height ?? 0)
        }
      ]
    };
  }
}
