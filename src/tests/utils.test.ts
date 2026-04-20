/**
 * Unit tests for canvas utility functions and element validation logic.
 * Covers: getElementRect, rectIntersect, isPointInside, validateElement, isRateLimited.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CanvasElement } from '../types';

// ─── Utility functions extracted for testability ─────────────────────────────

const getElementRect = (el: CanvasElement) => {
  if (el.type === 'circle') {
    return { x: el.x, y: el.y, width: (el.radius || 0) * 2, height: (el.radius || 0) * 2 };
  }
  if ((el.type === 'line' || el.type === 'arrow') && el.points && el.points.length >= 4) {
    const xPoints = el.points.filter((_, i) => i % 2 === 0);
    const yPoints = el.points.filter((_, i) => i % 2 !== 0);
    const minX = Math.min(...xPoints);
    const maxX = Math.max(...xPoints);
    const minY = Math.min(...yPoints);
    const maxY = Math.max(...yPoints);
    return {
      x: el.x + minX,
      y: el.y + minY,
      width: Math.max(el.width || 0, maxX - minX, 1),
      height: Math.max(el.height || 0, maxY - minY, 1),
    };
  }
  return { x: el.x, y: el.y, width: el.width || 0, height: el.height || 0 };
};

const rectIntersect = (r1: any, r2: any) => {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
};

const isPointInside = (x: number, y: number, el: CanvasElement) => {
  const rect = getElementRect(el);
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
};

// Mirrored from server.ts for unit testing
const validateElement = (el: any): boolean => {
  if (!el || typeof el !== 'object') return false;
  if (typeof el.id !== 'string') return false;
  if (typeof el.type !== 'string') return false;
  if (typeof el.x !== 'number' || typeof el.y !== 'number') return false;
  if (JSON.stringify(el).length > 2000000) return false;
  return true;
};

// Mirrored from server.ts
const createRateLimiter = () => {
  const socketRateLimits = new Map<string, number[]>();
  return (socketId: string, limit: number, windowMs: number): boolean => {
    const now = Date.now();
    let timestamps = socketRateLimits.get(socketId) || [];
    timestamps = timestamps.filter((t) => now - t < windowMs);
    if (timestamps.length >= limit) return true;
    timestamps.push(now);
    socketRateLimits.set(socketId, timestamps);
    return false;
  };
};

// ─── makeElement helper ───────────────────────────────────────────────────────

const makeElement = (overrides: Partial<CanvasElement> = {}): CanvasElement => ({
  id: 'test-id',
  type: 'rect',
  x: 10,
  y: 10,
  width: 100,
  height: 80,
  stroke: '#000',
  strokeWidth: 2,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getElementRect', () => {
  it('returns bounding box for a rect element', () => {
    const el = makeElement({ x: 50, y: 60, width: 200, height: 100 });
    expect(getElementRect(el)).toEqual({ x: 50, y: 60, width: 200, height: 100 });
  });

  it('returns bounding box for a circle using radius', () => {
    const el = makeElement({ type: 'circle', x: 100, y: 100, radius: 40 });
    expect(getElementRect(el)).toEqual({ x: 100, y: 100, width: 80, height: 80 });
  });

  it('returns bounding box for a circle with radius 0', () => {
    const el = makeElement({ type: 'circle', x: 0, y: 0, radius: 0 });
    expect(getElementRect(el)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('returns bounding box for a line element using points', () => {
    const el = makeElement({
      type: 'line',
      x: 10,
      y: 10,
      points: [0, 0, 100, 50],
    });
    const rect = getElementRect(el);
    expect(rect.width).toBeGreaterThanOrEqual(100);
    expect(rect.height).toBeGreaterThanOrEqual(50);
  });

  it('returns bounding box for an arrow element using points', () => {
    const el = makeElement({
      type: 'arrow',
      x: 5,
      y: 5,
      points: [0, 0, 200, 150],
    });
    const rect = getElementRect(el);
    expect(rect.width).toBeGreaterThanOrEqual(200);
    expect(rect.height).toBeGreaterThanOrEqual(150);
  });

  it('defaults width/height of missing dimensions to 0', () => {
    const el = makeElement({ width: undefined, height: undefined });
    expect(getElementRect(el)).toEqual({ x: 10, y: 10, width: 0, height: 0 });
  });
});

describe('rectIntersect', () => {
  it('returns true for overlapping rectangles', () => {
    const r1 = { x: 0, y: 0, width: 100, height: 100 };
    const r2 = { x: 50, y: 50, width: 100, height: 100 };
    expect(rectIntersect(r1, r2)).toBe(true);
  });

  it('returns false for non-overlapping rectangles (right side)', () => {
    const r1 = { x: 0, y: 0, width: 50, height: 50 };
    const r2 = { x: 100, y: 0, width: 50, height: 50 };
    expect(rectIntersect(r1, r2)).toBe(false);
  });

  it('returns false for non-overlapping rectangles (below)', () => {
    const r1 = { x: 0, y: 0, width: 50, height: 50 };
    const r2 = { x: 0, y: 100, width: 50, height: 50 };
    expect(rectIntersect(r1, r2)).toBe(false);
  });

  it('returns true for a rectangle fully inside another', () => {
    const r1 = { x: 0, y: 0, width: 200, height: 200 };
    const r2 = { x: 50, y: 50, width: 50, height: 50 };
    expect(rectIntersect(r1, r2)).toBe(true);
  });

  it('returns true for touching rectangles (shared edge)', () => {
    const r1 = { x: 0, y: 0, width: 100, height: 100 };
    const r2 = { x: 100, y: 0, width: 100, height: 100 };
    // Touching at x=100 edge – not strictly overlapping but edge-case
    expect(rectIntersect(r1, r2)).toBe(true);
  });

  it('returns true for identical rectangles', () => {
    const r = { x: 10, y: 10, width: 80, height: 80 };
    expect(rectIntersect(r, r)).toBe(true);
  });
});

describe('isPointInside', () => {
  it('returns true for a point inside a rect', () => {
    const el = makeElement({ x: 0, y: 0, width: 100, height: 100 });
    expect(isPointInside(50, 50, el)).toBe(true);
  });

  it('returns false for a point outside a rect', () => {
    const el = makeElement({ x: 0, y: 0, width: 100, height: 100 });
    expect(isPointInside(150, 150, el)).toBe(false);
  });

  it('returns true for a point on the boundary', () => {
    const el = makeElement({ x: 0, y: 0, width: 100, height: 100 });
    expect(isPointInside(100, 100, el)).toBe(true);
  });

  it('returns true for a point inside a circle bounding box', () => {
    const el = makeElement({ type: 'circle', x: 0, y: 0, radius: 50 });
    expect(isPointInside(50, 50, el)).toBe(true);
  });
});

describe('validateElement (server logic)', () => {
  it('accepts a valid element', () => {
    expect(validateElement({ id: 'abc', type: 'rect', x: 0, y: 0 })).toBe(true);
  });

  it('rejects null', () => {
    expect(validateElement(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(validateElement('string')).toBe(false);
  });

  it('rejects element with missing id', () => {
    expect(validateElement({ type: 'rect', x: 0, y: 0 })).toBe(false);
  });

  it('rejects element with numeric id', () => {
    expect(validateElement({ id: 123, type: 'rect', x: 0, y: 0 })).toBe(false);
  });

  it('rejects element with missing type', () => {
    expect(validateElement({ id: 'abc', x: 0, y: 0 })).toBe(false);
  });

  it('rejects element with non-number coordinates', () => {
    expect(validateElement({ id: 'abc', type: 'rect', x: '0', y: 0 })).toBe(false);
    expect(validateElement({ id: 'abc', type: 'rect', x: 0, y: '0' })).toBe(false);
  });

  it('rejects oversized element payload', () => {
    const huge = {
      id: 'abc',
      type: 'rect',
      x: 0,
      y: 0,
      data: 'x'.repeat(2000001),
    };
    expect(validateElement(huge)).toBe(false);
  });
});

describe('isRateLimited (server logic)', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 5; i++) {
      expect(limiter('socket-1', 10, 1000)).toBe(false);
    }
  });

  it('blocks after exceeding the limit', () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 10; i++) {
      limiter('socket-2', 10, 1000);
    }
    expect(limiter('socket-2', 10, 1000)).toBe(true);
  });

  it('tracks different sockets independently', () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 10; i++) {
      limiter('socket-A', 10, 1000);
    }
    // socket-B should NOT be rate limited
    expect(limiter('socket-B', 10, 1000)).toBe(false);
  });

  it('resets after window expires', async () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 3; i++) {
      limiter('socket-3', 3, 10); // 10ms window
    }
    expect(limiter('socket-3', 3, 10)).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(limiter('socket-3', 3, 10)).toBe(false);
  });
});
