export type GestureName = 'index' | 'pinch' | 'two_fingers' | 'fist' | 'open_palm';
export type GestureAction = 'cursor_control' | 'left_click' | 'custom_action' | 'toggle_control' | 'emergency_stop' | 'none';

export interface GestureConfig {
  enabled: boolean;
  gestures: Record<GestureName, GestureAction>;
  settings: {
    confidence: number;
    smoothingFrames: number;
    cursorSensitivity: number;
    deadZone: number;
    debounceMs: number;
    cooldownMs: number;
    pinchThreshold: number;
    confirmationFrames: number;
    fistHoldMs: number;
    showLandmarks: boolean;
    showCameraPreview: boolean;
    showGestureDebug: boolean;
  };
}

export const defaultGestureConfig: GestureConfig = {
  enabled: false,
  gestures: {
    index: 'cursor_control',
    pinch: 'left_click',
    two_fingers: 'custom_action',
    fist: 'toggle_control',
    open_palm: 'emergency_stop'
  },
  settings: {
    confidence: 0.75,
    smoothingFrames: 5,
    cursorSensitivity: 1,
    deadZone: 0.02,
    debounceMs: 400,
    cooldownMs: 500,
    pinchThreshold: 0.07,
    confirmationFrames: 3,
    fistHoldMs: 900,
    showLandmarks: true,
    showCameraPreview: true,
    showGestureDebug: false
  }
};
