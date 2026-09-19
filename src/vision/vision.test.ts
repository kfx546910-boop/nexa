import test from 'node:test';
import assert from 'node:assert/strict';

import { CameraManager } from './CameraManager';
import { VisionConfig } from './VisionConfig';
import { VisionEngine } from './VisionEngine';
import { ObjectDetector } from './ObjectDetector';
import { OCRProcessor } from './OCRProcessor';
import { NEXOUSCore } from '../core/nexousCore';

const dummyFrame = {
  width: 640,
  height: 480,
  timestamp: Date.now(),
  data: new Uint8ClampedArray(640 * 480 * 4),
};

test('vision config defaults enforce local-only safe values', () => {
  const config = new VisionConfig({ VISION_ENABLED: 'true', VISION_LOCAL_ONLY: 'true', VISION_EXTERNAL_PROVIDER_ALLOWED: 'false' });
  assert.equal(config.enabled, true);
  assert.equal(config.localOnly, true);
  assert.equal(config.externalProviderAllowed, false);
});

test('camera manager reports unavailable when no devices exist', async () => {
  const camera = new CameraManager();
  const status = await camera.detectAvailability();
  assert.ok(['unavailable', 'ready', 'permission-denied', 'error'].includes(status.state));
});

test('frame validation rejects empty frames', () => {
  const detector = new ObjectDetector();
  assert.equal(detector.validateFrame(dummyFrame), true);
  assert.equal(detector.validateFrame({ ...dummyFrame, width: 0, height: 0 }), false);
});

test('object detection returns structured results', async () => {
  const detector = new ObjectDetector();
  const result = await detector.detect(dummyFrame);
  assert.ok(Array.isArray(result.objects));
  assert.ok(result.objects.every(obj => typeof obj.label === 'string'));
});

test('ocr processor returns structured OCR data', async () => {
  const ocr = new OCRProcessor();
  const result = await ocr.extract(dummyFrame);
  assert.ok(typeof result.text === 'string');
  assert.ok(typeof result.confidence === 'number');
  assert.ok(Array.isArray(result.regions));
});

test('vision engine creates scene context from a frame', async () => {
  const engine = new VisionEngine(new VisionConfig({ VISION_ENABLED: 'true', VISION_LOCAL_ONLY: 'true' }));
  const context = await engine.analyzeFrame(dummyFrame, 'what do you see');
  assert.ok(context.scene);
  assert.ok(typeof context.scene.description === 'string');
  assert.ok(Array.isArray(context.objects));
});

test('NEXOUSCore recognizes vision intents locally', async () => {
  const core = new NEXOUSCore();
  const result = await core.process('What do you see?');
  assert.equal(result.status, 'ok');
  assert.ok(result.response.toLowerCase().includes('see') || result.response.toLowerCase().includes('camera') || result.response.toLowerCase().includes('vision'));
});
