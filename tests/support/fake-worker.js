/* Stands in for a Web Worker, recording what the page sends and letting a test answer as the real worker would */
export class FakeWorker {
  static instances = [];

  constructor(url, options) {
    this.url = String(url);
    this.options = options;
    this.posted = [];
    this.listeners = { message: [], error: [] };
    this.terminated = false;
    FakeWorker.instances.push(this);
  }

  postMessage(message) {
    this.posted.push(message);
  }

  addEventListener(type, handler) {
    (this.listeners[type] ??= []).push(handler);
  }

  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] ?? []).filter(h => h !== handler);
  }

  terminate() {
    this.terminated = true;
  }

  /* Delivers a message to the page as if the worker had posted it */
  emit(data) {
    this.listeners.message.forEach(handler => handler({ data }));
  }

  /* Raises the error event a worker fires when its script cannot load or run */
  fail() {
    this.listeners.error.forEach(handler => handler(new Event('error')));
  }

  static reset() {
    FakeWorker.instances = [];
  }

  static latest(name) {
    return FakeWorker.instances.filter(worker => worker.url.includes(name)).at(-1);
  }
}