export type CameraState = 'unavailable' | 'ready' | 'permission-denied' | 'starting' | 'stopped' | 'reconnecting' | 'error';

export interface CameraStatus {
  state: CameraState;
  deviceId?: string;
  name?: string;
  ready: boolean;
  message: string;
  permissionGranted: boolean;
}

export interface CameraDevice {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private status: CameraStatus = {
    state: 'stopped',
    ready: false,
    message: 'Vision is disabled until explicitly enabled.',
    permissionGranted: false
  };

  constructor(private readonly constraints: MediaStreamConstraints = {
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  }) {}

  async detectAvailability(): Promise<CameraStatus> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      this.status = { state: 'unavailable', ready: false, message: 'Camera hardware is unavailable in this environment.', permissionGranted: false };
      return this.status;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      if (!cameras.length) {
        this.status = { state: 'unavailable', ready: false, message: 'No camera device was detected.', permissionGranted: false };
        return this.status;
      }

      this.status = { state: 'ready', ready: true, deviceId: cameras[0].deviceId, name: cameras[0].label || 'Camera', message: 'Camera detected and available.', permissionGranted: false };
      return this.status;
    } catch (error) {
      this.status = { state: 'error', ready: false, message: 'Unable to inspect camera devices.', permissionGranted: false };
      return this.status;
    }
  }

  async requestPermission(): Promise<CameraStatus> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.status = { state: 'permission-denied', ready: false, message: 'Camera access is not available in this environment.', permissionGranted: false };
      return this.status;
    }

    try {
      this.status = { state: 'starting', ready: false, message: 'Requesting camera permission…', permissionGranted: false };
      const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      this.stream = stream;
      this.status = { state: 'ready', ready: true, message: 'Camera permission granted and stream is active.', permissionGranted: true };
      return this.status;
    } catch (error) {
      this.status = { state: 'permission-denied', ready: false, message: 'Camera permission was denied. Enable access to use vision.', permissionGranted: false };
      return this.status;
    }
  }

  async start(videoElement?: HTMLVideoElement): Promise<CameraStatus> {
    if (videoElement) this.videoElement = videoElement;
    if (!this.stream) {
      const permissionResult = await this.requestPermission();
      if (!permissionResult.ready) return permissionResult;
    }

    if (this.videoElement && this.stream) {
      this.videoElement.srcObject = this.stream;
      this.videoElement.muted = true;
      await this.videoElement.play().catch(() => undefined);
    }

    this.status = { ...this.status, state: 'ready', ready: true, message: 'Camera stream is active.', permissionGranted: true };
    return this.status;
  }

  stop(): CameraStatus {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.status = { state: 'stopped', ready: false, message: 'Camera stream stopped.', permissionGranted: false };
    return this.status;
  }

  async reconnect(): Promise<CameraStatus> {
    this.stop();
    this.status = { state: 'reconnecting', ready: false, message: 'Reconnecting to the camera…', permissionGranted: false };
    return this.start(this.videoElement ?? undefined);
  }

  getStatus(): CameraStatus {
    return { ...this.status };
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  hasActiveStream(): boolean {
    return !!this.stream;
  }
}
