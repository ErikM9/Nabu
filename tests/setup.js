import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { FakeWorker } from './support/fake-worker.js';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* jsdom has no AudioContext, so this stand-in decodes any file to one second of samples at the rate it was asked for */
class MockAudioContext {
  constructor({ sampleRate = 48000 } = {}) { this.sampleRate = sampleRate; }
  async decodeAudioData() {
    return { getChannelData: () => new Float32Array(this.sampleRate) };
  }
  close() {}
}

class MockMediaRecorder {
  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['mock-audio'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
  static isTypeSupported(type) {
    return ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg'].includes(type);
  }
}

const mockMediaStream = { getTracks: () => [{ stop: vi.fn() }] };

global.AudioContext = MockAudioContext;
global.MediaRecorder = MockMediaRecorder;

global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

global.navigator.mediaDevices = {
  getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
};

/* Workers are replaced by a fake that each test drives explicitly */
global.Worker = FakeWorker;

beforeEach(() => {
  FakeWorker.reset();
});

/* scrollIntoView does not exist in jsdom, and the worker tests have no Element at all */
if (typeof Element !== 'undefined') Element.prototype.scrollIntoView = vi.fn();

Blob.prototype.arrayBuffer = vi.fn(function () {
  return Promise.resolve(new ArrayBuffer(1024));
});