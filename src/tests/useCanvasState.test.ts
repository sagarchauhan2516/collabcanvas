/**
 * Unit tests for the useCanvasState hook.
 * Verifies history management, undo/redo, and property updates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasState } from '../hooks/useCanvasState';
import type { CanvasElement } from '../types';

const makeEl = (id: string, x = 0, y = 0): CanvasElement => ({
  id,
  type: 'rect',
  x,
  y,
  width: 100,
  height: 50,
  stroke: '#000',
  strokeWidth: 2,
  fill: '#fff',
});

describe('useCanvasState – initial state', () => {
  it('initializes with empty elements and no selection', () => {
    const { result } = renderHook(() => useCanvasState());
    expect(result.current.elements).toEqual([]);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.historyStep).toBe(-1);
  });

  it('starts with select tool', () => {
    const { result } = renderHook(() => useCanvasState());
    expect(result.current.tool).toBe('select');
  });

  it('starts with default color', () => {
    const { result } = renderHook(() => useCanvasState());
    expect(result.current.color).toBe('#212529');
  });
});

describe('useCanvasState – addToHistory', () => {
  it('adds elements to history', () => {
    const { result } = renderHook(() => useCanvasState());
    const el = makeEl('el-1');

    act(() => {
      result.current.addToHistory([el]);
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toEqual([el]);
  });

  it('increments historyStep on each add', () => {
    const { result } = renderHook(() => useCanvasState());

    act(() => {
      result.current.addToHistory([makeEl('el-1')]);
    });
    act(() => {
      result.current.addToHistory([makeEl('el-2')]);
    });

    expect(result.current.historyStep).toBe(1);
  });

  it('truncates future history when a new action is taken after undo', () => {
    const { result } = renderHook(() => useCanvasState());
    const mockSocket = { emit: vi.fn() };

    act(() => result.current.addToHistory([makeEl('a')]));
    act(() => result.current.addToHistory([makeEl('b')]));
    act(() => result.current.addToHistory([makeEl('c')]));

    // Undo twice
    act(() => result.current.undo(mockSocket));
    act(() => result.current.undo(mockSocket));

    // Add a new branch
    act(() => result.current.addToHistory([makeEl('d')]));

    // History should have been truncated + new item added
    expect(result.current.history).toHaveLength(2);
  });

  it('caps history at 50 entries', () => {
    const { result } = renderHook(() => useCanvasState());

    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.addToHistory([makeEl(`el-${i}`)]);
      }
    });

    expect(result.current.history.length).toBeLessThanOrEqual(50);
  });

  it('stores a deep copy of elements (immutable snapshot)', () => {
    const { result } = renderHook(() => useCanvasState());
    const el = makeEl('mutable', 10, 10);

    act(() => result.current.addToHistory([el]));

    // Mutate the original object
    el.x = 999;

    // History snapshot should be unaffected
    expect(result.current.history[0][0].x).toBe(10);
  });
});

describe('useCanvasState – undo/redo', () => {
  it('does not undo if at step 0', () => {
    const { result } = renderHook(() => useCanvasState());
    const mockSocket = { emit: vi.fn() };

    act(() => result.current.addToHistory([makeEl('el-1')]));
    act(() => result.current.undo(mockSocket));

    // Still at 0
    expect(result.current.historyStep).toBe(0);
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('restores previous state on undo', () => {
    const { result } = renderHook(() => useCanvasState());
    const mockSocket = { emit: vi.fn() };

    const elA = makeEl('a', 10, 10);
    const elB = makeEl('b', 20, 20);

    act(() => {
      result.current.addToHistory([elA]);
      result.current.setElements([elA]);
    });
    act(() => {
      result.current.addToHistory([elA, elB]);
      result.current.setElements([elA, elB]);
    });

    act(() => result.current.undo(mockSocket));

    expect(result.current.historyStep).toBe(0);
    expect(mockSocket.emit).toHaveBeenCalledWith('canvas:sync', [elA]);
  });

  it('restores next state on redo', () => {
    const { result } = renderHook(() => useCanvasState());
    const mockSocket = { emit: vi.fn() };

    const elA = makeEl('a');
    const elB = makeEl('b', 30, 30);

    act(() => {
      result.current.addToHistory([elA]);
      result.current.setElements([elA]);
    });
    act(() => {
      result.current.addToHistory([elA, elB]);
      result.current.setElements([elA, elB]);
    });

    act(() => result.current.undo(mockSocket));
    act(() => result.current.redo(mockSocket));

    expect(result.current.historyStep).toBe(1);
    expect(mockSocket.emit).toHaveBeenLastCalledWith('canvas:sync', [elA, elB]);
  });

  it('does not redo past the last history step', () => {
    const { result } = renderHook(() => useCanvasState());
    const mockSocket = { emit: vi.fn() };

    act(() => {
      result.current.addToHistory([makeEl('el-1')]);
      result.current.setElements([makeEl('el-1')]);
    });

    // Already at the last step – redo should be a no-op
    act(() => result.current.redo(mockSocket));
    expect(result.current.historyStep).toBe(0);
  });
});

describe('useCanvasState – updateSelectedProperty', () => {
  it('updates a property of the selected element', () => {
    const { result } = renderHook(() => useCanvasState());
    const mockSocket = { emit: vi.fn() };
    const el = makeEl('sel-1');

    act(() => {
      result.current.setElements([el]);
      result.current.setSelectedIds(['sel-1']);
    });

    act(() => {
      result.current.updateSelectedProperty({ fill: '#ff0000' }, mockSocket);
    });

    const updated = result.current.elements.find((e) => e.id === 'sel-1');
    expect(updated?.fill).toBe('#ff0000');
    expect(mockSocket.emit).toHaveBeenCalledWith('element:update', expect.objectContaining({ fill: '#ff0000' }));
  });

  it('does not modify non-selected elements', () => {
    const { result } = renderHook(() => useCanvasState());
    const mockSocket = { emit: vi.fn() };

    act(() => {
      result.current.setElements([makeEl('sel-1'), makeEl('other-2', 50, 50)]);
      result.current.setSelectedIds(['sel-1']);
    });

    act(() => {
      result.current.updateSelectedProperty({ fill: '#abcdef' }, mockSocket);
    });

    const other = result.current.elements.find((e) => e.id === 'other-2');
    expect(other?.fill).not.toBe('#abcdef');
  });

  it('syncs circle radius when width is updated', () => {
    const { result } = renderHook(() => useCanvasState());
    const mockSocket = { emit: vi.fn() };
    const circle: CanvasElement = { ...makeEl('circle-1'), type: 'circle', radius: 25 };

    act(() => {
      result.current.setElements([circle]);
      result.current.setSelectedIds(['circle-1']);
    });

    act(() => {
      result.current.updateSelectedProperty({ width: 100 }, mockSocket);
    });

    const updated = result.current.elements.find((e) => e.id === 'circle-1');
    expect(updated?.radius).toBe(50); // width / 2
  });

  it('is a no-op when nothing is selected', () => {
    const { result } = renderHook(() => useCanvasState());
    const mockSocket = { emit: vi.fn() };

    act(() => {
      result.current.setElements([makeEl('el-1')]);
      // No selection
    });

    act(() => {
      result.current.updateSelectedProperty({ fill: '#ff0000' }, mockSocket);
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(result.current.elements[0].fill).not.toBe('#ff0000');
  });
});
