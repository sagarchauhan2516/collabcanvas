export type ElementType = 'rect' | 'circle' | 'line' | 'text' | 'diamond' | 'database' | 'cloud' | 'user' | 'document' | 'process' | 'sticky' | 'arrow' | 'star' | 'hexagon' | 'triangle' | 'image' | 'emoji' | 'logo' | 'pencil' | 'frame';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  pencilPoints?: number[]; // For freehand pencil tool (relative to element x,y)
  initialX?: number; // Used for drawing logic
  initialY?: number;
  scaleX?: number;
  scaleY?: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  text?: string;
  src?: string; // For images and logos
  rotation?: number;
  opacity?: number;
  shadowBlur?: number;
  shadowColor?: string;
  cornerRadius?: number;
  fillType?: 'solid' | 'linear' | 'radial';
  gradientColors?: string[];
  groupId?: string;
  frameId?: string; // For elements contained within a Frame
  fontSize?: number;
  fontStyle?: string;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  textDecoration?: 'none' | 'underline' | 'line-through';
  locked?: boolean;
  visible?: boolean;
  startBindingId?: string;
  endBindingId?: string;
  bindingOffsetStart?: { x: number; y: number };
  bindingOffsetEnd?: { x: number; y: number };
}

export interface Guide {
  id: string;
  type: 'horizontal' | 'vertical';
  pos: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

export interface SavedProject {
  id: string;
  name: string;
  elements: CanvasElement[];
  savedAt: number;
}
