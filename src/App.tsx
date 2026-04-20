/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef, memo, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { nanoid } from 'nanoid';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Transformer, Path, Image as KonvaImage } from 'react-konva';
import { MousePointer2, Square, Circle as CircleIcon, Minus, Type, Trash2, Download, Users, Eraser, Sparkles, X, Loader2, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Layers, Ungroup, Database, Diamond, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Cloud, User as UserIcon, FileText, Activity, StickyNote, ArrowRight, Star, Hexagon, Triangle, Copy, Files, Grid3X3, Ruler as RulerIcon, Palette, Lock, Unlock, Hand, Layout, Image as ImageIcon, RefreshCw, Plus, Scissors, Clipboard, Search, Bold, Italic, Underline, Code, PenLine, Crop, Monitor, Save, FolderOpen, Eye, EyeOff, SlidersHorizontal, AlignJustify, Settings, Pipette } from 'lucide-react';
import { CanvasElement, User, ElementType, Guide } from './types';
import { PRESET_TEMPLATES, Template } from './templates';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import useImage from 'use-image';
import { CanvasShape } from './components/canvas/CanvasShape';
import { GridLayer, CanvasRuler, GuideLine } from './components/canvas/CanvasExtras';
import { ToolButton, ContextMenuItem } from './components/ui/ToolbarComponents';
import { CodePreviewModal } from './components/ui/CodePreviewModal';

const COLORS = ['#212529', '#f03e3e', '#1971c2', '#099268', '#f08c00', '#be4bdb'];
const STROKE_WIDTHS = [2, 4, 8, 12];

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [isJoined, setIsJoined] = useState(true);
  
  // Canvas View State
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  
  // Tool state
  const [tool, setTool] = useState<ElementType | 'select' | 'eraser' | 'ai' | 'hand'>('select');
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTHS[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Dreaming up your design...');
  const [aiStyle, setAiStyle] = useState('modern');
  const [aiImage, setAiImage] = useState<string | null>(null);
  
  // Canvas-to-Code state
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  
  // Templates Library
  const [userTemplates, setUserTemplates] = useState<Template[]>(() => {
    const saved = localStorage.getItem('collab-user-templates');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('collab-user-templates', JSON.stringify(userTemplates));
  }, [userTemplates]);
  
  // Responsive Stage Dimensions
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight - 64 });

  // Selection Box State
  const [selectionRect, setSelectionRect] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [gridColor, setGridColor] = useState('rgba(255, 255, 255, 0.05)');
  const [gridDash, setGridDash] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [snapLine, setSnapLine] = useState<{ type: 'horizontal' | 'vertical', pos: number } | null>(null);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'tools' | 'shapes' | 'templates' | 'elements' | 'layers'>('tools');
  const [iconSearch, setIconSearch] = useState('');
  const [iconResults, setIconResults] = useState<{prefix: string, name: string}[]>([]);
  const [isSearchingIcons, setIsSearchingIcons] = useState(false);
  const [activePropTab, setActivePropTab] = useState<'basics' | 'style' | 'layout'>('basics');
  const [lockView, setLockView] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [canvasName, setCanvasName] = useState('Untitled Project');
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(280);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isLeftMinimized, setIsLeftMinimized] = useState(false);
  const [isRightMinimized, setIsRightMinimized] = useState(false);

  // === NEW FEATURES STATE ===
  // Find & Focus palette
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');

  // Presentation mode (lock all editing)
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  // Canvas Background (dark / dim / light)
  const [canvasBg, setCanvasBg] = useState<'dark' | 'dim' | 'light'>('dark');

  // Saved Projects (localStorage)
  const [savedProjects, setSavedProjects] = useState<{id: string; name: string; elements: CanvasElement[]; savedAt: number}[]>(() => {
    try { return JSON.parse(localStorage.getItem('collab-saved-projects') || '[]'); } catch { return []; }
  });
  const [showSavedProjects, setShowSavedProjects] = useState(false);

  // Recent Colors for custom color picker
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('collab-recent-colors') || '[]'); } catch { return []; }
  });
  const [customColor, setCustomColor] = useState(COLORS[0]);

  // Pencil path accumulator ref (stored outside React state for performance)
  const pencilPointsRef = useRef<number[]>([0, 0]);

  const toolbarControls = useDragControls();
  const colorControls = useDragControls();
  const propsControls = useDragControls();

  useEffect(() => {
    let timeoutId: any;
    if (iconSearch.trim()) {
      setIsSearchingIcons(true);
      timeoutId = setTimeout(async () => {
        try {
          const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(iconSearch)}&limit=48`);
          const data = await res.json();
          if (data && data.icons) {
             const results = data.icons.map((id: string) => {
               const parts = id.split(':');
               return { prefix: parts[0], name: parts[1] };
             });
             setIconResults(results);
          }
        } catch (error) {
          console.error('Icon Search Error:', error);
        } finally {
          setIsSearchingIcons(false);
        }
      }, 500);
    } else {
      setIconResults([]);
      setIsSearchingIcons(false);
    }
    return () => clearTimeout(timeoutId);
  }, [iconSearch]);

  const LOADING_MESSAGES = [
    "Analyzing your vision...",
    "Selecting a harmonious color palette...",
    "Planning the geometric composition...",
    "Sketching the layout...",
    "Refining the artistic details...",
    "Finalizing your masterpiece..."
  ];

  // Drawing state
  const [newElement, setNewElement] = useState<CanvasElement | null>(null);
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (tool === 'select' && trRef.current && stageRef.current) {
      const stage = stageRef.current;
      const nodes = (selectedIds || []).map(id => stage.findOne('#' + id)).filter(Boolean);
      trRef.current.nodes(nodes);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedIds, tool]); // Removed elements dependency to prevent jumping during transform

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      let i = 0;
      setLoadingMessage(LOADING_MESSAGES[0]);
      interval = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[i]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Keyboard Shortcuts moved to after handler definitions

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(200, Math.min(450, e.clientX));
        setLeftWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(250, Math.min(500, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  useEffect(() => {
    const handleResize = () => {
      setStageSize({
        width: window.innerWidth,
        height: window.innerHeight - (isJoined ? 48 : 64)
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isJoined]);

  useEffect(() => {
    const newSocket = io({
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      timeout: 10000
    });

    setSocket(newSocket);

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    newSocket.on('init', ({ elements }: { elements: CanvasElement[] }) => {
      const initialElements = elements || [];
      setElements(initialElements);
      setHistory([initialElements]);
      setHistoryStep(0);
    });

    newSocket.on('users:update', (updatedUsers: User[]) => {
      setUsers(updatedUsers || []);
    });

    newSocket.on('element:added', (element: CanvasElement) => {
      setElements((prev) => {
        const next = [...prev, element];
        addToHistory(next);
        return next;
      });
    });

    newSocket.on('element:updated', (updatedElement: CanvasElement) => {
      setElements((prev) => {
        const next = prev.map((el) => el.id === updatedElement.id ? updatedElement : el);
        // Add to history only on final changes usually, but for sync we keep it
        return next;
      });
    });

    newSocket.on('element:deleted', (elementId: string) => {
      setElements((prev) => {
        const next = prev.filter((el) => el.id !== elementId);
        addToHistory(next);
        return next;
      });
    });

    newSocket.on('cursor:moved', ({ userId, cursor }: { userId: string, cursor: { x: number, y: number } }) => {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, cursor } : u));
    });

    newSocket.on('canvas:cleared', () => {
      setElements([]);
      addToHistory([]);
    });

    newSocket.on('guide:add', (guide: Guide) => {
      setGuides(prev => [...prev, guide]);
    });

    newSocket.on('guide:remove', (id: string) => {
      setGuides(prev => prev.filter(g => g.id !== id));
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const addToHistory = useCallback((newElements: CanvasElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(JSON.parse(JSON.stringify(newElements))); // Deep copy
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryStep(prev => prev + 1);
  }, [historyStep]);

  const undo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      const prevElements = history[prevStep];
      setHistoryStep(prevStep);
      setElements(prevElements);
      socket?.emit('canvas:sync', prevElements);
    }
  }, [historyStep, history, socket]);

  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      const nextElements = history[nextStep];
      setHistoryStep(nextStep);
      setElements(nextElements);
      socket?.emit('canvas:sync', nextElements);
    }
  }, [historyStep, history, socket]);

  const handleJoin = useCallback(() => {
    if (!name.trim() || !socket) return;
    const user: User = {
      id: socket.id || nanoid(),
      name,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setCurrentUser(user);
    socket.emit('join', user);
    setIsJoined(true);
  }, [name, socket]);

  const getElementRect = (el: CanvasElement) => {
    if (el.type === 'circle') return { x: el.x, y: el.y, width: (el.radius || 0) * 2, height: (el.radius || 0) * 2 };
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
        height: Math.max(el.height || 0, maxY - minY, 1) 
      };
    }
    return { x: el.x, y: el.y, width: el.width || 0, height: el.height || 0 };
  };

  const isPointInside = (x: number, y: number, el: CanvasElement) => {
    const rect = getElementRect(el);
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  };

  const rectIntersect = (r1: any, r2: any) => {
    return !(r2.x > r1.x + r1.width || 
             r2.x + r2.width < r1.x || 
             r2.y > r1.y + r1.height ||
             r2.y + r2.height < r1.y);
  };

  const updateBoundElements = useCallback((movedElements: CanvasElement[], allElements: CanvasElement[]) => {
    let nextElements = [...allElements];
    let changed = false;

    movedElements.forEach(moved => {
      nextElements = nextElements.map(el => {
        if ((el.type === 'line' || el.type === 'arrow') && (el.startBindingId === moved.id || el.endBindingId === moved.id)) {
          const points = [...(el.points || [0, 0, 0, 0])];
          const movedRect = getElementRect(moved);
          const centerX = movedRect.x + movedRect.width / 2;
          const centerY = movedRect.y + movedRect.height / 2;

          let updatedLine = el;
          if (el.startBindingId === moved.id) {
            const offsetX = el.bindingOffsetStart?.x || 0;
            const offsetY = el.bindingOffsetStart?.y || 0;
            const newStartX = centerX + offsetX;
            const newStartY = centerY + offsetY;
            
            const dx = newStartX - el.x;
            const dy = newStartY - el.y;
            points[2] -= dx;
            points[3] -= dy;
            updatedLine = { ...el, x: newStartX, y: newStartY, points };
          } else if (el.endBindingId === moved.id) {
            const offsetX = el.bindingOffsetEnd?.x || 0;
            const offsetY = el.bindingOffsetEnd?.y || 0;
            points[2] = (centerX + offsetX) - el.x;
            points[3] = (centerY + offsetY) - el.y;
            updatedLine = { ...el, points };
          }
          
          if (updatedLine !== el) {
            socket?.emit('element:update', updatedLine);
            changed = true;
            return updatedLine;
          }
        }
        return el;
      });
    });

    return changed ? nextElements : allElements;
  }, [socket]);

  const handleMouseDown = useCallback((e: any) => {
    if (!isJoined || tool === 'ai') return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    let x = (pointer.x - view.x) / view.scale;
    let y = (pointer.y - view.y) / view.scale;
    
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    if (tool === 'select') {
      // Do nothing if we clicked on the transformer handles
      if (e.target.getParent()?.className === 'Transformer') {
        return;
      }

      let target = e.target;
      let clickedId = target.id();
      
      while (target && !clickedId && target !== stage) {
        target = target.getParent();
        clickedId = target?.id() || '';
      }

      const clickedElement = elements.find(el => el.id === clickedId);
      
      if (clickedElement) {
        // Selection on MouseDown for instant feedback and dragging
        const gid = clickedElement.groupId;
        const relatedIds = gid 
          ? (elements || []).filter(el => el.groupId === gid).map(el => el.id)
          : [clickedId];

        const isShift = e.evt.shiftKey;
        if (isShift) {
          setSelectedIds(prev => {
            const allSelected = relatedIds.every(rid => prev.includes(rid));
            if (allSelected) {
              return prev.filter(i => !relatedIds.includes(i));
            } else {
              const next = [...prev];
              relatedIds.forEach(rid => {
                if (!next.includes(rid)) next.push(rid);
              });
              return next;
            }
          });
        } else {
          // If not already selected, select only this group
          if (!selectedIds.includes(clickedId)) {
            setSelectedIds(relatedIds);
          }
        }
        return;
      }
      
      setSelectionRect({ x1: x, y1: y, x2: x, y2: y });
      if (!e.evt.shiftKey) {
        setSelectedIds([]);
      }
      return;
    }

    if (tool === 'eraser') return;
    
    const id = nanoid();
    
    let element: CanvasElement = {
      id,
      type: tool as ElementType,
      x,
      y,
      initialX: x,
      initialY: y,
      stroke: color,
      strokeWidth,
      fill: color + '20',
    };

    if (tool === 'line' || tool === 'arrow') {
      element.points = [0, 0, 0, 0];
    } else if (tool === 'pencil') {
      pencilPointsRef.current = [0, 0];
      element.pencilPoints = [0, 0];
      element.width = 0;
      element.height = 0;
    } else if (['rect', 'diamond', 'database', 'cloud', 'user', 'document', 'process', 'sticky', 'star', 'hexagon', 'triangle', 'frame'].includes(tool)) {
      element.width = 0;
      element.height = 0;
    } else if (tool === 'circle') {
      element.radius = 0;
    } else if (tool === 'text') {
      setTextPos({ x, y });
      setShowTextModal(true);
      return;
    }

    setNewElement(element);
  }, [isJoined, tool, view, snapToGrid, gridSize, color, strokeWidth]);

  // Throttled cursor move
  const lastCursorEmit = useRef(0);
  const handleMouseMove = useCallback((e: any) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    let x = (pointer.x - view.x) / view.scale;
    let y = (pointer.y - view.y) / view.scale;

    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    // Update cursor position (throttled to 50ms)
    const now = Date.now();
    if (now - lastCursorEmit.current > 50) {
      socket?.emit('cursor:move', { x, y });
      lastCursorEmit.current = now;
    }

    if (selectionRect) {
      setSelectionRect(prev => prev ? { ...prev, x2: x, y2: y } : null);
      return;
    }

    if (!newElement) return;

    const updatedElement = { ...newElement };

    if (newElement.type === 'line' || newElement.type === 'arrow') {
      const startX = newElement.initialX !== undefined ? newElement.initialX : newElement.x;
      const startY = newElement.initialY !== undefined ? newElement.initialY : newElement.y;
      
      const dx = x - startX;
      const dy = y - startY;

      updatedElement.x = Math.min(startX, x);
      updatedElement.y = Math.min(startY, y);
      updatedElement.width = Math.max(1, Math.abs(dx));
      updatedElement.height = Math.max(1, Math.abs(dy));
      
      const p1x = startX - updatedElement.x;
      const p1y = startY - updatedElement.y;
      const p2x = x - updatedElement.x;
      const p2y = y - updatedElement.y;

      updatedElement.points = [p1x, p1y, p2x, p2y];
    } else if (newElement.type === 'pencil') {
      // Accumulate pencil points relative to start position
      pencilPointsRef.current.push(x - newElement.x, y - newElement.y);
      updatedElement.pencilPoints = [...pencilPointsRef.current];
      // Update bounding box so element can be hit-tested correctly
      const relXPts = pencilPointsRef.current.filter((_, i) => i % 2 === 0);
      const relYPts = pencilPointsRef.current.filter((_, i) => i % 2 !== 0);
      updatedElement.width = Math.max(20, Math.max(...relXPts) - Math.min(...relXPts, 0));
      updatedElement.height = Math.max(20, Math.max(...relYPts) - Math.min(...relYPts, 0));
    } else if (['rect', 'diamond', 'database', 'cloud', 'user', 'document', 'process', 'sticky', 'star', 'hexagon', 'triangle', 'frame'].includes(newElement.type)) {
      updatedElement.x = Math.min(x, newElement.x);
      updatedElement.y = Math.min(y, newElement.y);
      updatedElement.width = Math.abs(x - newElement.x);
      updatedElement.height = Math.abs(y - newElement.y);
    } else if (newElement.type === 'circle') {
      const width = Math.abs(x - newElement.x);
      const height = Math.abs(y - newElement.y);
      const radius = Math.max(width, height) / 2;
      updatedElement.x = Math.min(x, newElement.x);
      updatedElement.y = Math.min(y, newElement.y);
      updatedElement.radius = radius;
    }

    setNewElement(updatedElement);
  }, [view, snapToGrid, gridSize, socket, selectionRect, newElement]);

  const handleMouseUp = useCallback((e: any) => {
    if (selectionRect) {
      const isShift = e.evt.shiftKey;
      const { x1, y1, x2, y2 } = selectionRect;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      
      const marqueeRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

      const selected = (elements || []).filter(el => {
        const rect = getElementRect(el);
        // Windows style: items that intersect OR are fully inside
        return rectIntersect(marqueeRect, rect);
      }).map(el => el.id);

      if (isShift) {
        setSelectedIds(prev => {
          const next = [...prev];
          selected.forEach(id => {
            if (!next.includes(id)) next.push(id);
          });
          return next;
        });
      } else {
        setSelectedIds(selected);
      }
      
      setSelectionRect(null);
      return;
    }

    if (!newElement) return;

    let finalizingElement = { ...newElement };
    if (newElement.type === 'line' || newElement.type === 'arrow') {
      const points = newElement.points || [0, 0, 0, 0];
      const startX = newElement.x + points[0];
      const startY = newElement.y + points[1];
      const endX = newElement.x + points[2];
      const endY = newElement.y + points[3];

      const startBinder = elements.find(el => el.type !== 'line' && el.type !== 'arrow' && isPointInside(startX, startY, el));
      const endBinder = elements.find(el => el.type !== 'line' && el.type !== 'arrow' && isPointInside(endX, endY, el));

      if (startBinder) {
        const rect = getElementRect(startBinder);
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        finalizingElement.startBindingId = startBinder.id;
        finalizingElement.bindingOffsetStart = { x: startX - cx, y: startY - cy };
      }
      if (endBinder) {
        const rect = getElementRect(endBinder);
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        finalizingElement.endBindingId = endBinder.id;
        finalizingElement.bindingOffsetEnd = { x: endX - cx, y: endY - cy };
      }
    } else if (newElement.type === 'pencil' && newElement.pencilPoints) {
      // Finalize pencil: compute true bounding box and offset all points
      const pts = newElement.pencilPoints;
      const relXPts = pts.filter((_, i) => i % 2 === 0);
      const relYPts = pts.filter((_, i) => i % 2 !== 0);
      const minRelX = Math.min(0, ...relXPts);
      const minRelY = Math.min(0, ...relYPts);
      const maxRelX = Math.max(0, ...relXPts);
      const maxRelY = Math.max(0, ...relYPts);
      finalizingElement.x = newElement.x + minRelX;
      finalizingElement.y = newElement.y + minRelY;
      finalizingElement.width = Math.max(20, maxRelX - minRelX);
      finalizingElement.height = Math.max(20, maxRelY - minRelY);
      finalizingElement.pencilPoints = pts.map((p, i) => i % 2 === 0 ? p - minRelX : p - minRelY);
    }

    // Don't add zero-size elements (accidental clicks)
    const skipTypes = ['line', 'arrow', 'pencil'];
    if (!skipTypes.includes(newElement.type)) {
      const w = finalizingElement.width || 0;
      const h = finalizingElement.height || 0;
      if (w < 5 && h < 5) {
        setNewElement(null);
        return;
      }
    }

    socket?.emit('element:add', finalizingElement);
    setElements((prev) => {
      const next = [...prev, finalizingElement];
      addToHistory(next);
      return next;
    });
    setNewElement(null);
    // Keep tool active for pencil (allows continuous strokes)
    if (tool !== 'pencil') setTool('select');
  }, [selectionRect, elements, newElement, socket, addToHistory, tool]);

  const handleAddText = useCallback(() => {
    if (!textInput.trim()) return;
    const element: CanvasElement = {
      id: nanoid(),
      type: 'text',
      x: textPos.x,
      y: textPos.y,
      text: textInput,
      stroke: color,
      strokeWidth,
    };
    socket?.emit('element:add', element);
    setElements((prev) => {
      const next = [...prev, element];
      addToHistory(next);
      return next;
    });
    setTextInput('');
    setShowTextModal(false);
    setTool('select');
  }, [textInput, textPos, color, strokeWidth, socket, addToHistory]);
  const exportToCode = useCallback(async () => {
    const targetElements = selectedIds.length > 0 ? elements.filter(el => selectedIds.includes(el.id)) : elements;
    if (targetElements.length === 0) {
      alert("No elements to export!");
      return;
    }
    
    setShowCodeModal(true);
    setIsGeneratingCode(true);
    setGeneratedCode('');
    
    try {
      const parts = targetElements.map(el => ({
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        text: el.text || undefined,
        points: el.points || undefined,
        style: { fill: el.fill, stroke: el.stroke }
      }));

      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements: parts })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText);
      }

      const data = await response.json();
      setGeneratedCode(data.code);
    } catch (error) {
      console.error("Code generation failed:", error);
      setGeneratedCode(`// Generation Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingCode(false);
    }
  }, [elements, selectedIds]);

  const generateAIDesign = useCallback(async (mode: 'new' | 'refine' = 'new') => {
    if (!aiPrompt.trim() && !aiImage) return;
    setIsGenerating(true);
    setLoadingMessage(aiImage ? 'Analyzing image and crafting elements...' : (mode === 'refine' ? 'Refining your design...' : 'Dreaming up your design...'));
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          style: aiStyle,
          image: aiImage,
          elements: mode === 'refine' ? elements : undefined,
          mode
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || response.statusText);
      }

      const text = await response.text();
      if (!text) throw new Error("No response text from AI");
      
      const generatedElements = JSON.parse(text).map((el: any) => ({
        ...el,
        id: el.id || nanoid()
      }));

      setElements((prev) => {
        const next = mode === 'refine' ? generatedElements : [...prev, ...generatedElements];
        if (mode === 'refine') {
          socket?.emit('canvas:sync', generatedElements);
        } else {
          generatedElements.forEach((el: any) => socket?.emit('element:add', el));
        }
        addToHistory(next);
        return next;
      });
      setShowAIModal(false);
      setAiPrompt('');
      setAiImage(null);
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert(`Failed to generate design: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, aiImage, aiStyle, elements, socket, addToHistory]);

  const duplicateElements = useCallback(() => {
    if (selectedIds.length === 0) return;
    
    const duplicated = elements
      .filter(el => selectedIds.includes(el.id))
      .map(el => ({
        ...el,
        id: nanoid(),
        x: el.x + 20,
        y: el.y + 20,
      }));

    duplicated.forEach(el => {
      socket?.emit('element:add', el);
    });

    setElements(prev => {
      const next = [...prev, ...duplicated];
      addToHistory(next);
      return next;
    });
    
    setSelectedIds(duplicated.map(el => el.id));
  }, [selectedIds, elements, socket, addToHistory]);

  const copyElements = useCallback(() => {
    if ((selectedIds || []).length === 0) return;
    const selectedElements = (elements || []).filter(el => (selectedIds || []).includes(el.id));
    setClipboard(selectedElements);
  }, [selectedIds, elements]);

  const cutElements = useCallback(() => {
    if ((selectedIds || []).length === 0) return;
    const selectedElements = (elements || []).filter(el => (selectedIds || []).includes(el.id));
    setClipboard(selectedElements);
    
    (selectedIds || []).forEach(id => socket?.emit('element:delete', id));
    setElements(prev => {
      const next = (prev || []).filter(el => !(selectedIds || []).includes(el.id));
      addToHistory(next);
      return next;
    });
    setSelectedIds([]);
  }, [selectedIds, elements, socket, addToHistory]);

  const pasteElements = useCallback(() => {
    if (clipboard.length === 0) return;
    
    // Calculate bounds of clipboard items to paste at a consistent offset or center
    const rects = clipboard.map(el => getElementRect(el));
    const minX = Math.min(...rects.map(r => r.x));
    const minY = Math.min(...rects.map(r => r.y));
    
    const pasted = clipboard.map(el => ({
      ...el,
      id: nanoid(),
      x: el.x - minX + (stageSize.width / 2 - view.x) / view.scale - 50,
      y: el.y - minY + (stageSize.height / 2 - view.y) / view.scale - 50,
    }));

    pasted.forEach(el => {
      socket?.emit('element:add', el);
    });

    setElements(prev => {
      const next = [...prev, ...pasted];
      addToHistory(next);
      return next;
    });
    
    setSelectedIds(pasted.map(el => el.id));
  }, [clipboard, socket, addToHistory, stageSize, view]);

  const nudgeElements = useCallback((dx: number, dy: number) => {
    if (selectedIds.length === 0) return;
    
    const nextElements = elements.map(el => {
      if (selectedIds.includes(el.id)) {
        const updated = { ...el, x: el.x + dx, y: el.y + dy };
        socket?.emit('element:update', updated);
        return updated;
      }
      return el;
    });
    
    setElements(nextElements);
    // Don't add to history for every 1px nudge to avoid history explosion
    // Use a debounce if needed, but for now just update elements
  }, [selectedIds, elements, socket]);

  const handleElementClick = useCallback((e: any, id: string) => {
    e.cancelBubble = true;
    
    // Selection now primarily handled in MouseDown for instant feedback
    // but we can ensure related group elements are destroyed together in eraser mode
    const clickedElement = elements.find(el => el.id === id);
    const gid = clickedElement?.groupId;
    const relatedIds = gid 
      ? (elements || []).filter(el => el.groupId === gid).map(el => el.id)
      : [id];

    if (tool === 'eraser') {
      relatedIds.forEach(rid => socket?.emit('element:delete', rid));
      setElements((prev) => {
        const next = prev.filter((el) => !relatedIds.includes(el.id));
        addToHistory(next);
        return next;
      });
      setSelectedIds([]);
    }
  }, [tool, socket, addToHistory, elements]);

  const handleDblClick = useCallback((e: any, id: string) => {
    e.cancelBubble = true;
    setEditingId(id);
    setSelectedIds([id]);
  }, []);

  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage() && tool === 'select') {
      setSelectedIds([]);
    }
  }, [tool]);

  const handleTransform = useCallback(() => {
    const nodes = trRef.current?.nodes() || [];
    if (nodes.length === 0) return;
    
    setElements(prev => {
      const next = [...prev];
      let hasChanges = false;
      
      nodes.forEach((n: any) => {
        const elIdx = next.findIndex(item => item.id === n.id());
        if (elIdx === -1) return;

        const el = next[elIdx];
        const updated = {
          ...el,
          x: n.x(),
          y: n.y(),
          scaleX: n.scaleX(),
          scaleY: n.scaleY(),
          rotation: n.rotation()
        };
        
        next[elIdx] = updated;
        socket?.emit('element:update', updated);
        hasChanges = true;
      });

      return hasChanges ? next : prev;
    });
  }, [socket]);

  const handleTransformEnd = useCallback(() => {
    const nodes = trRef.current?.nodes() || [];
    if (nodes.length === 0) return;

    setElements(prev => {
      const next = [...prev];
      let hasChanges = false;
      const movedElements: CanvasElement[] = [];

      nodes.forEach((n: any) => {
        const nid = n.id();
        const elIdx = next.findIndex(el => el.id === nid);
        if (elIdx === -1) return;

        const el = next[elIdx];
        
        let nx = n.x();
        let ny = n.y();
        const scaleX = n.scaleX();
        const scaleY = n.scaleY();
        const rotation = n.rotation();

        // Bake the scale strictly into width/height or points
        const updated = { ...el, x: nx, y: ny, rotation, scaleX: 1, scaleY: 1 };
        
        updated.width = Math.max(5, (el.width || 100) * Math.abs(scaleX));
        updated.height = Math.max(5, (el.height || 100) * Math.abs(scaleY));

        if (el.type === 'line' || el.type === 'arrow') {
          if (el.points) {
            updated.points = el.points.map((p, i) => (i % 2 === 0 ? p * scaleX : p * scaleY));
          }
        } else if (el.type === 'circle') {
          updated.radius = Math.max(5, (el.radius || 50) * Math.abs(scaleX));
        }

        // Hard reset the visual node scale to 1 so the visual and data stay matched perfectly
        n.scaleX(1);
        n.scaleY(1);

        if (snapToGrid) {
          updated.x = Math.round(nx / gridSize) * gridSize;
          updated.y = Math.round(ny / gridSize) * gridSize;
        }

        next[elIdx] = updated;
        movedElements.push(updated);
        socket?.emit('element:update', updated);
        hasChanges = true;
      });

      if (!hasChanges) return prev;
      
      const finalState = updateBoundElements(movedElements, next);
      addToHistory(finalState);
      return finalState;
    });
    
    setSnapLine(null);
  }, [socket, snapToGrid, gridSize, addToHistory, updateBoundElements]);

  const handleDragMove = useCallback((e: any) => {
    const node = e.target;
    if (node === node.getStage()) return;
    
    const id = node.id();
    if (!id) return;

    // Optional: emit to others so they see drag,
    // but do not setElements here to avoid Konva local stutter.
    const el = elements.find(item => item.id === id);
    if (el) {
      socket?.emit('element:update', {
        ...el,
        x: node.x(),
        y: node.y()
      });
    }
  }, [elements, socket]);

  const handleDragEnd = useCallback((e: any) => {
    const node = e.target;
    // Prevent stage tracking
    if (node === node.getStage()) return;
    const id = node.id();
    if (!id) return; 

    const nodes = trRef.current?.nodes() || [node];
    
    setElements(prev => {
      const next = [...prev];
      
      nodes.forEach((n: any) => {
        const nid = n.id();
        const elIdx = next.findIndex(el => el.id === nid);
        if (elIdx === -1) return;
        
        const el = next[elIdx];
        
        // Simpler top-left x,y native
        let nx = n.x();
        let ny = n.y();

        if (snapToGrid) {
          nx = Math.round(nx / gridSize) * gridSize;
          ny = Math.round(ny / gridSize) * gridSize;
        }

        // Snap to guides (only for the primary dragged element to avoid weirdness)
        if (nid === id) {
          let snapped = false;
          guides.forEach(guide => {
            if (guide.type === 'vertical' && Math.abs(nx - guide.pos) < 10) {
              nx = guide.pos;
              setSnapLine({ type: 'vertical', pos: nx });
              snapped = true;
            }
            if (guide.type === 'horizontal' && Math.abs(ny - guide.pos) < 10) {
              ny = guide.pos;
              setSnapLine({ type: 'horizontal', pos: ny });
              snapped = true;
            }
          });
          if (!snapped) setSnapLine(null);
        }

        next[elIdx] = { ...el, x: nx, y: ny };
        socket?.emit('element:update', next[elIdx]);
      });

      const movedElements = nodes.map((n: any) => next.find(item => item.id === n.id())).filter(Boolean) as CanvasElement[];
      const finalNext = updateBoundElements(movedElements, next);
      
      addToHistory(finalNext);
      return finalNext;
    });
  }, [socket, addToHistory, snapToGrid, gridSize, guides, updateBoundElements]);

  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    const groupId = nanoid();
    const nextElements = elements.map(el => 
      selectedIds.includes(el.id) ? { ...el, groupId } : el
    );
    setElements(nextElements);
    addToHistory(nextElements);
    socket?.emit('canvas:sync', nextElements);
  }, [selectedIds, elements, socket, addToHistory]);

  const ungroupSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const nextElements = elements.map(el => 
      selectedIds.includes(el.id) ? { ...el, groupId: undefined } : el
    );
    setElements(nextElements);
    addToHistory(nextElements);
    socket?.emit('canvas:sync', nextElements);
  }, [selectedIds, elements, socket, addToHistory]);

  const saveAsTemplate = useCallback((templateName: string, elementsToSave?: CanvasElement[]) => {
    const targetElements = elementsToSave || (selectedIds.length > 0 ? (elements || []).filter(el => selectedIds.includes(el.id)) : elements);
    if (targetElements.length === 0) return;
    
    const rects = targetElements.map(el => getElementRect(el));
    const minX = Math.min(...rects.map(r => r.x));
    const minY = Math.min(...rects.map(r => r.y));
    
    const templateElements = targetElements.map(el => ({
      ...el,
      x: el.x - minX,
      y: el.y - minY,
      id: nanoid()
    }));
    
    setUserTemplates(prev => [...prev, { 
      id: nanoid(), 
      name: templateName || `Template ${prev.length + 1}`, 
      description: elementsToSave ? 'Custom Layout' : (selectedIds.length > 0 ? 'Partial Layout' : 'Full Canvas'),
      elements: templateElements 
    }]);
  }, [selectedIds, elements]);

  const applyTemplate = useCallback((template: Template, x: number, y: number, clearFirst: boolean = false) => {
    const newElements = template.elements.map(el => ({
      ...el,
      id: nanoid(),
      x: el.x + x,
      y: el.y + y
    }));

    if (clearFirst) {
      if (confirm("This will clear your current canvas and start a new project from this template. Continue?")) {
        socket?.emit('canvas:clear');
        setElements(newElements);
        addToHistory(newElements);
        newElements.forEach(el => socket?.emit('element:add', el));
      }
    } else {
      setElements(prev => {
        const next = [...prev, ...newElements];
        addToHistory(next);
        return next;
      });
      newElements.forEach(el => socket?.emit('element:add', el));
    }
  }, [socket, addToHistory]);

  const alignElements = useCallback((type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedIds.length === 0) return;
    
    const selectedRects = (elements || [])
      .filter(el => (selectedIds || []).includes(el.id))
      .map(el => ({ id: el.id, rect: getElementRect(el) }));

    let targetValue = 0;
    
    if (selectedIds.length === 1) {
      if (type === 'left') targetValue = 0;
      if (type === 'right') targetValue = stageSize.width;
      if (type === 'center') targetValue = stageSize.width / 2;
      if (type === 'top') targetValue = 0;
      if (type === 'bottom') targetValue = stageSize.height;
      if (type === 'middle') targetValue = stageSize.height / 2;
    } else {
      if (type === 'left') targetValue = Math.min(...selectedRects.map(r => r.rect.x));
      if (type === 'right') targetValue = Math.max(...selectedRects.map(r => r.rect.x + r.rect.width));
      if (type === 'center') {
        const minX = Math.min(...selectedRects.map(r => r.rect.x));
        const maxX = Math.max(...selectedRects.map(r => r.rect.x + r.rect.width));
        targetValue = (minX + maxX) / 2;
      }
      if (type === 'top') targetValue = Math.min(...selectedRects.map(r => r.rect.y));
      if (type === 'bottom') targetValue = Math.max(...selectedRects.map(r => r.rect.y + r.rect.height));
      if (type === 'middle') {
        const minY = Math.min(...selectedRects.map(r => r.rect.y));
        const maxY = Math.max(...selectedRects.map(r => r.rect.y + r.rect.height));
        targetValue = (minY + maxY) / 2;
      }
    }

    const nextElements = elements.map(el => {
      if (!selectedIds.includes(el.id)) return el;
      
      const rect = getElementRect(el);
      let updated = { ...el };

      if (['left', 'center', 'right'].includes(type)) {
        let newRectX = targetValue;
        if (type === 'right') newRectX = targetValue - rect.width;
        if (type === 'center') newRectX = targetValue - rect.width / 2;
        
        const dx = newRectX - rect.x;
        updated.x = el.x + dx;
      } else {
        let newRectY = targetValue;
        if (type === 'bottom') newRectY = targetValue - rect.height;
        if (type === 'middle') newRectY = targetValue - rect.height / 2;
        
        const dy = newRectY - rect.y;
        updated.y = el.y + dy;
      }

      socket?.emit('element:update', updated);
      return updated;
    });

    setElements(nextElements);
    addToHistory(nextElements);
  }, [selectedIds, elements, socket, addToHistory, stageSize]);

  const distributeElements = useCallback((direction: 'horizontal' | 'vertical') => {
    if (selectedIds.length < 3) return;
    const selectedRects = elements
      .filter(el => selectedIds.includes(el.id))
      .map(el => ({ id: el.id, rect: getElementRect(el) }))
      .sort((a, b) => direction === 'horizontal' ? a.rect.x - b.rect.x : a.rect.y - b.rect.y);

    if (selectedRects.length < 3) return;

    const first = selectedRects[0].rect;
    const last = selectedRects[selectedRects.length - 1].rect;

    const totalSpace = direction === 'horizontal'
      ? (last.x + last.width) - first.x
      : (last.y + last.height) - first.y;

    const totalElementSize = selectedRects.reduce((sum, { rect }) =>
      sum + (direction === 'horizontal' ? rect.width : rect.height), 0);

    const gap = (totalSpace - totalElementSize) / (selectedRects.length - 1);

    let cursor = direction === 'horizontal' ? first.x : first.y;
    const nextElements = elements.map(el => {
      const found = selectedRects.find(r => r.id === el.id);
      if (!found) return el;

      const rect = getElementRect(el);
      let updated = { ...el };
      if (direction === 'horizontal') {
        updated.x = el.x + (cursor - rect.x);
        cursor += rect.width + gap;
      } else {
        updated.y = el.y + (cursor - rect.y);
        cursor += rect.height + gap;
      }
      socket?.emit('element:update', updated);
      return updated;
    });

    setElements(nextElements);
    addToHistory(nextElements);
  }, [selectedIds, elements, socket, addToHistory]);

  const applyColor = useCallback((newColor: string) => {
    setColor(newColor);
    setCustomColor(newColor);
    setRecentColors(prev => {
      const next = [newColor, ...prev.filter(c => c !== newColor)].slice(0, 8);
      localStorage.setItem('collab-recent-colors', JSON.stringify(next));
      return next;
    });
  }, []);

  const saveProject = useCallback((projectName?: string) => {
    const name = projectName || canvasName || `Project ${new Date().toLocaleDateString()}`;
    const project = { id: nanoid(), name, elements, savedAt: Date.now() };
    setSavedProjects(prev => {
      const next = [project, ...prev].slice(0, 20); // Keep last 20
      localStorage.setItem('collab-saved-projects', JSON.stringify(next));
      return next;
    });
    return project;
  }, [canvasName, elements]);

  const loadProject = useCallback((project: { id: string; name: string; elements: CanvasElement[]; savedAt: number }) => {
    if (confirm(`Load "${project.name}"? This will replace the current canvas.`)) {
      socket?.emit('canvas:sync', project.elements);
      setElements(project.elements);
      addToHistory(project.elements);
      setCanvasName(project.name);
      setShowSavedProjects(false);
    }
  }, [socket, addToHistory]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (elements.length > 0) {
        const autoSave = { id: 'autosave', name: `${canvasName} (Auto)`, elements, savedAt: Date.now() };
        localStorage.setItem('collab-autosave', JSON.stringify(autoSave));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [elements, canvasName]);

  const moveLayer = useCallback((direction: 'up' | 'down' | 'front' | 'back') => {
    if (selectedIds.length === 0) return;
    let nextElements = [...elements];
    
    if (direction === 'front') {
      const selected = nextElements.filter(el => selectedIds.includes(el.id));
      const unselected = nextElements.filter(el => !selectedIds.includes(el.id));
      nextElements = [...unselected, ...selected];
    } else if (direction === 'back') {
      const selected = nextElements.filter(el => selectedIds.includes(el.id));
      const unselected = nextElements.filter(el => !selectedIds.includes(el.id));
      nextElements = [...selected, ...unselected];
    } else {
      selectedIds.forEach(id => {
        const index = nextElements.findIndex(el => el.id === id);
        if (index === -1) return;
        if (direction === 'up' && index < nextElements.length - 1) {
          [nextElements[index], nextElements[index + 1]] = [nextElements[index + 1], nextElements[index]];
        } else if (direction === 'down' && index > 0) {
          [nextElements[index], nextElements[index - 1]] = [nextElements[index - 1], nextElements[index]];
        }
      });
    }
    
    setElements(nextElements);
    addToHistory(nextElements);
    socket?.emit('canvas:sync', nextElements);
  }, [selectedIds, elements, socket, addToHistory]);

  const addGuide = useCallback((type: 'horizontal' | 'vertical', pos: number) => {
    const newGuide = { id: nanoid(), type, pos };
    setGuides(prev => [...prev, newGuide]);
    socket?.emit('guide:add', newGuide);
  }, [socket]);

  const removeGuide = useCallback((id: string) => {
    setGuides(prev => prev.filter(g => g.id !== id));
    socket?.emit('guide:remove', id);
  }, [socket]);

  const updateSelectedProperty = useCallback((prop: Partial<CanvasElement>) => {
    if (selectedIds.length === 0) return;
    const nextElements = elements.map(el => {
      if (selectedIds.includes(el.id)) {
        let updated = { ...el, ...prop };
        
        // Sync radius for circles if width or height is adjusted
        if (el.type === 'circle') {
          if (prop.width !== undefined) updated.radius = prop.width / 2;
          else if (prop.height !== undefined) updated.radius = prop.height / 2;
          else if (prop.radius !== undefined) {
            updated.width = prop.radius * 2;
            updated.height = prop.radius * 2;
          }
        }

        // Sync emoji dimensions with font size
        if (el.type === 'emoji' && prop.fontSize !== undefined) {
          updated.width = prop.fontSize * 1.25; // Emojis need a bit more breathing room
          updated.height = prop.fontSize * 1.25;
        }
        
        socket?.emit('element:update', updated);
        return updated;
      }
      return el;
    });
    setElements(nextElements);
    addToHistory(nextElements);
  }, [selectedIds, elements, socket, addToHistory]);

  const resetView = useCallback(() => {
    setView({ scale: 1, x: 0, y: 0 });
  }, []);

  const zoomToFit = useCallback(() => {
    if (elements.length === 0) {
      resetView();
      return;
    }

    const rects = elements.map(el => getElementRect(el));
    const minX = Math.min(...rects.map(r => r.x));
    const minY = Math.min(...rects.map(r => r.y));
    const maxX = Math.max(...rects.map(r => r.x + r.width));
    const maxY = Math.max(...rects.map(r => r.y + r.height));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const scale = Math.min(
      (stageSize.width - 100) / contentWidth,
      (stageSize.height - 100) / contentHeight,
      2
    );

    const x = (stageSize.width - contentWidth * scale) / 2 - minX * scale;
    const y = (stageSize.height - contentHeight * scale) / 2 - minY * scale;

    setView({ scale, x, y });
  }, [elements, stageSize, resetView]);

  const renderedElements = useMemo(() => {
    return elements
      .filter(el => el.visible !== false || selectedIds.includes(el.id)) // Always show if selected
      .map((el) => (
        <CanvasShape 
          key={el.id} 
          element={el} 
          isSelected={selectedIds.includes(el.id)}
          tool={tool}
          onClick={(e) => handleElementClick(e, el.id)} 
          onDragEnd={handleDragEnd}
          onDragMove={handleDragMove}
          onDblClick={(e) => handleDblClick(e, el.id)}
        />
      ));
  }, [elements, selectedIds, tool, handleElementClick, handleDblClick, handleDragEnd, handleDragMove, handleTransform, handleTransformEnd]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key === 'f') {
        e.preventDefault();
        setShowFind(prev => !prev);
        if (!showFind) setFindQuery('');
      } else if (cmdOrCtrl && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(elements.map(el => el.id));
      } else if (cmdOrCtrl && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (cmdOrCtrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      } else if (cmdOrCtrl && e.key === 'c') {
        e.preventDefault();
        copyElements();
      } else if (cmdOrCtrl && e.key === 'v') {
        e.preventDefault();
        pasteElements();
      } else if (cmdOrCtrl && e.key === 'x') {
        e.preventDefault();
        cutElements();
      } else if (cmdOrCtrl && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateElements();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          const idsToDelete = [...selectedIds];
          idsToDelete.forEach(id => socket?.emit('element:delete', id));
          setElements(prev => {
            const next = prev.filter(el => !idsToDelete.includes(el.id));
            addToHistory(next);
            return next;
          });
          setSelectedIds([]);
        }
      } else if (e.key === 'Escape') {
        setSelectedIds([]);
        if (tool !== 'select' && tool !== 'hand') setTool('select');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudgeElements(0, e.shiftKey ? -10 : -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudgeElements(0, e.shiftKey ? 10 : 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeElements(e.shiftKey ? -10 : -1, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeElements(e.shiftKey ? 10 : 1, 0);
      } else if (cmdOrCtrl && e.key === '=') {
        e.preventDefault();
        setView(v => ({ ...v, scale: v.scale * 1.1 }));
      } else if (cmdOrCtrl && e.key === '-') {
        e.preventDefault();
        setView(v => ({ ...v, scale: v.scale / 1.1 }));
      } else if (cmdOrCtrl && e.key === '0') {
        e.preventDefault();
        resetView();
      } else if (e.key === '[') {
        moveLayer('down');
      } else if (e.key === ']') {
        moveLayer('up');
      } else if (e.key === 'f') {
        e.preventDefault();
        zoomToFit();
      } else if (e.key === 'g') {
        setShowGrid(prev => !prev);
      } else if (e.key === 'h') {
        setTool('hand');
      } else if (e.key === 'v') {
        setTool('select');
      } else if (e.key === ' ') {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedIds, elements, socket, undo, redo, duplicateElements, addToHistory, copyElements, pasteElements, cutElements, nudgeElements, tool, moveLayer, resetView]);

  const clearCanvas = useCallback(() => {
    // Use custom modal instead of window.confirm as per guidelines
    if (confirm('Clear everything?')) {
      socket?.emit('canvas:clear');
      setElements([]);
      addToHistory([]);
    }
  }, [socket, addToHistory]);

  const downloadCanvas = useCallback(() => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'canvas.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();

    // If not pressing ctrl or cmd, then pan instead of zoom
    if (!e.evt.ctrlKey && !e.evt.metaKey) {
      const deltaX = e.evt.deltaX;
      const deltaY = e.evt.deltaY;
      
      setView(prev => ({
        ...prev,
        x: prev.x - deltaX,
        y: prev.y - deltaY
      }));
      return;
    }

    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setView({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, []);

  const [isExporting, setIsExporting] = useState(false);

  const exportToImage = useCallback(() => {
    if (!stageRef.current) return;
    setIsExporting(true);
    
    // Use a timeout to ensure React renders the "clean" stage without UI before Konva captures it
    setTimeout(() => {
      if (!stageRef.current) return;
      const dataURL = stageRef.current.toDataURL({ 
        pixelRatio: 3,
        // We could also specify a rect here to only export the element bounds
      });
      const link = document.createElement('a');
      link.download = `collab-canvas-${new Date().getTime()}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExporting(false);
    }, 50);
  }, []);

  const exportToJSON = useCallback(() => {
    const data = JSON.stringify(elements, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `collab-canvas-${new Date().getTime()}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [elements]);

  const exportToSVG = useCallback(() => {
    // Basic SVG conversion logic
    const rects = elements.map(el => getElementRect(el));
    const minX = Math.min(...rects.map(r => r.x)) - 20;
    const minY = Math.min(...rects.map(r => r.y)) - 20;
    const maxX = Math.max(...rects.map(r => r.x + r.width)) + 20;
    const maxY = Math.max(...rects.map(r => r.y + r.height)) + 20;
    const width = maxX - minX;
    const height = maxY - minY;

    let svgContent = `<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    elements.forEach(el => {
      const common = `stroke="${el.stroke}" stroke-width="${el.strokeWidth}" fill="${el.fill || 'none'}" opacity="${el.opacity || 1}"`;
      if (el.type === 'rect' || el.type === 'process' || el.type === 'sticky') {
        svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.cornerRadius || 0}" ${common} />`;
      } else if (el.type === 'circle') {
        svgContent += `<circle cx="${el.x}" cy="${el.y}" r="${el.radius}" ${common} />`;
      } else if (el.type === 'line' || el.type === 'arrow') {
        const p = el.points || [0,0,0,0];
        svgContent += `<line x1="${el.x + p[0]}" y1="${el.y + p[1]}" x2="${el.x + p[2]}" y2="${el.y + p[3]}" ${common} />`;
      }
      if (el.text) {
        svgContent += `<text x="${el.x + (el.width || 0)/2}" y="${el.y + (el.height || 0)/2}" fill="${el.stroke}" font-size="12" text-anchor="middle" dominant-baseline="middle">${el.text}</text>`;
      }
    });

    svgContent += '</svg>';
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `collab-canvas-${new Date().getTime()}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [elements]);

  if (!isJoined) {
    return (
      <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden">
        <div className="background-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-8 rounded-[32px] w-full max-w-md relative z-10"
        >
          <h1 className="text-4xl font-extrabold mb-6 text-white tracking-tight">CollabCanvas</h1>
          <p className="text-white/60 mb-8">Enter your name to start collaborating in real-time.</p>
          <input
            type="text"
            placeholder="Your Name"
            className="input-glass w-full mb-4"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button
            onClick={handleJoin}
            className="btn-primary w-full shadow-xl shadow-purple-500/20"
          >
            Join Workspace
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative">
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <header className="h-12 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-3 z-[100] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="text-white" size={16} />
            </div>
            <div className={`flex flex-col`}>
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  value={canvasName} 
                  onChange={(e) => setCanvasName(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white/90 outline-none hover:bg-white/5 focus:bg-white/10 px-1 rounded transition-all w-32"
                />
              </div>
            </div>
          </div>
          
          <div className="h-6 w-[1px] bg-white/5 mx-1" />
          
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold border border-white/5 transition-all"
              >
                <Download size={12} />
                <span>EXPORT</span>
                <ChevronDown size={10} />
              </button>
              
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 mt-2 w-44 bg-[#1a1a1a] p-1.5 rounded-xl border border-white/10 shadow-2xl z-[110]"
                  >
                    <button 
                      onClick={() => { exportToImage(); setShowExportMenu(false); }} 
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors text-xs"
                    >
                      <ImageIcon size={14} className="text-blue-400" />
                      <span className="font-bold">Download PNG</span>
                    </button>
                    <button 
                      onClick={() => { exportToSVG(); setShowExportMenu(false); }} 
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors text-xs"
                    >
                      <FileText size={14} className="text-purple-400" />
                      <span className="font-bold">Download SVG</span>
                    </button>
                    <button 
                      onClick={() => { exportToJSON(); setShowExportMenu(false); }} 
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-white/80 transition-colors text-xs"
                    >
                      <Database size={14} className="text-amber-400" />
                      <span className="font-bold">Download JSON</span>
                    </button>
                    <div className="mx-2 my-1 border-t border-white/5"></div>
                    <button 
                      onClick={() => { exportToCode(); setShowExportMenu(false); }} 
                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors text-xs border border-green-500/20"
                    >
                      <Code size={14} />
                      <span className="font-bold">Export React Code</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-1.5 text-white/40">
              <Users size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{users.length} ONLINE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            <button onClick={() => setView(v => ({ ...v, scale: v.scale / 1.1 }))} className="p-1.5 rounded-md hover:bg-white/10 text-white/50 transition-all">
              <ZoomOut size={14} />
            </button>
            <div className="px-2 text-[10px] font-mono font-bold text-white/40 min-w-[3.5rem] text-center">
              {Math.round(view.scale * 100)}%
            </div>
            <button onClick={() => setView(v => ({ ...v, scale: v.scale * 1.1 }))} className="p-1.5 rounded-md hover:bg-white/10 text-white/50 transition-all">
              <ZoomIn size={14} />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-white/5 mx-1" />

          <div className="flex items-center gap-1">
            <button onClick={() => setShowAIModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-lg shadow-indigo-500/20 transition-all">
              <Sparkles size={12} />
              <span>AI MAGIC</span>
            </button>
            <button
              onClick={() => saveProject()}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-green-400 transition-all"
              title="Save Project"
            >
              <Save size={14} />
            </button>
            <button
              onClick={() => setShowSavedProjects(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-blue-400 transition-all"
              title="Load Saved Projects"
            >
              <FolderOpen size={14} />
            </button>
            <button
              onClick={() => setIsPresentationMode(p => !p)}
              className={`p-1.5 rounded-lg transition-all ${isPresentationMode ? 'bg-indigo-500/30 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 hover:bg-white/10 text-white/50'}`}
              title={isPresentationMode ? 'Exit Presentation Mode' : 'Presentation Mode (Lock Editing)'}
            >
              <Monitor size={14} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 transition-all" title="Canvas Settings">
              <Settings size={14} />
            </button>
            <button onClick={() => setShowHelp(true)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 transition-all" title="Help">
              <Activity size={14} />
            </button>
          </div>
          
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-0.5 bg-purple-500/10 border border-purple-500/20 rounded-lg p-0.5 ml-2"
              >
                <button onClick={duplicateElements} className="p-1.5 rounded-md hover:bg-purple-500/20 text-purple-400 transition-all" title="Duplicate">
                  <Copy size={14} />
                </button>
                <button onClick={() => moveLayer('front')} className="p-1.5 rounded-md hover:bg-purple-500/20 text-purple-400 transition-all" title="Bring to Front">
                  <ChevronUp size={14} className="border-b border-purple-400" />
                </button>
                <button onClick={() => moveLayer('back')} className="p-1.5 rounded-md hover:bg-purple-500/20 text-purple-400 transition-all" title="Send to Back">
                  <ChevronDown size={14} className="border-t border-purple-400" />
                </button>
                <button 
                  onClick={() => {
                    const idsToDelete = [...selectedIds];
                    idsToDelete.forEach(id => socket?.emit('element:delete', id));
                    setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
                    setSelectedIds([]);
                  }}
                  className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-all"
                  title="Delete Selection"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Workspace */}
      <main
        className="flex-1 flex overflow-hidden"
        style={{
          backgroundColor: canvasBg === 'light' ? '#f1f5f9' : canvasBg === 'dim' ? '#1a1c2e' : '#0d0d11',
          backgroundImage: showGrid && canvasBg !== 'light' ? `radial-gradient(${gridColor || 'rgba(255,255,255,0.07)'} 1px, transparent 1px)` : showGrid ? `radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)` : 'none',
          backgroundSize: showGrid ? `${gridSize * view.scale}px ${gridSize * view.scale}px` : 'auto',
          backgroundPosition: `${view.x}px ${view.y}px`,
          pointerEvents: isPresentationMode ? 'none' : 'auto',
        }}
      >
        {/* Left Sidebar (Toolbar & Tools) */}
        <motion.aside 
          animate={{ width: isLeftMinimized ? 44 : leftWidth }}
          transition={isResizingLeft ? { type: 'tween', duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
          className="hidden md:flex border-r border-white/5 bg-[#0a0a0a] flex-col shrink-0 z-30 select-none relative h-full shadow-2xl overflow-hidden"
        >
          {/* Resize Handle Left */}
          {!isLeftMinimized && (
            <div 
              className={`absolute top-0 -right-0.5 w-1 h-full cursor-col-resize z-40 transition-colors ${isResizingLeft ? 'bg-purple-500' : 'hover:bg-purple-500/40'}`}
              onMouseDown={() => setIsResizingLeft(true)}
            />
          )}

          <div className="flex flex-col h-full" style={{ width: leftWidth }}>
            {/* Top Tabs - Compact */}
            <div className={`flex border-b border-white/5 bg-white/[0.02] items-center ${isLeftMinimized ? 'flex-col' : ''}`}>
               <button 
                onClick={() => setIsLeftMinimized(!isLeftMinimized)}
                className={`p-3 text-white/30 hover:text-white transition-colors ${isLeftMinimized ? 'border-b w-full' : 'border-r'}`}
                title={isLeftMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                {isLeftMinimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
              {!isLeftMinimized && [
                { id: 'templates', icon: <Layout size={16} />, label: 'Templates' },
                { id: 'elements', icon: <Diamond size={16} />, label: 'Elements' },
                { id: 'layers', icon: <Layers size={16} />, label: 'Layers' },
                { id: 'tools', icon: <MousePointer2 size={16} />, label: 'Tools' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 transition-all ${activeTab === tab.id ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
                  title={tab.label}
                >
                  {tab.icon}
                  <span className="text-[8px] mt-0.5 font-black uppercase tracking-widest">{tab.id}</span>
                </button>
              ))}
              {isLeftMinimized && (
                <div className="flex flex-col items-center gap-4 py-4 text-white/20">
                  <button onClick={() => { setActiveTab('templates'); setIsLeftMinimized(false); }} className={activeTab === 'templates' ? 'text-purple-400' : 'hover:text-white/40'} title="Templates"><Layout size={16} /></button>
                  <button onClick={() => { setActiveTab('elements'); setIsLeftMinimized(false); }} className={activeTab === 'elements' ? 'text-purple-400' : 'hover:text-white/40'} title="Elements"><Diamond size={16} /></button>
                  <button onClick={() => { setActiveTab('layers'); setIsLeftMinimized(false); }} className={activeTab === 'layers' ? 'text-purple-400' : 'hover:text-white/40'} title="Layers"><Layers size={16} /></button>
                  <button onClick={() => { setActiveTab('tools'); setIsLeftMinimized(false); }} className={activeTab === 'tools' ? 'text-purple-400' : 'hover:text-white/40'} title="Tools"><MousePointer2 size={16} /></button>
                </div>
              )}
            </div>

            {/* Scrollable Content Area */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-4 ${isLeftMinimized ? 'hidden' : 'flex'}`}>
              {activeTab === 'tools' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] uppercase font-black tracking-widest text-white/20">WORKSPACE</span>
                      <button 
                        onClick={() => setIsLeftMinimized(true)}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center gap-1 text-[8px] font-bold"
                        title="Minimize Sidebar"
                      >
                        <ChevronLeft size={12} /> COLLAPSE
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <ToolButton active={tool === 'select'} onClick={() => setTool('select')} icon={<MousePointer2 size={18} />} label="Select" />
                      <ToolButton active={tool === 'hand'} onClick={() => setTool('hand')} icon={<Hand size={18} />} label="Pan" />
                      <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={18} />} label="Eraser" />
                      <ToolButton active={tool === 'text'} onClick={() => setTool('text')} icon={<Type size={18} />} label="Text" />
                    </div>
                  </div>

                  {/* Drawing Tools */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] uppercase font-black tracking-widest text-white/20 px-1">DRAWING</span>
                    <div className="grid grid-cols-2 gap-1">
                      <ToolButton active={tool === 'pencil'} onClick={() => setTool('pencil')} icon={<PenLine size={18} />} label="Pencil" />
                      <ToolButton active={tool === 'frame'} onClick={() => setTool('frame')} icon={<Crop size={18} />} label="Frame" />
                      <ToolButton active={tool === 'line'} onClick={() => setTool('line')} icon={<Minus size={18} />} label="Line" />
                      <ToolButton active={tool === 'arrow'} onClick={() => setTool('arrow')} icon={<ArrowRight size={18} />} label="Arrow" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] uppercase font-black tracking-widest text-white/20 px-1">CANVAS TOOLS</span>
                    <div className="flex flex-col gap-1.5 bg-white/5 rounded-xl p-2 border border-white/5">
                      {/* Color row: presets + custom */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => applyColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-purple-400 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        {/* Custom color picker */}
                        <label className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-110 overflow-hidden ${!COLORS.includes(color) ? 'border-purple-400' : 'border-white/20'}`}
                          title="Custom color"
                          style={{ background: `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)` }}
                        >
                          <input
                            type="color"
                            className="opacity-0 w-0 h-0 absolute"
                            value={customColor}
                            onChange={(e) => applyColor(e.target.value)}
                          />
                        </label>
                      </div>
                      {/* Recent colors */}
                      {recentColors.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[8px] text-white/20 font-bold uppercase">RECENT</span>
                          {recentColors.map((c, i) => (
                            <button
                              key={i}
                              onClick={() => applyColor(c)}
                              className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform"
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      )}
                      {/* Current color hex display */}
                      <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1">
                        <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                        <span className="text-[10px] font-mono text-white/60 flex-1">{color.toUpperCase()}</span>
                        <Pipette size={12} className="text-white/30" />
                      </div>
                      {/* Stroke widths */}
                      <div className="flex gap-1 mt-1">
                        {STROKE_WIDTHS.map((w) => (
                          <button
                            key={w}
                            onClick={() => setStrokeWidth(w)}
                            className={`flex-1 h-7 rounded-lg flex items-center justify-center transition-all ${strokeWidth === w ? 'bg-purple-500 text-white shadow-lg' : 'bg-white/5 text-white/20 hover:text-white/40'}`}
                          >
                            <div style={{ height: '1.5px', width: `${w * 1.2}px`, backgroundColor: 'currentColor' }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                    <button 
                      onClick={() => { if(confirm("Clear canvas?")) { socket?.emit('canvas:clear'); setElements([]); } }}
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 border border-red-500/10 transition-all"
                    >
                      <Trash2 size={14} /> CLEAR CANVAS
                    </button>
                  </div>
                </motion.div>
              )}


              {activeTab === 'templates' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 px-1">
                  <span className="text-[9px] uppercase font-black tracking-widest text-white/20">PRESETS</span>
                  <div className="grid grid-cols-1 gap-3">
                    {PRESET_TEMPLATES.map(template => (
                      <button
                        key={template.name}
                        onClick={() => {
                          const center = { x: (stageSize.width / 2 - view.x) / view.scale, y: (stageSize.height / 2 - view.y) / view.scale };
                          const templateElements = template.elements.map(el => ({
                            ...el,
                            id: nanoid(),
                            x: center.x + (el.x || 0) - 300,
                            y: center.y + (el.y || 0) - 200
                          }));
                          setElements(prev => {
                            const next = [...prev, ...templateElements];
                            addToHistory(next);
                            return next;
                          });
                          templateElements.forEach(el => socket?.emit('element:add', el));
                        }}
                        className="w-full text-left group"
                      >
                        <div className="aspect-[4/3] w-full bg-[#151515] rounded-xl border border-white/5 mb-2 overflow-hidden relative transition-all group-hover:border-purple-500/50 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                          <div className="absolute inset-0 scale-[0.14] origin-top-left p-10 pointer-events-none opacity-60 group-hover:opacity-100 transition-all">
                             {template.elements.map((el, idx) => {
                               // Harden transparent colors for preview visibility
                               const getPreviewColor = (c: string | undefined) => {
                                 if (!c) return 'transparent';
                                 if (c.length === 9) return c.substring(0, 7); // Strip alpha
                                 if (c.includes('rgba')) return c.replace(/rgba\((.*),(.*),(.*),(.*)\)/, 'rgb($1,$2,$3)');
                                 return c;
                               };
                               const color = getPreviewColor(el.fill) || getPreviewColor(el.stroke) || '#333';
                               
                               return (
                                 <div 
                                   key={idx} 
                                   style={{ 
                                     position: 'absolute', 
                                     left: el.x, 
                                     top: el.y, 
                                     width: el.width, 
                                     height: el.height,
                                     backgroundColor: color === 'transparent' ? '#333' : color,
                                     border: `4px solid ${getPreviewColor(el.stroke) || '#555'}`,
                                     borderRadius: el.cornerRadius || (el.type === 'circle' ? '50%' : '4px'),
                                     opacity: 1
                                   }} 
                                 />
                               );
                             })}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                             <div className="flex flex-col">
                               <span className="text-[10px] font-black uppercase text-white/90 tracking-widest">{template.name}</span>
                               <span className="text-[8px] text-white/40 line-clamp-1">{template.description}</span>
                             </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'layers' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 px-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[9px] uppercase font-black tracking-widest text-white/20">LAYERS</span>
                    <span className="text-[8px] text-white/20">{elements.length} Items</span>
                  </div>
                  {[...elements].reverse().map((el, i) => (
                    <div
                      key={el.id}
                      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer text-xs transition-all group ${
                        selectedIds.includes(el.id)
                          ? 'bg-indigo-500/20 border border-indigo-500/30 text-white'
                          : 'bg-white/3 hover:bg-white/8 border border-transparent text-white/60'
                      }`}
                      onClick={() => setSelectedIds([el.id])}
                    >
                      <div className="text-[10px] text-white/20 font-mono w-4 flex-shrink-0">{elements.length - i}</div>
                      <div className="flex-1 truncate font-medium text-[10px] flex items-center gap-1">
                        <span className="text-white/30">{el.type}</span>
                        {el.text && <span className="truncate">— {el.text}</span>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); updateSelectedProperty({ visible: el.visible === false }); setSelectedIds([el.id]); }}
                          className={`p-0.5 rounded hover:bg-white/10 transition-all ${el.visible === false ? 'text-white/20' : 'text-white/50 hover:text-white'}`}
                          title={el.visible === false ? 'Show' : 'Hide'}
                        >
                          {el.visible === false ? <EyeOff size={10} /> : <Eye size={10} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setElements(prev => prev.map(e => e.id === el.id ? { ...e, locked: !e.locked } : e)); setSelectedIds([el.id]); }}
                          className={`p-0.5 rounded hover:bg-white/10 transition-all ${el.locked ? 'text-orange-400' : 'text-white/30 hover:text-white/60'}`}
                          title={el.locked ? 'Unlock' : 'Lock'}
                        >
                          {el.locked ? <Lock size={10} /> : <Unlock size={10} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {elements.length === 0 && (
                    <p className="text-center text-white/20 text-xs py-8">Canvas is empty</p>
                  )}
                </motion.div>
              )}

              {activeTab === 'elements' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex flex-col gap-4 px-1`}>
                   {/* Geometric Shapes integrated into Elements */}
                   <div className="flex flex-col gap-1.5">
                     <span className="text-[9px] uppercase font-black tracking-widest text-white/20 px-1">SHAPES</span>
                     <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                        {[
                          { id: 'rect', icon: <Square size={16} />, label: 'Rect' },
                          { id: 'circle', icon: <CircleIcon size={16} />, label: 'Circle' },
                          { id: 'triangle', icon: <Triangle size={16} />, label: 'Triangle' },
                          { id: 'diamond', icon: <Diamond size={16} />, label: 'Diamond' },
                          { id: 'star', icon: <Star size={16} />, label: 'Star' },
                          { id: 'hexagon', icon: <Hexagon size={16} />, label: 'Hex' },
                          { id: 'cloud', icon: <Cloud size={16} />, label: 'Cloud' },
                          { id: 'user', icon: <UserIcon size={16} />, label: 'User' }
                        ].map(s => (
                          <ToolButton 
                            key={s.id} 
                            active={tool === s.id} 
                            onClick={() => setTool(s.id as any)} 
                            icon={s.icon} 
                            label={s.label} 
                            type={s.id} 
                          />
                        ))}
                     </div>
                   </div>

                   {/* Icon Search (The Icons API) */}
                   <div className="flex flex-col gap-2 p-1">
                     <span className="text-[9px] uppercase font-black tracking-widest text-white/20 px-1">ICONS API SEARCH</span>
                     <div className="relative">
                       <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                       <input 
                         type="text" 
                         placeholder="Find any icon..." 
                         value={iconSearch}
                         onChange={(e) => setIconSearch(e.target.value)}
                         className="w-full bg-white/5 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-[10px] text-white placeholder:text-white/20 outline-none focus:border-purple-500/50 transition-all font-medium"
                       />
                       {isSearchingIcons && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" size={12} />}
                     </div>
                     
                     {iconResults.length > 0 ? (
                        <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 rounded-xl border border-white/5 max-h-[180px] overflow-y-auto custom-scrollbar">
                           {iconResults.map((icon, idx) => {
                             const iconUrl = `https://api.iconify.design/${icon.prefix}/${icon.name}.svg`;
                             return (
                               <button
                                 key={`${icon.prefix}-${icon.name}-${idx}`}
                                 draggable
                                 onDragStart={(ev) => {
                                   ev.dataTransfer.setData('application/react-konva', 'logo');
                                   ev.dataTransfer.setData('logo-src', iconUrl);
                                 }}
                                 onClick={() => {
                                   const center = { x: (stageSize.width / 2 - view.x) / view.scale, y: (stageSize.height / 2 - view.y) / view.scale };
                                   const newEl: CanvasElement = {
                                     id: nanoid(), type: 'logo', x: center.x - 20, y: center.y - 20, width: 40, height: 40, src: iconUrl, stroke: 'transparent', strokeWidth: 0, opacity: 1
                                   };
                                   setElements(prev => {
                                     const next = [...prev, newEl];
                                     addToHistory(next);
                                     return next;
                                   });
                                   socket?.emit('element:add', newEl);
                                   setSelectedIds([newEl.id]);
                                 }}
                                 className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all p-2 group"
                                 title={`${icon.prefix}:${icon.name}`}
                               >
                                 <img src={iconUrl} className="w-full h-full object-contain pointer-events-none group-hover:scale-110 transition-transform" />
                               </button>
                             );
                           })}
                        </div>
                     ) : iconSearch.length > 2 && !isSearchingIcons && (
                        <div className="py-8 flex flex-col items-center justify-center opacity-20 bg-white/5 rounded-xl border border-dashed border-white/10">
                          <Search size={20} className="mb-1" />
                          <span className="text-[8px] uppercase tracking-widest">No icons found</span>
                        </div>
                     )}
                   </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Center Canvas Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div 
            className="w-full h-full outline-none" 
            tabIndex={0}
            onMouseEnter={(e) => e.currentTarget.focus()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('application/react-konva') as ElementType;
            if (!type) return;

            const emojiText = e.dataTransfer.getData('emoji-text');
            const logoSrc = e.dataTransfer.getData('logo-src');

            const stage = stageRef.current;
            stage.setPointersPositions(e);
            const pointer = stage.getPointerPosition();
            if (!pointer) return;
            
            const x = (pointer.x - view.x) / view.scale;
            const y = (pointer.y - view.y) / view.scale;
            
            const newEl: CanvasElement = {
              id: nanoid(),
              type,
              x: x - (type === 'emoji' ? 25 : (type === 'logo' ? 20 : 50)),
              y: y - (type === 'emoji' ? 25 : (type === 'logo' ? 20 : 50)),
              width: type === 'emoji' ? 50 : (type === 'logo' ? 40 : 100),
              height: type === 'emoji' ? 50 : (type === 'logo' ? 40 : 100),
              radius: type === 'circle' ? 50 : undefined,
              stroke: (type === 'emoji' || type === 'logo') ? 'transparent' : color,
              strokeWidth: (type === 'emoji' || type === 'logo') ? 0 : 2,
              fill: type === 'logo' ? 'transparent' : (type === 'emoji' ? color : color + '20'),
              text: type === 'emoji' ? emojiText : undefined,
              src: type === 'logo' ? logoSrc : undefined,
              fontSize: type === 'emoji' ? 40 : undefined,
              opacity: 1,
            };

            setElements(prev => {
              const next = [...prev, newEl];
              addToHistory(next);
              return next;
            });
            socket?.emit('element:add', newEl);
            setSelectedIds([newEl.id]);
            setTool('select');
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            const stage = stageRef.current;
            const pointer = stage.getPointerPosition();
            if (!pointer) return;
            
            // If right-clicking on specific element, select it if not already selected
            const clickedShape = stage.getIntersection(pointer);
            let targetElement = clickedShape;
            while (targetElement && !targetElement.attrs.id && targetElement !== stage) {
              targetElement = targetElement.getParent();
            }

            if (targetElement && targetElement.attrs.id) {
              const id = targetElement.attrs.id;
              if (!selectedIds.includes(id)) {
                setSelectedIds([id]);
              }
              setContextMenu({ x: e.clientX, y: e.clientY });
            } else {
              setContextMenu(null);
            }
          }}
          onClick={() => {
            setContextMenu(null);
            setEditingId(null);
          }}
        >
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleStageClick}
            onWheel={handleWheel}
            scaleX={view.scale}
            scaleY={view.scale}
            x={view.x}
            y={view.y}
            draggable={(isSpacePressed || tool === 'hand') && !selectionRect}
            onDragMove={(e) => {
              if (e.target === e.target.getStage()) {
                setView(prev => ({ ...prev, x: e.target.x(), y: e.target.y() }));
              }
            }}
            onDragEnd={(e) => {
              if (e.target === e.target.getStage()) {
                setView(prev => ({ ...prev, x: e.target.x(), y: e.target.y() }));
              }
            }}
            ref={stageRef}
          >
            {showGrid && !isExporting && (
              <Layer listening={false}>
                <GridLayer 
                  gridSize={gridSize} 
                  gridColor={gridColor} 
                  gridDash={gridDash} 
                  scale={view.scale} 
                  position={{ x: view.x, y: view.y }} 
                  stageSize={stageSize} 
                />
              </Layer>
            )}
            <Layer>
              {renderedElements}
              {newElement && <CanvasShape element={newElement} />}
              
              {/* Guides Layer */}
              {!isExporting && guides.map(guide => (
                <GuideLine 
                  key={guide.id} 
                  guide={guide} 
                  scale={view.scale} 
                  position={{ x: view.x, y: view.y }} 
                  stageSize={stageSize} 
                  onRemove={() => removeGuide(guide.id)} 
                />
              ))}

              {snapLine && (
                <Line 
                  points={snapLine.type === 'horizontal' ? [-view.x / view.scale, snapLine.pos, (stageSize.width - view.x) / view.scale, snapLine.pos] : [snapLine.pos, -view.y / view.scale, snapLine.pos, (stageSize.height - view.y) / view.scale]}
                  stroke="#fbbf24"
                  strokeWidth={2 / view.scale}
                  opacity={0.5}
                />
              )}
              
              {selectionRect && (
                <Rect
                  x={Math.min(selectionRect.x1, selectionRect.x2)}
                  y={Math.min(selectionRect.y1, selectionRect.y2)}
                  width={Math.abs(selectionRect.x2 - selectionRect.x1)}
                  height={Math.abs(selectionRect.y2 - selectionRect.y1)}
                  fill="rgba(187, 134, 252, 0.1)"
                  stroke="#bb86fc"
                  strokeWidth={1}
                  dash={[5, 5]}
                />
              )}

      {tool === 'select' && (
        <Transformer
          ref={trRef}
          anchorFill="#ffffff"
          anchorStroke="#bb86fc"
          anchorCornerRadius={3}
          anchorSize={Math.max(6, 8 / Math.sqrt(view.scale))}
          borderStroke="#bb86fc"
          borderStrokeWidth={Math.max(1, 2 / view.scale)}
          rotateAnchorOffset={Math.max(15, 25 / view.scale)}
          rotateEnabled={true}
          keepRatio={false}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right']}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
        />
      )}
              
              {/* Remote Cursors */}
              {!isExporting && (users || []).filter(u => u.id !== currentUser?.id && u.cursor).map(u => (
                <Group key={u.id} x={u.cursor!.x} y={u.cursor!.y}>
                  <MousePointer2 size={16} fill={u.color} color={u.color} style={{ transform: 'rotate(-90deg)' }} />
                  <Text
                    text={u.name}
                    x={20}
                    y={0}
                    fill="white"
                    fontSize={12}
                    fontStyle="bold"
                    shadowColor="black"
                    shadowBlur={4}
                    shadowOpacity={0.5}
                  />
                </Group>
              ))}
            </Layer>

            {/* Rulers Layer (Fixed) */}
            {showRulers && !isExporting && (
              <Layer
                x={-view.x / view.scale}
                y={-view.y / view.scale}
                scaleX={1 / view.scale}
                scaleY={1 / view.scale}
              >
                <CanvasRuler 
                  type="horizontal" 
                  scale={view.scale} 
                  position={{ x: view.x, y: view.y }} 
                  stageSize={stageSize} 
                  onAddGuide={(pos) => addGuide('vertical', pos)} 
                />
                <CanvasRuler 
                  type="vertical" 
                  scale={view.scale} 
                  position={{ x: view.x, y: view.y }} 
                  stageSize={stageSize} 
                  onAddGuide={(pos) => addGuide('horizontal', pos)} 
                />
              </Layer>
            )}
          </Stage>

          {/* Interactive Guides Layer (Fixed) */}
          {!isExporting && (
            <div className="pointer-events-none absolute inset-0 z-40">
               {/* No overlay blockers here anymore */}
            </div>
          )}
          
          {/* Floating Selection Toolbar */}
          <AnimatePresence>
            {selectedIds.length > 0 && !selectionRect && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex items-center gap-3"
              >
                <div className="flex items-center gap-1 px-2 border-r border-white/10">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{selectedIds.length} Selected</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button onClick={duplicateElements} className="p-2 rounded-xl hover:bg-white/5 text-purple-400 transition-all" title="Duplicate">
                    <Copy size={16} />
                  </button>
                  <button onClick={copyElements} className="p-2 rounded-xl hover:bg-white/5 text-purple-400 transition-all" title="Copy">
                    <Files size={16} />
                  </button>
                  <button onClick={() => moveLayer('front')} className="p-2 rounded-xl hover:bg-white/5 text-purple-400 transition-all" title="Bring to Front">
                    <ChevronUp size={16} className="border-b-2 border-purple-400" />
                  </button>
                  <button onClick={() => moveLayer('back')} className="p-2 rounded-xl hover:bg-white/5 text-purple-400 transition-all" title="Send to Back">
                    <ChevronDown size={16} className="border-t-2 border-purple-400" />
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-white/10 mx-1" />

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {COLORS.slice(0, 4).map(c => (
                      <button 
                        key={c}
                        onClick={() => updateSelectedProperty({ stroke: c, fill: c + '20' })}
                        className="w-4 h-4 rounded-full border border-white/10 transition-transform hover:scale-125"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-4 w-[1px] bg-white/10 mx-1" />

                <div className="flex items-center gap-1">
                  {[1, 2, 4, 8].map(size => (
                    <button
                      key={size}
                      onClick={() => updateSelectedProperty({ strokeWidth: size })}
                      className="p-1 hover:bg-white/10 rounded overflow-hidden flex items-center justify-center h-6 w-6 relative"
                      title={`${size}px Border/Line`}
                    >
                      <div className="bg-white/60 pointer-events-none rounded-full" style={{ width: size + 8, height: size }} />
                    </button>
                  ))}
                </div>

                <div className="h-4 w-[1px] bg-white/10 mx-1" />

                <button 
                  onClick={() => {
                    const idsToDelete = [...selectedIds];
                    idsToDelete.forEach(id => socket?.emit('element:delete', id));
                    setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
                    setSelectedIds([]);
                  }}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-red-400 transition-all" 
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Bar */}
          <div className="absolute bottom-4 right-4 z-[60] flex items-center gap-4 pointer-events-none">
            <div className="bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-3 shadow-lg pointer-events-auto">
              <div className="flex items-center gap-2 pr-3 border-r border-white/10">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Live</span>
              </div>
              <div className="text-[10px] text-white/50 flex items-center gap-1 border-r border-white/10 pr-3">
                <span className="font-bold text-purple-400">{elements.length}</span>
                <span className="uppercase text-[8px] tracking-widest font-black">Objects</span>
              </div>
              <div className="text-[10px] text-white/50 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/80 font-mono">Space</kbd>
                <span>to pan</span>
              </div>
              <div className="text-[10px] text-white/50 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/80 font-mono">F</kbd>
                <span>zoom fit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-[100] bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[160px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <ContextMenuItem 
                icon={<Copy size={16} />} 
                label="Duplicate" 
                onClick={() => {
                  duplicateElements();
                  setContextMenu(null);
                }} 
              />
              <ContextMenuItem 
                icon={<Copy size={16} />} 
                label="Copy" 
                onClick={() => {
                  copyElements();
                  setContextMenu(null);
                }} 
              />
              <ContextMenuItem 
                icon={<Scissors size={16} />} 
                label="Cut" 
                onClick={() => {
                  cutElements();
                  setContextMenu(null);
                }} 
              />
              <ContextMenuItem 
                icon={<Clipboard size={16} />} 
                label="Paste" 
                onClick={() => {
                  pasteElements();
                  setContextMenu(null);
                }} 
              />
              <ContextMenuItem 
                icon={<Star size={16} className="text-amber-400" />} 
                label="Save as Template" 
                onClick={() => {
                  const name = prompt("Enter a name for this template:");
                  if (name) saveAsTemplate(name);
                  setContextMenu(null);
                }} 
              />
              <div className="h-[1px] bg-white/5 my-1" />
              {selectedIds.length > 1 && (
                <ContextMenuItem 
                  icon={<Layers size={16} />} 
                  label="Group" 
                  onClick={() => {
                    groupSelected();
                    setContextMenu(null);
                  }} 
                />
              )}
              {selectedIds.some(id => elements.find(el => el.id === id)?.groupId) && (
                <ContextMenuItem 
                  icon={<Ungroup size={16} />} 
                  label="Ungroup" 
                  onClick={() => {
                    ungroupSelected();
                    setContextMenu(null);
                  }} 
                />
              )}
              <div className="h-[1px] bg-white/5 my-1" />
              <ContextMenuItem 
                icon={<ChevronUp size={16} />} 
                label="Move Forward" 
                onClick={() => {
                  moveLayer('up');
                  setContextMenu(null);
                }} 
              />
              <ContextMenuItem 
                icon={<ChevronDown size={16} />} 
                label="Move Backward" 
                onClick={() => {
                  moveLayer('down');
                  setContextMenu(null);
                }} 
              />
              <div className="h-[1px] bg-white/5 my-1" />
              <ContextMenuItem 
                icon={<Layers size={16} />} 
                label="Bring to Front" 
                onClick={() => {
                  moveLayer('front');
                  setContextMenu(null);
                }} 
              />
              <ContextMenuItem 
                icon={<Layers size={16} className="rotate-180" />} 
                label="Send to Back" 
                onClick={() => {
                  moveLayer('back');
                  setContextMenu(null);
                }} 
              />
              <div className="h-[1px] bg-white/5 my-1" />
              <ContextMenuItem 
                icon={<Trash2 size={16} />} 
                label="Delete" 
                danger
                onClick={() => {
                  const idsToDelete = [...selectedIds];
                  idsToDelete.forEach(id => socket?.emit('element:delete', id));
                  setElements(prev => prev.filter(el => !idsToDelete.includes(el.id)));
                  setSelectedIds([]);
                  setContextMenu(null);
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Expand Sidebar Button (Right) */}
        {selectedIds.length > 0 && isRightMinimized && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsRightMinimized(false)}
            className="fixed right-4 top-24 z-[70] w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-purple-500/50 shadow-2xl transition-all group"
            title="Expand Properties"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            <div className="absolute right-full mr-3 px-2 py-1 rounded bg-black text-[10px] font-bold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
              Properties
            </div>
          </motion.button>
        )}
      </div>

        {/* Right Sidebar (Properties - Docked) */}
        <motion.aside 
          animate={{ 
            width: (selectedIds.length > 0 && !isRightMinimized) ? rightWidth : 0,
            opacity: (selectedIds.length > 0 && !isRightMinimized) ? 1 : 0
          }}
          transition={isResizingRight ? { type: 'tween', duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
          className={`hidden lg:flex bg-[#121212]/95 backdrop-blur-xl flex-col shrink-0 z-30 select-none relative shadow-2xl overflow-hidden ${(selectedIds.length === 0 || isRightMinimized) ? 'pointer-events-none' : 'border-l border-white/10'}`}
        >
          {/* Resize Handle Right */}
          {selectedIds.length > 0 && !isRightMinimized && (
            <div 
              className={`absolute top-0 -left-0.5 w-1 h-full cursor-col-resize z-40 transition-colors ${isResizingRight ? 'bg-purple-500' : 'hover:bg-purple-500/40'}`}
              onMouseDown={() => setIsResizingRight(true)}
            />
          )}

          <AnimatePresence mode="wait">
            {selectedIds.length > 0 && (
              <motion.div 
                key="properties-sidebar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="flex flex-col h-full"
              >
                <div className="p-4 border-b border-white/5 bg-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Element Properties</span>
                    <div className="flex gap-1 items-center">
                       {selectedIds.length > 0 && (
                         <div className="flex gap-0.5 mr-1 bg-black/20 rounded-md p-0.5">
                            <button onClick={() => alignElements('left')} title="Align Left" className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-all"><AlignLeft size={12} /></button>
                            <button onClick={() => alignElements('center')} title="Align Center" className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-all"><AlignCenter size={12} /></button>
                            <button onClick={() => alignElements('right')} title="Align Right" className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-all"><AlignRight size={12} /></button>
                            <div className="w-[1px] bg-white/5 mx-0.5" />
                            <button onClick={() => alignElements('h-distribute')} title="Distribute Horizontally" className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-all"><AlignHorizontalJustifyCenter size={12} /></button>
                            <button onClick={() => alignElements('v-distribute')} title="Distribute Vertically" className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-all"><AlignVerticalJustifyCenter size={12} /></button>
                            <div className="w-[1px] bg-white/5 mx-0.5" />
                            {selectedIds.length > 1 && (
                              <>
                                <button onClick={groupSelected} title="Group Elements" className="p-1 hover:bg-white/10 rounded text-indigo-400 hover:text-indigo-300 transition-all"><Layers size={12} /></button>
                                <div className="w-[1px] bg-white/5 mx-0.5" />
                              </>
                            )}
                            <button onClick={() => alignElements('top')} title="Align Top" className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-all"><AlignVerticalJustifyStart size={12} /></button>
                            <button onClick={() => alignElements('middle')} title="Align Middle" className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-all"><AlignVerticalJustifyCenter size={12} /></button>
                            <button onClick={() => alignElements('bottom')} title="Align Bottom" className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-all"><AlignVerticalJustifyEnd size={12} /></button>
                         </div>
                       )}
                       {selectedIds.length === 1 && elements.find(el => el.id === selectedIds[0])?.groupId && (
                         <button onClick={ungroupSelected} title="Ungroup" className="mr-1 p-1 bg-black/20 hover:bg-white/10 rounded text-indigo-400 transition-all">
                           <Ungroup size={12} />
                         </button>
                       )}
                       <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/10 font-bold uppercase shrink-0">
                        {selectedIds.length > 1 ? `${selectedIds.length} Items` : elements.find(el => el.id === selectedIds[0])?.type}
                      </span>
                      <button 
                        onClick={() => setIsRightMinimized(true)}
                        className="p-1 hover:bg-white/10 rounded text-white/20 hover:text-white transition-all ml-1 shrink-0"
                        title="Minimize"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex bg-white/5 p-1 rounded-xl">
                    {['basics', 'style', 'layout'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActivePropTab(tab as any)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activePropTab === tab ? 'bg-purple-500 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
                  {activePropTab === 'basics' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-white/40 uppercase font-bold">Label / Content</span>
                        {elements.find(el => el.id === selectedIds[0])?.type === 'image' ? (
                          <div className="flex flex-col gap-2">
                            <input 
                              className="input-glass text-xs py-2 px-3"
                              placeholder="Image URL..."
                              value={elements.find(el => el.id === selectedIds[0])?.src || ''}
                              onChange={(e) => updateSelectedProperty({ src: e.target.value })}
                            />
                            <button 
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e: any) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      updateSelectedProperty({ src: event.target?.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                              className="btn-secondary py-1.5 text-[10px]"
                            >
                              Update Image File
                            </button>
                          </div>
                        ) : (
                          <textarea 
                            className="input-glass text-xs min-h-[100px] resize-none py-3"
                            placeholder="Type content..."
                            value={elements.find(el => el.id === selectedIds[0])?.text || ''}
                            onChange={(e) => updateSelectedProperty({ text: e.target.value })}
                          />
                        )}
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <span className="text-[10px] text-white/40 uppercase font-bold">State Controls</span>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => updateSelectedProperty({ locked: !elements.find(el => el.id === selectedIds[0])?.locked })}
                             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${elements.find(el => el.id === selectedIds[0])?.locked ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}
                           >
                              {elements.find(el => el.id === selectedIds[0])?.locked ? <Lock size={12} /> : <Unlock size={12} />}
                              <span className="text-[10px] font-bold uppercase tracking-widest">{elements.find(el => el.id === selectedIds[0])?.locked ? 'Locked' : 'Unlocked'}</span>
                           </button>
                           <button 
                             onClick={() => updateSelectedProperty({ visible: elements.find(el => el.id === selectedIds[0])?.visible === false })}
                             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${elements.find(el => el.id === selectedIds[0])?.visible !== false ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}
                             title="Toggle Visibility"
                           >
                              <Sparkles size={12} className={elements.find(el => el.id === selectedIds[0])?.visible !== false ? 'opacity-100' : 'opacity-20'} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">{elements.find(el => el.id === selectedIds[0])?.visible !== false ? 'Visible' : 'Hidden'}</span>
                           </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-white/40 uppercase font-bold">Typography</span>
                        <div className="flex flex-col gap-3">
                           <div className="flex flex-col gap-2">
                              <div className="flex justify-between text-[9px] text-white/30 uppercase">
                                <span>Size</span>
                                <span className="text-white/60">{elements.find(el => el.id === selectedIds[0])?.fontSize || 16}px</span>
                              </div>
                              <input 
                                type="range" min="8" max="120" step="1"
                                className="w-full accent-purple-500"
                                value={elements.find(el => el.id === selectedIds[0])?.fontSize || 16}
                                onChange={(e) => updateSelectedProperty({ fontSize: parseInt(e.target.value) })}
                              />
                           </div>
                          <select 
                            className="input-glass text-[10px] py-2 h-auto w-full"
                            value={elements.find(el => el.id === selectedIds[0])?.fontFamily || 'Inter, sans-serif'}
                            onChange={(e) => updateSelectedProperty({ fontFamily: e.target.value })}
                          >
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                            <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                            <option value="'Playfair Display', serif">Playfair Display</option>
                          </select>

                          <div className="flex gap-1 mt-1">
                            <div className="flex-1 flex gap-1 bg-black/20 rounded-lg p-1">
                              <button 
                                onClick={() => {
                                  const current = elements.find(el => el.id === selectedIds[0])?.fontStyle || 'normal';
                                  const isBold = current.includes('bold');
                                  const isItalic = current.includes('italic');
                                  let next = isBold ? (isItalic ? 'italic' : 'normal') : (isItalic ? 'bold italic' : 'bold');
                                  updateSelectedProperty({ fontStyle: next });
                                }}
                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${elements.find(el => el.id === selectedIds[0])?.fontStyle?.includes('bold') ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-white/40'}`}
                                title="Bold"
                              >
                                <Bold size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  const current = elements.find(el => el.id === selectedIds[0])?.fontStyle || 'normal';
                                  const isBold = current.includes('bold');
                                  const isItalic = current.includes('italic');
                                  let next = isItalic ? (isBold ? 'bold' : 'normal') : (isBold ? 'bold italic' : 'italic');
                                  updateSelectedProperty({ fontStyle: next });
                                }}
                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${elements.find(el => el.id === selectedIds[0])?.fontStyle?.includes('italic') ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-white/40'}`}
                                title="Italic"
                              >
                                <Italic size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  const current = elements.find(el => el.id === selectedIds[0])?.textDecoration || 'none';
                                  updateSelectedProperty({ textDecoration: current === 'underline' ? 'none' : 'underline' });
                                }}
                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${elements.find(el => el.id === selectedIds[0])?.textDecoration === 'underline' ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-white/40'}`}
                                title="Underline"
                              >
                                <Underline size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-1 mt-1">
                            <div className="flex-1 flex gap-1 bg-black/20 rounded-lg p-1">
                              <button 
                                onClick={() => updateSelectedProperty({ align: 'left' })}
                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${elements.find(el => el.id === selectedIds[0])?.align === 'left' ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-white/40'}`}
                                title="Align Left"
                              >
                                <AlignLeft size={14} />
                              </button>
                              <button 
                                onClick={() => updateSelectedProperty({ align: 'center' })}
                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${elements.find(el => el.id === selectedIds[0])?.align === 'center' ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-white/40'}`}
                                title="Align Center"
                              >
                                <AlignCenter size={14} />
                              </button>
                              <button 
                                onClick={() => updateSelectedProperty({ align: 'right' })}
                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${elements.find(el => el.id === selectedIds[0])?.align === 'right' ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-white/40'}`}
                                title="Align Right"
                              >
                                <AlignRight size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-1 mt-1">
                            <div className="flex-1 flex gap-1 bg-black/20 rounded-lg p-1">
                              <button 
                                onClick={() => updateSelectedProperty({ verticalAlign: 'top' })}
                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${elements.find(el => el.id === selectedIds[0])?.verticalAlign === 'top' ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-white/40'}`}
                                title="Vertical Align Top"
                              >
                                <AlignVerticalJustifyStart size={14} />
                              </button>
                              <button 
                                onClick={() => updateSelectedProperty({ verticalAlign: 'middle' })}
                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${elements.find(el => el.id === selectedIds[0])?.verticalAlign === 'middle' ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-white/40'}`}
                                title="Vertical Align Middle"
                              >
                                <AlignVerticalJustifyCenter size={14} />
                              </button>
                              <button 
                                onClick={() => updateSelectedProperty({ verticalAlign: 'bottom' })}
                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${elements.find(el => el.id === selectedIds[0])?.verticalAlign === 'bottom' ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-white/40'}`}
                                title="Vertical Align Bottom"
                              >
                                <AlignVerticalJustifyEnd size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activePropTab === 'style' && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                         <span className="text-[10px] text-white/40 uppercase font-bold">Fills & Colors</span>
                         <div className="grid grid-cols-6 gap-2">
                           {COLORS.map((c) => (
                             <button 
                               key={c}
                               onClick={() => updateSelectedProperty({ stroke: c, fill: c + '20' })}
                               className={`w-6 h-6 rounded-full border-2 transition-all ${elements.find(el => el.id === selectedIds[0])?.stroke === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                               style={{ backgroundColor: c }}
                             />
                           ))}
                         </div>
                       </div>

                       <div className="flex flex-col gap-2 pt-2">
                         <span className="text-[10px] text-white/40 uppercase font-bold">Line & Border Size</span>
                         <div className="flex gap-2">
                           {[1, 2, 4, 8].map((size) => (
                             <button
                               key={size}
                               onClick={() => updateSelectedProperty({ strokeWidth: size })}
                               className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all border ${elements.find(el => el.id === selectedIds[0])?.strokeWidth === size ? 'bg-purple-500/20 border-purple-500/50 shadow-lg text-purple-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                               title={`${size}px Border/Line`}
                             >
                               <div className="bg-current rounded-full" style={{ width: size + 16, height: size }} />
                             </button>
                           ))}
                         </div>
                       </div>

                       <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-3">
                          <div className="flex justify-between text-[9px] text-white/30 uppercase">
                            <span>Transparency</span>
                            <span className="text-white/60">{Math.round((elements.find(el => el.id === selectedIds[0])?.opacity ?? 1) * 100)}%</span>
                          </div>
                          <input 
                             type="range" min="0" max="1" step="0.1"
                             className="w-full accent-purple-500"
                             value={elements.find(el => el.id === selectedIds[0])?.opacity ?? 1}
                             onChange={(e) => updateSelectedProperty({ opacity: parseFloat(e.target.value) })}
                          />
                       </div>

                       <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-3">
                         <span className="text-[10px] text-white/40 uppercase font-bold">Corner Radius</span>
                         <div className="flex justify-between text-[9px] text-white/30 uppercase">
                           <span>Corners</span>
                           <span className="text-white/60">{elements.find(el => el.id === selectedIds[0])?.cornerRadius ?? 4}px</span>
                         </div>
                         <input 
                           type="range" min="0" max="60" step="1"
                           className="w-full accent-purple-500"
                           value={elements.find(el => el.id === selectedIds[0])?.cornerRadius ?? 4}
                           onChange={(e) => updateSelectedProperty({ cornerRadius: parseInt(e.target.value) })}
                         />
                       </div>

                       <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-3">
                         <span className="text-[10px] text-white/40 uppercase font-bold">Shadow</span>
                         <div className="flex gap-2">
                           {[0, 4, 12, 24].map((blur) => (
                             <button
                               key={blur}
                               onClick={() => updateSelectedProperty({ shadowBlur: blur, shadowColor: blur === 0 ? 'transparent' : (elements.find(el => el.id === selectedIds[0])?.stroke || '#000000') + '80' })}
                               className={`flex-1 h-8 rounded-lg text-[9px] font-bold uppercase transition-all border ${(elements.find(el => el.id === selectedIds[0])?.shadowBlur ?? 0) === blur ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                             >
                               {blur === 0 ? 'None' : `${blur}px`}
                             </button>
                           ))}
                         </div>
                       </div>
                     </motion.div>
                   )}

                  {activePropTab === 'layout' && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                           <div className="flex flex-col gap-1">
                             <span className="text-[9px] text-white/30 uppercase">X Position</span>
                             <input 
                               type="number"
                               className="input-glass text-xs py-1.5"
                               value={Math.round(elements.find(el => el.id === selectedIds[0])?.x || 0)}
                               onChange={(e) => updateSelectedProperty({ x: parseInt(e.target.value) })}
                             />
                           </div>
                           <div className="flex flex-col gap-1">
                             <span className="text-[9px] text-white/30 uppercase">Y Position</span>
                             <input 
                               type="number"
                               className="input-glass text-xs py-1.5"
                               value={Math.round(elements.find(el => el.id === selectedIds[0])?.y || 0)}
                               onChange={(e) => updateSelectedProperty({ y: parseInt(e.target.value) })}
                             />
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="flex flex-col gap-1">
                             <span className="text-[9px] text-white/30 uppercase">Width</span>
                             <input 
                               type="number"
                               className="input-glass text-xs py-1.5"
                               value={elements.find(el => el.id === selectedIds[0])?.width || 0}
                               onChange={(e) => updateSelectedProperty({ width: parseInt(e.target.value) })}
                             />
                           </div>
                           <div className="flex flex-col gap-1">
                             <span className="text-[9px] text-white/30 uppercase">Height</span>
                             <input 
                               type="number"
                               className="input-glass text-xs py-1.5"
                               value={elements.find(el => el.id === selectedIds[0])?.height || 0}
                               onChange={(e) => updateSelectedProperty({ height: parseInt(e.target.value) })}
                             />
                           </div>
                        </div>
                        
                         <div className="flex flex-col gap-2">
                            <div className="flex justify-between text-[9px] text-white/30 uppercase">
                              <span>Rotation</span>
                              <span className="text-white/60">{Math.round(elements.find(el => el.id === selectedIds[0])?.rotation || 0)}°</span>
                            </div>
                            <input 
                              type="range" min="0" max="360" step="1"
                              className="w-full accent-purple-500"
                              value={elements.find(el => el.id === selectedIds[0])?.rotation || 0}
                              onChange={(e) => updateSelectedProperty({ rotation: parseInt(e.target.value) })}
                            />
                         </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                           <button 
                             onClick={() => {
                               selectedIds.forEach(id => socket?.emit('element:delete', id));
                               setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
                               setSelectedIds([]);
                             }}
                             className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2"
                           >
                             <Trash2 size={16} /> Delete Element
                           </button>
                        </div>
                     </motion.div>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>

        {/* Text Input Modal */}
        <AnimatePresence>
          {showTextModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowTextModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="panel p-6 rounded-2xl w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Add Text</h3>
                  <button onClick={() => setShowTextModal(false)} className="text-white/40 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <input
                  autoFocus
                  type="text"
                  placeholder="Type something..."
                  className="input-glass w-full mb-4"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                />
                <button onClick={handleAddText} className="btn-primary w-full">
                  Place on Canvas
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* AI Design Modal */}
        <AnimatePresence>
          {showAIModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAIModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="panel p-6 rounded-2xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-purple-400" />
                    <h3 className="text-lg font-bold text-white">AI Design Maker</h3>
                  </div>
                  <button onClick={() => setShowAIModal(false)} className="text-white/40 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mb-2">Design Style</p>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { id: 'modern', label: 'Modern', icon: <Layers size={14} /> },
                    { id: 'hand-drawn', label: 'Sketch', icon: <Hand size={14} /> },
                    { id: 'minimalist', label: 'Minimal', icon: <Square size={14} /> },
                    { id: 'technical', label: 'Tech', icon: <Activity size={14} /> }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setAiStyle(s.id)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${aiStyle === s.id ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                    >
                      {s.icon}
                      <span className="text-[10px] font-bold">{s.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex justify-between items-center">
                    <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Image Reference</p>
                    {aiImage && (
                      <button onClick={() => setAiImage(null)} className="text-[10px] text-red-400 hover:underline">Remove</button>
                    )}
                  </div>
                <div 
                  className={`relative w-full h-24 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden ${aiImage ? 'border-purple-500/40 bg-purple-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                  onPaste={(e) => {
                    const item = e.clipboardData.items[0];
                    if (item && item.type.startsWith('image')) {
                      const file = item.getAsFile();
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setAiImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                >
                    {!aiImage ? (
                      <>
                        <ImageIcon size={20} className="text-white/20" />
                        <span className="text-[10px] text-white/40">Drop or Paste Image</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setAiImage(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </>
                    ) : (
                      <img src={aiImage} alt="Ref" className="w-full h-full object-cover rounded-lg opacity-80" />
                    )}
                  </div>
                </div>

                <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mb-2">Instructions</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {[
                    { label: 'Sitemap', prompt: 'Create a sitemap for a multi-page e-commerce website with home, category, product, cart, and checkout pages.' },
                    { label: 'Flux Flow', prompt: 'A flux architecture diagram showing Action, Dispatcher, Store, and View.' },
                    { label: 'Mind Map', prompt: 'A central idea about Productivity with 4 branching categories.' },
                    { label: 'User Persona', prompt: 'A user persona card layout with photo area, bio, goals, and frustrations sections.' }
                  ].map(q => (
                    <button 
                      key={q.label}
                      onClick={() => setAiPrompt(q.prompt)} 
                      className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] text-white/40 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
                    >
                      + {q.label}
                    </button>
                  ))}
                </div>
                <textarea
                  autoFocus
                  placeholder="e.g., A microservices architecture with a Central Bus..."
                  className="input-glass w-full mb-4 h-24 resize-none text-xs"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <div className="flex gap-2">
                  {elements.length > 0 && (
                    <button 
                      onClick={() => generateAIDesign('refine')} 
                      disabled={isGenerating}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 py-3 text-xs"
                    >
                      <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                      Refine Design
                    </button>
                  )}
                  <button 
                    onClick={() => generateAIDesign('new')} 
                    disabled={isGenerating}
                    className="flex-[2] btn-primary flex flex-col items-center justify-center gap-1 disabled:opacity-50 py-3"
                  >
                    {isGenerating ? (
                      <span className="text-xs font-medium animate-pulse">{loadingMessage}</span>
                    ) : (
                      <div className="flex items-center gap-2 text-xs">
                        <Sparkles size={16} />
                        <span>Generate {elements.length > 0 ? 'New' : 'Masterpiece'}</span>
                      </div>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="panel p-6 rounded-2xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Database size={20} className="text-purple-400" />
                    <h3 className="text-lg font-bold text-white">Canvas Settings</h3>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Canvas Background</span>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'dark', label: 'Dark', hex: '#0d0d11', desc: 'Near Black' },
                        { id: 'dim', label: 'Studio', hex: '#1a1c2e', desc: 'Deep Blue' },
                        { id: 'light', label: 'Light', hex: '#f1f5f9', desc: 'Slate 100' },
                      ] as const).map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setCanvasBg(opt.id)}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${canvasBg === opt.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                        >
                          <div className="w-8 h-8 rounded-lg border border-white/10" style={{ backgroundColor: opt.hex }} />
                          <span className={`text-[10px] font-bold ${canvasBg === opt.id ? 'text-purple-400' : 'text-white/40'}`}>{opt.label}</span>
                          <span className="text-[8px] text-white/20">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Grid Configuration</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-white/30 uppercase">Grid Size</label>
                        <input 
                          type="number" 
                          className="input-glass text-xs"
                          value={gridSize}
                          onChange={(e) => setGridSize(Math.max(5, parseInt(e.target.value) || 20))}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-white/30 uppercase">Grid Color</label>
                        <input 
                          type="color" 
                          className="w-full h-8 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                          value={gridColor.startsWith('rgba') ? '#ffffff' : gridColor}
                          onChange={(e) => setGridColor(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Preferences</span>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={showGrid} 
                          onChange={(e) => setShowGrid(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/20"
                        />
                        <span className="text-sm text-white/60 group-hover:text-white transition-colors">Show Grid</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={gridDash} 
                          onChange={(e) => setGridDash(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/20"
                        />
                        <span className="text-sm text-white/60 group-hover:text-white transition-colors">Dashed Grid Lines</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={snapToGrid} 
                          onChange={(e) => setSnapToGrid(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/20"
                        />
                        <span className="text-sm text-white/60 group-hover:text-white transition-colors">Snap to Grid</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={showRulers} 
                          onChange={(e) => setShowRulers(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/20"
                        />
                        <span className="text-sm text-white/60 group-hover:text-white transition-colors">Show Rulers</span>
                      </label>
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowSettings(false)} className="btn-primary w-full mt-8">
                  Save Changes
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Find & Focus Modal */}
        <AnimatePresence>
          {showFind && (
            <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm" onClick={() => setShowFind(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="panel p-3 rounded-2xl w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 mb-3 border border-white/10">
                  <Search size={16} className="text-white/40 flex-shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search elements by name, type..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/20"
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setShowFind(false)}
                  />
                  <kbd className="text-[9px] bg-white/10 text-white/30 px-1.5 py-0.5 rounded">ESC</kbd>
                </div>
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {elements
                    .filter(el => {
                      if (!findQuery) return true;
                      const q = findQuery.toLowerCase();
                      return el.type.includes(q) || (el.text || '').toLowerCase().includes(q);
                    })
                    .slice(0, 20)
                    .map(el => (
                      <button
                        key={el.id}
                        onClick={() => {
                          setSelectedIds([el.id]);
                          const cx = stageSize.width / 2;
                          const cy = stageSize.height / 2;
                          setView(prev => ({ ...prev, x: cx - el.x * prev.scale, y: cy - el.y * prev.scale }));
                          setShowFind(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-left transition-all group"
                      >
                        <div className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: (el.fill || el.stroke) + '30', color: el.stroke }}>
                          {el.type.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white/80 font-medium truncate">{el.text || `(${el.type})`}</div>
                          <div className="text-[9px] text-white/30">{el.type} &bull; x:{Math.round(el.x)}, y:{Math.round(el.y)}</div>
                        </div>
                        <span className="text-[9px] text-white/20 group-hover:text-white/60 transition-colors">Focus →</span>
                      </button>
                    ))}
                  {elements.filter(el => !findQuery || el.type.includes(findQuery.toLowerCase()) || (el.text || '').toLowerCase().includes(findQuery.toLowerCase())).length === 0 && (
                    <div className="text-center py-8 text-white/20 text-sm">No elements found</div>
                  )}
                </div>
                <div className="mt-2 px-1 text-[9px] text-white/20">{elements.length} elements on canvas</div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Saved Projects Modal */}
        <AnimatePresence>
          {showSavedProjects && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSavedProjects(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="panel p-6 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={20} className="text-blue-400" />
                    <h3 className="text-lg font-bold text-white">Saved Projects</h3>
                    <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{savedProjects.length}</span>
                  </div>
                  <button onClick={() => setShowSavedProjects(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
                </div>

                {/* Save current */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { saveProject(); setShowSavedProjects(false); }}
                    className="flex-1 py-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Save size={14} /> Save Current Canvas
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                  {savedProjects.length === 0 && (
                    <div className="text-center py-12 text-white/20">
                      <Save size={32} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No saved projects yet.</p>
                      <p className="text-xs mt-1">Save your canvas to restore it later.</p>
                    </div>
                  )}
                  {savedProjects.map(project => (
                    <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{project.name}</div>
                        <div className="text-[10px] text-white/30">{project.elements.length} elements &bull; {new Date(project.savedAt).toLocaleDateString()} {new Date(project.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => loadProject(project)}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/10 transition-all"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => setSavedProjects(prev => { const next = prev.filter(p => p.id !== project.id); localStorage.setItem('collab-saved-projects', JSON.stringify(next)); return next; })}
                          className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] border border-red-500/10 transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Presentation Mode Overlay */}
        <AnimatePresence>
          {isPresentationMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-600/90 text-white text-xs font-bold shadow-xl backdrop-blur-md border border-indigo-400/30"
            >
              <Monitor size={14} />
              PRESENTATION MODE — Editing Locked
              <button
                onClick={() => setIsPresentationMode(false)}
                className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-all"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Modal */}
        <AnimatePresence>
          {showHelp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="panel p-6 rounded-2xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Activity size={20} className="text-purple-400" />
                    <h3 className="text-lg font-bold text-white">Help & Shortcuts</h3>
                  </div>
                  <button onClick={() => setShowHelp(false)} className="text-white/40 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Keyboard Shortcuts</span>
                      <div className="flex flex-col gap-2">
                        {[
                          { key: 'Ctrl + A', desc: 'Select All' },
                          { key: 'Ctrl + C / V', desc: 'Copy / Paste' },
                          { key: 'Ctrl + X', desc: 'Cut' },
                          { key: 'Ctrl + D', desc: 'Duplicate' },
                          { key: 'Ctrl + Z / Y', desc: 'Undo / Redo' },
                          { key: 'Del / Backspace', desc: 'Delete Selected' },
                          { key: 'Arrows / Shift+Arrows', desc: 'Nudge Selection' },
                          { key: 'Space + Drag', desc: 'Pan Canvas' },
                          { key: 'Ctrl + +/-/0', desc: 'Zoom In/Out/Reset' },
                          { key: '[ / ]', desc: 'Layer Reorder' },
                          { key: 'V / H', desc: 'Select / Hand Tool' },
                          { key: 'G / F', desc: 'Grid / Zoom to Fit' },
                          { key: 'Esc', desc: 'Deselect / Cancel' },
                        ].map(s => (
                          <div key={s.key} className="flex justify-between items-center text-sm">
                            <span className="text-white/40">{s.desc}</span>
                            <kbd className="px-2 py-1 rounded bg-white/10 text-white/80 font-mono text-[10px]">{s.key}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Rulers & Guides</span>
                      <p className="text-sm text-white/60">Click on the rulers to add a guide. Guides help you align elements perfectly. Click a guide line to remove it.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Collaboration</span>
                      <p className="text-sm text-white/60">Everything you do is synced in real-time. You can see other users' cursors and their changes instantly.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Note on Errors</span>
                      <p className="text-[10px] text-white/30 italic">WebSocket connection errors in the console are expected in this environment and do not affect the application's functionality.</p>
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowHelp(false)} className="btn-primary w-full mt-8">
                  Got it!
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Inline Editor Overlay */}
        {editingId && elements.find(el => el.id === editingId) && (
          <div 
            className="absolute z-50 pointer-events-none"
            style={{
              left: (elements.find(el => el.id === editingId)!.x * view.scale + view.x),
              top: (elements.find(el => el.id === editingId)!.y * view.scale + view.y),
              width: (elements.find(el => el.id === editingId)!.width || 100) * view.scale,
              height: (elements.find(el => el.id === editingId)!.height || 100) * view.scale,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10 * view.scale
            }}
          >
            <textarea
              autoFocus
              className="w-full h-full bg-transparent border-none outline-none text-center resize-none pointer-events-auto m-0 p-0 overflow-hidden"
              style={{
                fontSize: (elements.find(el => el.id === editingId)!.fontSize || 14) * view.scale,
                fontFamily: (elements.find(el => el.id === editingId)!.fontFamily || 'Inter, sans-serif'),
                color: elements.find(el => el.id === editingId)!.type === 'sticky' ? '#92400e' : (elements.find(el => el.id === editingId)!.stroke || '#ffffff'),
                fontStyle: elements.find(el => el.id === editingId)!.fontStyle || 'normal',
                lineHeight: 1.2
              }}
              value={elements.find(el => el.id === editingId)!.text || ''}
              onChange={(e) => {
                const text = e.target.value;
                setElements(prev => prev.map(el => el.id === editingId ? { ...el, text } : el));
                socket?.emit('element:update', { id: editingId, text });
              }}
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   setEditingId(null);
                }
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

