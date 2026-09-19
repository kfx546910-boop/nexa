import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { defaultGestureConfig, type GestureConfig, type GestureAction, type GestureName } from './gestureConfig';
import { detectGesture, type DetectedGesture } from './gestureDetector';
import { GestureSmoother } from './gestureSmoother';
import { CursorController } from './cursorController';

export type CameraStatus = 'OFF' | 'REQUESTING PERMISSION' | 'READY' | 'DENIED' | 'NOT FOUND' | 'ERROR';
export interface GestureStatus { camera: CameraStatus; hand: boolean; gesture: string; confidence: number; cursor: boolean; lastAction: string; emergency: boolean; }
export type GestureEvent = { gesture: GestureName; action: GestureAction; confidence: number };

export class GestureController {
  private config: GestureConfig = defaultGestureConfig;
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private frame = 0;
  private session = 0;
  private active = false;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private lastGesture: DetectedGesture['gesture'] = 'none';
  private activatedGesture: DetectedGesture['gesture'] = 'none';
  private stableFrames = 0;
  private lastActionAt = 0;
  private fistStartedAt = 0;
  private smoother = new GestureSmoother(5, 0.02);
  private cursor = new CursorController();
  private onStatus: (status: GestureStatus) => void;
  private onEvent: (event: GestureEvent) => void;
  private status: GestureStatus = { camera: 'OFF', hand: false, gesture: 'IDLE', confidence: 0, cursor: false, lastAction: 'NONE', emergency: false };

  constructor(onStatus: (status: GestureStatus) => void, onEvent: (event: GestureEvent) => void, config?: GestureConfig) {
    this.onStatus = onStatus;
    this.onEvent = onEvent;
    if (config) this.config = config;
    this.smoother = new GestureSmoother(this.config.settings.smoothingFrames, this.config.settings.deadZone);
  }

  async start(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    const session = ++this.session;
    this.active = true;
    this.video = video;
    this.canvas = canvas;
    this.updateStatus({ camera: 'REQUESTING PERMISSION', emergency: false });
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires localhost or HTTPS');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!this.active || session !== this.session) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      video.srcObject = stream;
      await video.play();
      if (!this.active || session !== this.session) return;
      this.updateStatus({ camera: 'READY' });
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
      const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
      let landmarker: HandLandmarker;
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: this.config.settings.confidence, minHandPresenceConfidence: this.config.settings.confidence, minTrackingConfidence: this.config.settings.confidence });
      } catch (gpuError) {
        console.warn('GPU hand tracking unavailable, using CPU:', gpuError);
        landmarker = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: this.config.settings.confidence, minHandPresenceConfidence: this.config.settings.confidence, minTrackingConfidence: this.config.settings.confidence });
      }
      if (!this.active || session !== this.session) { landmarker.close(); return; }
      this.landmarker = landmarker;
      this.processFrame();
    } catch (error) {
      if (!this.active || session !== this.session) return;
      this.stop('ERROR');
      const name = error instanceof DOMException && error.name === 'NotAllowedError' ? 'DENIED' : error instanceof DOMException && error.name === 'NotFoundError' ? 'NOT FOUND' : 'ERROR';
      this.updateStatus({ camera: name });
      throw error;
    }
  }

  private processFrame = () => {
    if (!this.active) return;
    if (!this.landmarker || !this.video || this.video.readyState < 2) { this.frame = requestAnimationFrame(this.processFrame); return; }
    try {
      const result = this.landmarker.detectForVideo(this.video, performance.now());
      const detected = detectGesture(result, this.config.settings.pinchThreshold);
      this.draw(detected);
      this.handleDetection(detected);
    } catch (error) {
      console.warn('Gesture frame processing stopped:', error);
      this.updateStatus({ camera: 'ERROR', hand: false, cursor: false, gesture: 'OFFLINE', lastAction: 'NONE' });
      this.stop();
      return;
    }
    if (this.active) this.frame = requestAnimationFrame(this.processFrame);
  };

  private handleDetection(detected: DetectedGesture) {
    const confident = detected.confidence >= this.config.settings.confidence && detected.gesture !== 'none';
    if (confident && detected.gesture === this.lastGesture) this.stableFrames += 1;
    else if (confident) { this.lastGesture = detected.gesture; this.stableFrames = 1; this.activatedGesture = 'none'; }
    else { this.lastGesture = 'none'; this.stableFrames = 0; if (detected.gesture === 'none' && !this.status.emergency) this.activatedGesture = 'none'; }
    if (detected.gesture === 'fist' && confident && this.status.emergency) this.clearEmergency();
    const smoothed = detected.index ? this.smoother.update(detected.index) : null;
    const cursorActive = detected.gesture === 'index' || detected.gesture === 'pinch';
    if (smoothed && cursorActive && !this.status.emergency && confident) this.cursor.move({ x: 1 - smoothed.x, y: smoothed.y }, this.config.settings.cursorSensitivity);
    if (detected.gesture === 'fist' && confident) { if (!this.fistStartedAt) this.fistStartedAt = Date.now(); }
    else this.fistStartedAt = 0;
    if (this.stableFrames >= this.config.settings.confirmationFrames && Date.now() - this.lastActionAt >= this.config.settings.cooldownMs && !this.status.emergency) {
      if (detected.gesture !== this.activatedGesture && (detected.gesture === 'pinch' || detected.gesture === 'two_fingers')) this.trigger(detected.gesture, detected.confidence);
      else if (detected.gesture === 'fist' && this.activatedGesture !== 'fist' && Date.now() - this.fistStartedAt >= this.config.settings.fistHoldMs) this.trigger('fist', detected.confidence);
    }
    this.updateStatus({ hand: confident, gesture: confident ? detected.gesture.toUpperCase() : 'IDLE', confidence: detected.confidence, cursor: cursorActive && confident && !this.status.emergency });
  }

  private trigger(gesture: GestureName, confidence: number) {
    const action = this.config.gestures[gesture];
    this.lastActionAt = Date.now();
    this.activatedGesture = gesture;
    if (gesture === 'pinch' && action === 'left_click') this.cursor.click();
    this.onEvent({ gesture, action, confidence });
    this.updateStatus({ lastAction: action.replace(/_/g, ' ').toUpperCase() });
  }

  emergencyStop(confidence = 1) {
    this.lastGesture = 'none'; this.stableFrames = 0; this.fistStartedAt = 0; this.lastActionAt = Date.now(); this.smoother.reset(); this.cursor.hide();
    this.updateStatus({ emergency: true, cursor: false, gesture: 'OPEN PALM', lastAction: 'EMERGENCY STOP' });
    this.onEvent({ gesture: 'open_palm', action: this.config.gestures.open_palm, confidence });
  }

  clearEmergency() { this.activatedGesture = 'none'; this.lastGesture = 'none'; this.smoother.reset(); this.updateStatus({ emergency: false, lastAction: 'NEUTRAL' }); }

  private draw(detected: DetectedGesture) {
    if (!this.canvas || !this.video) return;
    const context = this.canvas.getContext('2d'); if (!context) return;
    this.canvas.width = this.video.videoWidth || 640; this.canvas.height = this.video.videoHeight || 480; context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.config.settings.showLandmarks || detected.landmarks.length === 0) return;
    context.fillStyle = '#22d3ee'; for (const point of detected.landmarks) { context.beginPath(); context.arc(point.x * this.canvas.width, point.y * this.canvas.height, 4, 0, Math.PI * 2); context.fill(); }
  }

  private updateStatus(partial: Partial<GestureStatus>) { this.status = { ...this.status, ...partial }; this.onStatus(this.status); }

  stop(camera: CameraStatus = 'OFF') { this.active = false; this.session += 1; cancelAnimationFrame(this.frame); this.frame = 0; try { this.landmarker?.close(); } catch (error) { console.warn('Gesture tracker cleanup failed:', error); } this.landmarker = null; this.stream?.getTracks().forEach(track => track.stop()); this.stream = null; if (this.video) this.video.srcObject = null; this.cursor.hide(); this.activatedGesture = 'none'; this.updateStatus({ camera, hand: false, cursor: false, gesture: camera === 'ERROR' ? 'OFFLINE' : 'IDLE' }); }
}
