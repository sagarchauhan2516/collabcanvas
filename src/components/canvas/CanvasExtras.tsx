import { memo } from 'react';
import { Line, Group, Rect, Text } from 'react-konva';

export const GridLayer = memo(({ gridSize, gridColor, gridDash, scale, position, stageSize }: any) => {
  const lines = [];
  const startX = -position.x / scale;
  const startY = -position.y / scale;
  const endX = startX + stageSize.width / scale;
  const endY = startY + stageSize.height / scale;

  // Vertical lines
  for (let i = Math.floor(startX / gridSize) * gridSize; i <= endX; i += gridSize) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i, startY, i, endY]}
        stroke={gridColor}
        strokeWidth={1 / scale}
        dash={gridDash ? [5 / scale, 5 / scale] : undefined}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
    );
  }

  // Horizontal lines
  for (let i = Math.floor(startY / gridSize) * gridSize; i <= endY; i += gridSize) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[startX, i, endX, i]}
        stroke={gridColor}
        strokeWidth={1 / scale}
        dash={gridDash ? [5 / scale, 5 / scale] : undefined}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
    );
  }
  return <>{lines}</>;
});

export const CanvasRuler = memo(({ type, scale, position, stageSize, onAddGuide }: { 
  type: 'horizontal' | 'vertical', 
  scale: number, 
  position: { x: number, y: number },
  stageSize: { width: number, height: number },
  onAddGuide: (pos: number) => void
}) => {
  const isHorizontal = type === 'horizontal';
  const thickness = 20;
  const length = isHorizontal ? stageSize.width : stageSize.height;
  
  const step = 50;
  const start = isHorizontal ? -position.x / scale : -position.y / scale;
  const end = start + length / scale;
  
  const lines = [];
  for (let i = Math.floor(start / step) * step; i <= end; i += step) {
    const screenPos = i * scale + (isHorizontal ? position.x : position.y);
    lines.push(
      <Group key={i} x={isHorizontal ? screenPos : 0} y={isHorizontal ? 0 : screenPos}>
        <Line 
          points={isHorizontal ? [0, 0, 0, thickness] : [0, 0, thickness, 0]} 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth={1} 
          perfectDrawEnabled={false}
        />
        <Text 
          text={Math.round(i).toString()} 
          x={isHorizontal ? 2 : thickness - 18} 
          y={isHorizontal ? thickness - 18 : 2} 
          fontSize={8} 
          fill="rgba(255,255,255,0.5)" 
          rotation={isHorizontal ? 0 : -90}
          listening={false}
        />
      </Group>
    );
  }

  return (
    <Group 
      onMouseDown={(e) => {
        const stage = e.target.getStage();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const pos = isHorizontal ? (pointer.x - position.x) / scale : (pointer.y - position.y) / scale;
        onAddGuide(pos);
      }}
    >
      <Rect 
        width={isHorizontal ? stageSize.width : thickness} 
        height={isHorizontal ? thickness : stageSize.height} 
        fill="#1a1a1a" 
        stroke="rgba(255,255,255,0.1)"
        listening={true}
      />
      {lines}
    </Group>
  );
});

export const GuideLine = memo(({ guide, scale, position, stageSize, onRemove }: { 
  guide: any, 
  scale: number, 
  position: { x: number, y: number },
  stageSize: { width: number, height: number },
  onRemove: () => void
}) => {
  const isHorizontal = guide.type === 'horizontal';
  
  return (
    <Line 
      points={isHorizontal ? [-position.x / scale, guide.pos, (stageSize.width - position.x) / scale, guide.pos] : [guide.pos, -position.y / scale, guide.pos, (stageSize.height - position.y) / scale]}
      stroke="#3b82f6"
      strokeWidth={1 / scale}
      dash={[5 / scale, 5 / scale]}
      onClick={onRemove}
      hitStrokeWidth={10}
      perfectDrawEnabled={false}
    />
  );
});
