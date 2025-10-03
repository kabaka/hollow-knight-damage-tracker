import { describe, expect, it } from 'vitest';

import {
  formatDecimal,
  formatNumber,
  formatRelativeTime,
  formatStopwatch,
} from './format';

describe('format helpers', () => {
  describe('formatNumber', () => {
    it('uses locale-specific group separators', () => {
      const value = 1234567.89;
      expect(formatNumber(value)).toBe(value.toLocaleString());
    });
  });

  describe('formatDecimal', () => {
    it('formats to a single decimal place by default', () => {
      const value = 1234.567;
      const expected = value.toLocaleString(undefined, {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      });
      expect(formatDecimal(value)).toBe(expected);
    });

    it('formats to the specified precision', () => {
      const value = 98.7654;
      const expected = value.toLocaleString(undefined, {
        maximumFractionDigits: 3,
        minimumFractionDigits: 3,
      });
      expect(formatDecimal(value, 3)).toBe(expected);
    });

    it('returns an em dash for nullish or NaN values', () => {
      expect(formatDecimal(null)).toBe('—');
      expect(formatDecimal(Number.NaN)).toBe('—');
    });
  });

  describe('formatStopwatch', () => {
    it('returns an em dash for nullish or NaN values', () => {
      expect(formatStopwatch(null)).toBe('—');
      expect(formatStopwatch(Number.NaN)).toBe('—');
    });

    it('clamps zero or negative values', () => {
      expect(formatStopwatch(-100)).toBe('0:00.00');
      expect(formatStopwatch(0)).toBe('0:00.00');
    });

    it('formats positive durations', () => {
      expect(formatStopwatch(90320)).toBe('1:30.32');
      expect(formatStopwatch(60000)).toBe('1:00.00');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns an em dash when timing information is missing', () => {
      expect(formatRelativeTime(null, 1000)).toBe('—');
      expect(formatRelativeTime(1000, null)).toBe('—');
    });

    it('returns the elapsed time with two decimal places', () => {
      expect(formatRelativeTime(0, 2500)).toBe('2.50s');
    });

    it('does not return negative values', () => {
      expect(formatRelativeTime(1000, 500)).toBe('0.00s');
    });
  });
});
