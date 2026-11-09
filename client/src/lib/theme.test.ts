import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const theme = readFileSync(new URL('../index.css', import.meta.url), 'utf8').toLowerCase();

describe('premium editorial theme tokens', () => {
  it('defines the approved palette', () => {
    for (const token of ['#dde3e8', '#3a0f34', '#eaaa00', '#ffffff', '#241d27', '#66717d', '#c4cdd5']) {
      expect(theme).toContain(token);
    }
  });

  it('does not contain the rejected colours', () => {
    for (const rejected of ['#0b1220', '#080f1b', '#111c2e', '#172438', '#26364b', '#f1f5f9', '#a8b6c8', '#74849a', '#14b8a6', '#0d9488', '#60a5fa', '#22c55e', '#f59e0b', '#ef4444']) {
      expect(theme).not.toContain(rejected);
    }
  });

  it('keeps reduced-motion and focus-ring support', () => {
    expect(theme).toContain('prefers-reduced-motion');
    expect(theme).toContain('focus-visible');
  });
});
