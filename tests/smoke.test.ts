import { describe, it, expect } from 'vitest';

describe('Tooling & environment smoke test', () => {
  it('should run tests in a jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    const div = document.createElement('div');
    div.textContent = 'Hello Markdown Live Preview';
    expect(div.textContent).toBe('Hello Markdown Live Preview');
  });
});
