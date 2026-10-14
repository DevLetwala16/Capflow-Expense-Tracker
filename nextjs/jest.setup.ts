/**
 * jest.setup.ts
 *
 * Runs in every test environment (jsdom + node).
 * Restores globals that jsdom may shadow or omit.
 */

// jsdom can shadow Node's globalThis.structuredClone — restore it
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(val: T): T => JSON.parse(JSON.stringify(val));
}
