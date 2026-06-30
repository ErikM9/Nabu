import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

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

/* Responds to postMessage with a LOADING success event so tests reach post-load render states */
class MockWorker {
  constructor() {
    this.listeners = new Map();
  }
  postMessage() {
    setTimeout(() => {
      const handlers = this.listeners.get('message');
      if (handlers) {
        handlers.forEach(h => h({ data: { type: 'LOADING', status: 'success' } }));
      }
    }, 10);
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  removeEventListener(type, handler) {
    const handlers = this.listeners.get(type);
    if (handlers) {
      const i = handlers.indexOf(handler);
      if (i > -1) handlers.splice(i, 1);
    }
  }
  terminate() {}
}

global.Worker = MockWorker;

Blob.prototype.arrayBuffer = vi.fn(function () {
  return Promise.resolve(new ArrayBuffer(1024));
});