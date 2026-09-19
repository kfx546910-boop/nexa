import { CameraManager } from './CameraManager';
import { FrameProcessor } from './FrameProcessor';
import { ObjectDetector } from './ObjectDetector';
import { ObjectTracker } from './ObjectTracker';
import { OCRProcessor } from './OCRProcessor';
import { VisionConfig } from './VisionConfig';
import { VisionContextBuilder, type VisionContext } from './VisionContext';

export interface VisionIntentDescriptor {
  kind: 'what_do_you_see' | 'read' | 'find_object' | 'describe_scene' | 'count_people' | 'unknown';
  target?: string;
  confidence: number;
}

export class VisionIntentRouter {
  route(input: string): VisionIntentDescriptor {
    const lower = input.toLowerCase();
    if (/(what do you see|describe the scene|what is in front of me|what is this|look at this)/i.test(lower)) return { kind: 'what_do_you_see', confidence: 0.95 };
    if (/(read this|read the screen|what does this document say|read the document)/i.test(lower)) return { kind: 'read', confidence: 0.95 };
    if (/(find the phone|where is my phone|find my phone|is there a person here|how many people are there)/i.test(lower)) return { kind: lower.includes('person') || lower.includes('people') ? 'count_people' : 'find_object', target: lower.includes('phone') ? 'phone' : undefined, confidence: 0.9 };
    return { kind: 'unknown', confidence: 0.2 };
  }
}

export class VisionEngine {
  public readonly config: VisionConfig;
  private readonly camera = new CameraManager();
  private readonly frameProcessor: FrameProcessor;
  private readonly detector: ObjectDetector;
  private readonly ocr: OCRProcessor;
  private readonly tracker: ObjectTracker;

  constructor(config: VisionConfig = new VisionConfig()) {
    this.config = config;
    this.frameProcessor = new FrameProcessor(config.fps);
    this.detector = new ObjectDetector(config.confidenceThreshold);
    this.ocr = new OCRProcessor();
    this.tracker = new ObjectTracker();
  }

  async analyzeFrame(frame: any, userPrompt = ''): Promise<VisionContext> {
    if (!this.config.enabled) {
      return VisionContextBuilder.create([], [], 'Vision is disabled until the user explicitly enables it.', 0.4, this.config.localOnly);
    }

    const processed = this.frameProcessor.process(frame, Date.now());
    if (!processed) {
      return VisionContextBuilder.create([], [], 'I can\'t process the current frame. Please retry or check the camera.', 0.2, this.config.localOnly);
    }

    const detection = await this.detector.detect(frame);
    const tracked = this.tracker.update(detection.objects, Date.now());
    const ocr = await this.ocr.extract(frame);
    const route = new VisionIntentRouter().route(userPrompt || 'what do you see');
    const description = route.kind === 'read'
      ? (ocr.text || 'I can\'t read that clearly.')
      : detection.objects.length
        ? `I can see ${detection.objects.map(item => item.label).join(', ')} with ${detection.objects[0]?.confidence ?? 0.7} confidence.`
        : 'I can\'t detect a clear object in the current frame.';

    return VisionContextBuilder.create(
      detection.objects,
      [ocr.text],
      description,
      Math.max(0.1, detection.objects[0]?.confidence ?? 0.55),
      this.config.localOnly
    );
  }

  async detectCamera(): Promise<{ state: string; message: string }> {
    const status = await this.camera.detectAvailability();
    return { state: status.state, message: status.message };
  }

  async ensureCamera(): Promise<boolean> {
    if (!this.config.enabled) return false;
    const detection = await this.camera.detectAvailability();
    if (detection.state === 'unavailable' || detection.state === 'permission-denied') {
      return false;
    }
    return true;
  }

  getFrameQueueLimit(): number {
    return this.frameProcessor.getQueueLimit();
  }
}
