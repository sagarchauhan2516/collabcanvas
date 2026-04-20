import { useState, useCallback } from 'react';
import { CanvasElement, User, ElementType, Guide } from '../types';

export function useCanvasState() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [users, setUsers] = useState<User[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);

  // Canvas View State
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });

  // Tool state
  const [tool, setTool] = useState<ElementType | 'select' | 'eraser' | 'ai' | 'hand'>('select');
  const [color, setColor] = useState('#212529');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addToHistory = useCallback((newElements: CanvasElement[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(JSON.parse(JSON.stringify(newElements)));
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryStep((prev) => prev < 50 ? prev + 1 : 50);
  }, [historyStep]);

  const undo = useCallback((socket: any) => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      const prevElements = history[prevStep];
      setHistoryStep(prevStep);
      setElements(prevElements);
      socket?.emit('canvas:sync', prevElements);
    }
  }, [historyStep, history]);

  const redo = useCallback((socket: any) => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      const nextElements = history[nextStep];
      setHistoryStep(nextStep);
      setElements(nextElements);
      socket?.emit('canvas:sync', nextElements);
    }
  }, [historyStep, history]);

  const updateSelectedProperty = useCallback((prop: Partial<CanvasElement>, socket: any) => {
    if (selectedIds.length === 0) return;
    const nextElements = elements.map(el => {
      if (selectedIds.includes(el.id)) {
        const updated = { ...el, ...prop };
        if (el.type === 'circle') {
          if (prop.width !== undefined) updated.radius = prop.width / 2;
          else if (prop.height !== undefined) updated.radius = prop.height / 2;
          else if (prop.radius !== undefined) {
            updated.width = prop.radius * 2;
            updated.height = prop.radius * 2;
          }
        }
        if (el.type === 'emoji' && prop.fontSize !== undefined) {
          updated.width = prop.fontSize * 1.25;
          updated.height = prop.fontSize * 1.25;
        }
        socket?.emit('element:update', updated);
        return updated;
      }
      return el;
    });
    setElements(nextElements);
    addToHistory(nextElements);
  }, [selectedIds, elements, addToHistory]);

  return {
    elements, setElements,
    history, setHistory,
    historyStep, setHistoryStep,
    users, setUsers,
    guides, setGuides,
    view, setView,
    tool, setTool,
    color, setColor,
    strokeWidth, setStrokeWidth,
    selectedIds, setSelectedIds,
    editingId, setEditingId,
    addToHistory,
    undo, redo,
    updateSelectedProperty
  };
}
