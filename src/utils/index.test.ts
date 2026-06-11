import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeCountdown } from './index';

describe('computeCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates countdown correctly before deadline', () => {
    // Mock current time: 2026-06-11T12:00:00Z
    const mockNow = new Date('2026-06-11T12:00:00.000Z');
    vi.setSystemTime(mockNow);

    const targetDateISO = '2026-06-12T12:00:00.000Z'; // exactly 24 hours later
    const createdAtISO = '2026-06-10T12:00:00.000Z';  // exactly 24 hours earlier

    const result = computeCountdown(targetDateISO, createdAtISO);

    expect(result.days).toBe(1);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
    expect(result.isExpired).toBe(false);
    expect(result.totalSeconds).toBe(86400);
    expect(result.progressPercent).toBeCloseTo(50, 1); // 50% elapsed (1 day of 2)
  });

  it('handles expired/past deadline correctly', () => {
    const mockNow = new Date('2026-06-11T13:00:00.000Z');
    vi.setSystemTime(mockNow);

    const targetDateISO = '2026-06-11T12:00:00.000Z'; // 1 hour ago
    const createdAtISO = '2026-06-10T12:00:00.000Z';

    const result = computeCountdown(targetDateISO, createdAtISO);

    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
    expect(result.isExpired).toBe(true);
    expect(result.totalSeconds).toBe(0);
    expect(result.progressPercent).toBe(100);
  });
});
