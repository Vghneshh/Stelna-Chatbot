/**
 * Signals Storage
 * Simple session storage for extracted signals
 */

class Signals {
  constructor() {
    this.data = {};
  }

  set(key, value) {
    this.data[key] = value;
  }

  get(key) {
    return this.data[key];
  }

  getAll() {
    return this.data;
  }
}

module.exports = Signals;
