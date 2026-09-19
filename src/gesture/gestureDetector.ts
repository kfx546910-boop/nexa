import type { HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { GestureName } from './gestureConfig';

export interface DetectedGesture {
  gesture: GestureName | 'none';
  confidence: number;
  index: { x: number; y: number } | null;
  landmarks: NormalizedLandmark[];
}

const distance = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(a.x - b.x, a.y - b.y);

export function detectGesture(result: HandLandmarkerResult, pinchThreshold: number): DetectedGesture {
  const landmarks = result.landmarks?.[0] || [];
  const confidence = result.handednesses?.[0]?.[0]?.score || 0;
  if (landmarks.length < 21) return { gesture: 'none', confidence, index: null, landmarks: [] };

  const index = landmarks[8];
  const fingerUp = (tip: number, pip: number) => landmarks[tip].y < landmarks[pip].y;
  const indexUp = fingerUp(8, 6);
  const middleUp = fingerUp(12, 10);
  const ringUp = fingerUp(16, 14);
  const pinkyUp = fingerUp(20, 18);
  const pinch = distance(landmarks[4], landmarks[8]) < pinchThreshold;
  const extended = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  let gesture: DetectedGesture['gesture'] = 'none';
  if (extended >= 3 && !pinch) gesture = 'open_palm';
  else if (!indexUp && !middleUp && !ringUp && !pinkyUp) gesture = 'fist';
  else if (pinch && indexUp) gesture = 'pinch';
  else if (indexUp && middleUp && !ringUp && !pinkyUp) gesture = 'two_fingers';
  else if (indexUp) gesture = 'index';

  return { gesture, confidence, index: { x: index.x, y: index.y }, landmarks };
}
