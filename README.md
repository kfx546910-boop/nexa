# NEXUS AI

NEXUS is a local-first neural AI terminal for chat, dataset curation, training, memory, and benchmarks. Gesture control is an optional JARVIS-style input layer; the existing keyboard, mouse, chat, training, and navigation controls always remain available.

## Requirements

- Node.js 18 or newer
- A modern Chromium, Firefox, or Safari browser
- Webcam access for gesture control
- Secure context for camera access: `localhost` works during development; deployed builds should use HTTPS

## Installation and Running

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:3000/`. Build a production bundle with `npm run build`, or run the type checker with `npm run lint`.

## Capabilities and Firebase

The **Capabilities** tab includes Firebase Auth and Firestore, image input, and browser speech transcription. To enable Firebase anonymous authentication and capability event storage, create `.env.local` with the values from your Firebase web app:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Enable **Anonymous** sign-in in Firebase Authentication and create the `capabilityEvents` Firestore collection/rules. Gemini Live, Nano Banana 2, Veo, Search Grounding, and Maps Grounding require provider credentials and server-side endpoints before their actions can be enabled.

## Enabling Gesture Control

Gesture control starts **OFF**. Use the `GESTURE CONTROL` panel in the lower-right corner and turn it on. Camera permission is requested only at that point. The preview can be hidden without stopping tracking. Press `G` outside text fields to toggle the subsystem, `E` for an emergency stop, and `C` to toggle the preview.

The panel reports camera state, hand detection, current gesture, confidence, cursor state, last action, and emergency state. If the camera or MediaPipe model cannot load, NEXUS stays fully usable and the panel reports the failure.

## Supported Gestures

| Gesture | Default Action |
| --- | --- |
| Index finger up | Cursor |
| Thumb + index pinch | Click |
| Index + middle fingers | Custom action (switches Chat/Visualizer by default) |
| Closed fist | Toggle action (hold-confirmed) |
| Open palm | Emergency / neutral |

The virtual cursor is intentionally an overlay and dispatches a click only to the element beneath it. It does not attempt to move the operating-system pointer.

## Configuration

Gesture defaults live in `src/gesture/gestureConfig.ts`. The central configuration includes action mappings and:

- Confidence threshold: `0.75`
- Smoothing frames: `5`
- Cursor sensitivity: `1.0`
- Dead zone: `0.02`
- Confirmation frames: `3`
- Click debounce and cooldown: `400ms` / `500ms`
- Pinch threshold: `0.07`
- Fist hold duration: `900ms`
- Optional camera preview, landmarks, and debug display

Actions are dispatched from `GestureController` through the `onGestureEvent` callback and also as `nexus:gesture` window events. Add application behavior in `App.tsx` rather than hardcoding actions in the detector.

## Emergency Stop

Open palm immediately hides the virtual cursor, cancels pending gesture activation, stops NEXUS training, and enters a latched safety state. Holding the palm does not repeat the event. Use `RESET SAFETY` in the panel after the hand is neutral, or turn gesture control off and on again.

## Troubleshooting

- **CAMERA: DENIED**: Allow camera access for the site in browser permissions, then toggle gesture control off and on.
- **CAMERA: NOT FOUND**: Connect a webcam and reload the page.
- **CAMERA: ERROR**: Check whether another application is using the webcam and confirm the page is served from `localhost` or HTTPS.
- **GESTURE CONTROL does not start**: Check the browser console and network access to the MediaPipe WASM runtime and hand-landmarker model. The rest of NEXUS does not depend on either resource.
- **Cursor feels noisy**: Increase `smoothingFrames` or `deadZone` slightly. If it feels delayed, lower them. Keep the confidence threshold at or above `0.75` for safe activation.

## Performance and Extension

The tracker uses one hand, GPU delegation when available, a `requestAnimationFrame` processing loop, bounded state, confidence filtering, and cleanup of camera tracks and animation resources. The detector and controller are separate so two-hand support or new gestures can be added without changing NEXUS feature components.

To add a gesture, extend `GestureName`, classify it in `src/gesture/gestureDetector.ts`, add its action to `GestureConfig`, then handle the action in the central `App.tsx` dispatcher. Keep actions transition-based and require confirmation, release, and cooldown behavior.
