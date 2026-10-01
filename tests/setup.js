import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { FakeWorker } from './support/fake-worker.js';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* Returns a minimal 16 kHz Float32Array buffer so audio-processing tests don't hang */
class MockAudioContext {
  constructor() { this.sampleRate = 16000; }
  async decodeAudioData() {
    return {
      getChannelData: () => new Float32Array(16000),
      duration: 1,
      numberOfChannels: 1,
      sampleRate: 16000,
    };
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

global.navigator.clipboard = {
  writeText: vi.fn(() => Promise.resolve()),
};

/* Workers are replaced by a fake that each test drives explicitly, so no test depends on a hidden auto-reply */
global.Worker = FakeWorker;

beforeEach(() => {
  FakeWorker.reset();
});

/* There is no layout in jsdom, so scrolling an option into view does nothing, and the worker tests have no DOM at all */
if (typeof Element !== 'undefined') Element.prototype.scrollIntoView = vi.fn();

Blob.prototype.arrayBuffer = vi.fn(function () {
  return Promise.resolve(new ArrayBuffer(1024));
});