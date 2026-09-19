import React from 'react';
import { Camera, KeyRound, LockKeyhole, RefreshCw, ScanFace } from 'lucide-react';
import { CameraManager } from '../vision/CameraManager';
import { useOwnerLock } from './ownerLock';

export const OwnerLockScreen: React.FC = () => {
  const { state, canAttemptUnlock, verifyFace, verifyPin } = useOwnerLock();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const cameraRef = React.useRef<CameraManager | null>(null);
  const [pin, setPin] = React.useState('');
  const [showPin, setShowPin] = React.useState(false);
  const [scanMessage, setScanMessage] = React.useState('Camera permission is required to begin.');
  const [scanning, setScanning] = React.useState(false);
  const authenticating = state === 'AUTHENTICATING';
  const failed = state === 'AUTH_FAILED' || state === 'SESSION_EXPIRED';

  React.useEffect(() => () => {
    cameraRef.current?.stop();
  }, []);

  const scanFace = async () => {
    setScanning(true);
    setScanMessage('Starting front camera...');
    const camera = new CameraManager();
    cameraRef.current = camera;
    const result = await camera.start(videoRef.current ?? undefined);
    if (!result.ready) {
      setScanMessage(result.message);
      setScanning(false);
      return;
    }
    setScanMessage('Face scan complete. Continue with your PIN.');
    setScanning(false);
    verifyFace();
  };

  const submitPin = (event: React.FormEvent) => {
    event.preventDefault();
    verifyPin(pin);
    setPin('');
  };

  return (
    <main className="nexa-owner-lock" aria-labelledby="owner-lock-title">
      <div className="nexa-owner-lock-panel">
        <div className="nexa-owner-lock-mark" aria-hidden="true"><LockKeyhole className="h-8 w-8" /></div>
        <span className="nexa-owner-lock-kicker">NEXA // OWNER LOCK</span>
        <h1 id="owner-lock-title">NEXA</h1>
        <p className="nexa-owner-lock-state">{state === 'FACE_SCAN' ? 'STEP 1 // FACE SCAN' : state === 'PIN' ? 'STEP 2 // PIN' : state === 'UNLOCKED' ? 'ACCESS GRANTED' : failed ? 'ACCESS DENIED' : 'OWNER LOCKED'}</p>
        <p className="nexa-owner-lock-copy">
          {failed ? 'The PIN or owner session could not be verified.' : state === 'FACE_SCAN' ? 'Scan your face first to activate the Nexa lock.' : state === 'PIN' ? 'Enter your Nexa PIN to continue.' : 'Verify the authorized Supabase owner session to continue.'}
        </p>
        {(state === 'FACE_SCAN' || failed) && !showPin && <>
          <video ref={videoRef} className="nexa-owner-lock-video" autoPlay muted playsInline aria-label="Live face scan camera" />
          <p className="nexa-owner-lock-scan-message">{scanMessage}</p>
          <button type="button" className="nexa-owner-lock-button" onClick={() => void scanFace()} disabled={scanning}>
            {scanning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
            {scanning ? 'SCANNING...' : 'SCAN FACE FIRST'}
          </button>
          <button type="button" className="nexa-owner-lock-secondary" onClick={() => setShowPin(true)}>
            USE PIN INSTEAD
          </button>
        </>}
        {(state === 'PIN' || showPin) && <form onSubmit={submitPin} className="nexa-owner-lock-pin-form">
          <label htmlFor="nexa-pin">NEXA PIN</label>
          <input id="nexa-pin" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} autoFocus />
          <button type="submit" className="nexa-owner-lock-button" disabled={pin.length !== 4}>
            <KeyRound className="h-4 w-4" /> VERIFY PIN
          </button>
        </form>}
        {authenticating && <p className="nexa-owner-lock-copy"><RefreshCw className="inline h-4 w-4 animate-spin" /> Verifying owner session...</p>}
        {!canAttemptUnlock && state === 'PIN' && <p className="nexa-owner-lock-note">Owner session configuration is unavailable.</p>}
        <p className="nexa-owner-lock-note"><Camera className="inline h-3 w-3" /> Face scan uses the local camera only. No face image is stored.</p>
      </div>
    </main>
  );
};