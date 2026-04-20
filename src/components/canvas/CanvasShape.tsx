import { memo, useState } from 'react';
import { Group, Rect, Circle, Line, Text, Path, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { CanvasElement } from '../../types';

export const URLImage = ({ src, width, height, isSelected, ...props }: { src: string, width?: number, height?: number, isSelected?: boolean, [key: string]: any }) => {
  const [image, status] = useImage(src, 'anonymous');
  
  if (status === 'loading') {
    return (
      <Group {...props}>
        <Rect width={width} height={height} fill="rgba(255,255,255,0.05)" cornerRadius={4} />
      </Group>
    );
  }

  if (status === 'failed' || !image) {
    return (
      <Group {...props}>
        <Rect width={width} height={height} fill="rgba(255,255,255,0.05)" stroke={isSelected ? "#bb86fc" : "rgba(255,255,255,0.1)"} strokeWidth={1} cornerRadius={4} />
        <Text text="?" width={width} height={height} align="center" verticalAlign="middle" fill="white" opacity={0.3} fontSize={12} />
      </Group>
    );
  }
  
  return <KonvaImage image={image} width={width} height={height} {...props} />;
};

export const CanvasShape = memo(({ element, isSelected, tool, onClick, onDblClick, onDragEnd, onDragMove }: { 
  element: CanvasElement, 
  isSelected?: boolean,
  tool?: string,
  onClick?: (e: any) => void,
  onDblClick?: (e: any) => void,
  onDragEnd?: (e: any) => void,
  onDragMove?: (e: any) => void
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const containerProps: any = {
    id: element.id,
    name: element.type,
    type: element.type,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    scaleX: element.scaleX ?? 1,
    scaleY: element.scaleY ?? 1,
    draggable: tool === 'select' && !element.locked,
    onDragEnd,
    onDragMove,
    onClick,
    onTap: onClick,
    onDblClick,
    onDblTap: onDblClick,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    opacity: element.opacity ?? (isSelected ? 1 : isHovered ? 0.9 : 1),
    width: element.type === 'circle' ? (element.radius || 0) * 2 : (element.width || 0),
    height: element.type === 'circle' ? (element.radius || 0) * 2 : (element.height || 0),
    hitStrokeWidth: 20,
  };

  const shapeProps = {
    stroke: element.stroke,
    strokeWidth: element.strokeWidth,
    strokeScaleEnabled: false,
    fill: (element.fillType === 'linear' || element.fillType === 'radial') && element.gradientColors ? undefined : element.fill,
    fillLinearGradientStartPoint: element.fillType === 'linear' ? { x: 0, y: 0 } : undefined,
    fillLinearGradientEndPoint: element.fillType === 'linear' ? { x: element.width || 100, y: element.height || 100 } : undefined,
    fillLinearGradientColorStops: (element.fillType === 'linear' || element.fillType === 'radial') && element.gradientColors ? [0, element.gradientColors[0], 1, element.gradientColors[1] || element.gradientColors[0]] : undefined,
    fillRadialGradientStartPoint: element.fillType === 'radial' ? { x: (element.width || 0) / 2, y: (element.height || 0) / 2 } : undefined,
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndPoint: element.fillType === 'radial' ? { x: (element.width || 0) / 2, y: (element.height || 0) / 2 } : undefined,
    fillRadialGradientEndRadius: element.fillType === 'radial' ? Math.max(element.width || 0, element.height || 0) / 2 : undefined,
    shadowColor: element.shadowColor || (isSelected ? '#bb86fc' : isHovered ? 'rgba(187, 134, 252, 0.4)' : 'transparent'),
    shadowBlur: element.shadowBlur ?? (isSelected ? 15 : isHovered ? 8 : 0),
    cornerRadius: element.cornerRadius,
    perfectDrawEnabled: false,
  };

  const renderText = () => {
    if (!element.text && element.type !== 'sticky') return null;
    const isTextElement = element.type === 'text';
    if (isTextElement) return null;

    return (
      <Text
        text={element.text || ''}
        width={element.width}
        height={element.height}
        padding={10}
        align={element.align || "center"}
        verticalAlign={element.verticalAlign || "middle"}
        fontSize={element.fontSize || Math.min((element.width || 100) / 5, 14)}
        fontFamily={element.fontFamily || 'Inter, sans-serif'}
        fill={element.type === 'sticky' ? '#92400e' : (element.stroke || '#ffffff')}
        fontStyle={element.fontStyle || (element.type === 'sticky' ? 'italic' : 'normal')}
        textDecoration={element.textDecoration || 'none'}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  };

  switch (element.type) {
    case 'rect':
      return (
        <Group {...containerProps}>
          <Rect width={element.width} height={element.height} {...shapeProps} x={0} y={0} cornerRadius={element.cornerRadius ?? 4} />
          {renderText()}
        </Group>
      );
    case 'frame':
      return (
        <Group {...containerProps}>
          <Rect
            width={element.width || 200}
            height={element.height || 150}
            fill={element.fill || 'rgba(99, 102, 241, 0.04)'}
            stroke={element.stroke || '#6366f1'}
            strokeWidth={element.strokeWidth || 1.5}
            dash={[6, 3]}
            cornerRadius={element.cornerRadius ?? 4}
            x={0} y={0}
            shadowColor={isSelected ? '#bb86fc' : 'transparent'}
            shadowBlur={isSelected ? 10 : 0}
          />
          <Text
            text={element.text || 'Frame'}
            x={6}
            y={-18}
            fontSize={11}
            fill={element.stroke || '#6366f1'}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            listening={false}
            perfectDrawEnabled={false}
            opacity={0.9}
          />
          {renderText()}
        </Group>
      );
    case 'process':
      return (
        <Group {...containerProps}>
          <Rect width={element.width} height={element.height} {...shapeProps} x={0} y={0} cornerRadius={element.cornerRadius ?? 0} />
          {renderText()}
        </Group>
      );
    case 'circle':
      const radius = element.radius || 0;
      return (
        <Group {...containerProps}>
          <Circle x={radius} y={radius} radius={radius} {...shapeProps} />
          {renderText()}
        </Group>
      );
    case 'diamond':
      return (
        <Group 
          {...containerProps}
          offsetX={(element.width || 0) / 2} 
          offsetY={(element.height || 0) / 2}
          x={element.x + (element.width || 0) / 2}
          y={element.y + (element.height || 0) / 2}
        >
          <Rect 
            width={element.width} height={element.height} 
            {...shapeProps}
            x={(element.width || 0) / 2} 
            y={(element.height || 0) / 2}
            rotation={45} 
            offsetX={(element.width || 0) / 2} 
            offsetY={(element.height || 0) / 2} 
          />
          {renderText()}
        </Group>
      );
    case 'database':
      return (
        <Group {...containerProps}>
          <Rect width={element.width} height={element.height} fill="rgba(0,0,0,0)" x={0} y={0} cornerRadius={10} />
          <Rect width={element.width} height={element.height} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} cornerRadius={10} listening={false} perfectDrawEnabled={false} />
          <Line points={[0, 10, element.width || 0, 10]} stroke={element.stroke} strokeWidth={element.strokeWidth} listening={false} perfectDrawEnabled={false} />
          <Line points={[0, (element.height || 0) - 10, element.width || 0, (element.height || 0) - 10]} stroke={element.stroke} strokeWidth={element.strokeWidth} listening={false} perfectDrawEnabled={false} />
          {renderText()}
        </Group>
      );
    case 'cloud':
      return (
        <Group {...containerProps}>
          <Rect width={element.width} height={element.height} fill="transparent" stroke="transparent" />
          <Circle x={(element.width || 0) * 0.3} y={(element.height || 0) * 0.5} radius={(element.width || 0) * 0.3} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} listening={false} perfectDrawEnabled={false} />
          <Circle x={(element.width || 0) * 0.7} y={(element.height || 0) * 0.5} radius={(element.width || 0) * 0.3} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} listening={false} perfectDrawEnabled={false} />
          <Circle x={(element.width || 0) * 0.5} y={(element.height || 0) * 0.3} radius={(element.width || 0) * 0.3} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} listening={false} perfectDrawEnabled={false} />
          <Rect x={(element.width || 0) * 0.3} y={(element.height || 0) * 0.4} width={(element.width || 0) * 0.4} height={(element.height || 0) * 0.4} fill={element.fill} stroke="transparent" listening={false} perfectDrawEnabled={false} />
          {renderText()}
        </Group>
      );
    case 'user':
      return (
        <Group {...containerProps}>
          <Rect width={element.width} height={element.height} fill="rgba(0,0,0,0)" x={0} y={0} cornerRadius={8} />
          <Circle x={(element.width || 0) * 0.5} y={(element.height || 0) * 0.3} radius={(element.width || 0) * 0.2} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} listening={false} perfectDrawEnabled={false} />
          <Path 
            data={`M ${(element.width || 0) * 0.2} ${(element.height || 0) * 0.9} Q ${(element.width || 0) * 0.5} ${(element.height || 0) * 0.5} ${(element.width || 0) * 0.8} ${(element.height || 0) * 0.9} Z`}
            fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth}
            listening={false} perfectDrawEnabled={false}
          />
          {renderText()}
        </Group>
      );
    case 'document':
      return (
        <Group {...containerProps}>
          <Rect width={element.width} height={element.height} fill="rgba(0,0,0,0)" x={0} y={0} />
          <Path 
            data={`M 0 0 L ${(element.width || 0) * 0.7} 0 L ${element.width} ${(element.height || 0) * 0.2} L ${element.width} ${element.height} L 0 ${element.height} Z`}
            fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth}
            listening={false} perfectDrawEnabled={false}
          />
          <Line points={[(element.width || 0) * 0.7, 0, (element.width || 0) * 0.7, (element.height || 0) * 0.2, element.width || 0, (element.height || 0) * 0.2]} stroke={element.stroke} strokeWidth={element.strokeWidth} listening={false} perfectDrawEnabled={false} />
          {renderText()}
        </Group>
      );
    case 'sticky':
      const stickyFill = element.fillType === 'solid' || !element.fillType ? (element.fill || '#fef3c7') : undefined;
      return (
        <Group {...containerProps}>
          <Rect 
            width={element.width} height={element.height} 
            fill={stickyFill}
            fillLinearGradientStartPoint={shapeProps.fillLinearGradientStartPoint}
            fillLinearGradientEndPoint={shapeProps.fillLinearGradientEndPoint}
            fillLinearGradientColorStops={shapeProps.fillLinearGradientColorStops}
            fillRadialGradientStartPoint={shapeProps.fillRadialGradientStartPoint}
            fillRadialGradientStartRadius={shapeProps.fillRadialGradientStartRadius}
            fillRadialGradientEndPoint={shapeProps.fillRadialGradientEndPoint}
            fillRadialGradientEndRadius={shapeProps.fillRadialGradientEndRadius}
            stroke="#f59e0b" strokeWidth={1} shadowBlur={5} shadowOpacity={0.2} 
            perfectDrawEnabled={false}
          />
          <Text 
            text={element.text || ''} 
            width={element.width} height={element.height} 
            padding={10} align="center" verticalAlign="middle" 
            fontSize={14} fill="#92400e" fontStyle="italic"
            listening={false}
          />
        </Group>
      );
    case 'arrow':
      const [x1, y1, x2, y2] = element.points || [0, 0, 0, 0];
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = 15;
      return (
        <Group {...containerProps}>
          <Line 
            points={[x1, y1, x2, y2]} 
            stroke="transparent" 
            strokeWidth={Math.max(20, (element.strokeWidth || 2) * 5)} 
          />
          <Line 
            points={[x1, y1, x2, y2]} 
            {...shapeProps} stroke={element.stroke} strokeWidth={element.strokeWidth} 
            lineCap="round" lineJoin="round"
            listening={false} perfectDrawEnabled={false}
          />
          <Line 
            points={[
              x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6),
              x2, y2,
              x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6)
            ]} 
            {...shapeProps} stroke={element.stroke} strokeWidth={element.strokeWidth} 
            lineCap="round" lineJoin="round"
            listening={false} perfectDrawEnabled={false}
          />
        </Group>
      );
    case 'image':
    case 'logo':
      return (
        <Group {...containerProps}>
          {element.src ? (
            <URLImage 
              src={element.src} 
              width={element.width} 
              height={element.height} 
              isSelected={isSelected}
              x={0} y={0}
            />
          ) : (
            <Rect 
              width={element.width} 
              height={element.height} 
              fill="#333" 
              stroke={element.stroke} 
              strokeWidth={1}
              x={0} y={0}
            />
          )}
          {renderText()}
        </Group>
      );
    case 'emoji':
      const fontSize = element.fontSize || 40;
      const emojiSize = element.width || fontSize;
      return (
        <Group {...containerProps}>
          <Rect 
            width={emojiSize}
            height={emojiSize}
            fill="transparent"
            listening={true}
          />
          <Text
            text={element.text}
            fontSize={fontSize}
            align="center"
            verticalAlign="middle"
            width={emojiSize}
            height={emojiSize}
            fill="#ffffff"
            fontFamily='"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif'
            padding={0}
            listening={false}
          />
        </Group>
      );
    case 'star':
      return (
        <Group {...containerProps}>
          <Path 
            data="M 50,0 L 61.8,35.3 L 97.6,35.3 L 68.6,56.3 L 79.4,90.3 L 50,69.2 L 20.6,90.3 L 31.4,56.3 L 2.4,35.3 L 38.2,35.3 Z"
            scaleX={(element.width || 100) / 100}
            scaleY={(element.height || 100) / 100}
            {...shapeProps}
            x={0} y={0}
          />
          {renderText()}
        </Group>
      );
    case 'hexagon':
      return (
        <Group {...containerProps}>
          <Path 
            data="M 25,0 L 75,0 L 100,50 L 75,100 L 25,100 L 0,50 Z"
            scaleX={(element.width || 100) / 100}
            scaleY={(element.height || 100) / 100}
            {...shapeProps}
            x={0} y={0}
          />
          {renderText()}
        </Group>
      );
    case 'triangle':
      return (
        <Group {...containerProps}>
          <Path 
            data="M 50,0 L 100,100 L 0,100 Z"
            scaleX={(element.width || 100) / 100}
            scaleY={(element.height || 100) / 100}
            {...shapeProps}
            x={0} y={0}
          />
          {renderText()}
        </Group>
      );
    case 'pencil': {
      const pencilPts = element.pencilPoints || [0, 0, 0, 0];
      return (
        <Group {...containerProps}>
          {/* Invisible hit area */}
          <Rect
            width={Math.max(element.width || 20, 20)}
            height={Math.max(element.height || 20, 20)}
            fill="transparent"
            listening={true}
          />
          <Line
            points={pencilPts}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth || 2}
            tension={0.4}
            lineCap="round"
            lineJoin="round"
            listening={false}
            perfectDrawEnabled={false}
            opacity={element.opacity ?? 1}
            shadowColor={isSelected ? '#bb86fc' : element.shadowColor || 'transparent'}
            shadowBlur={isSelected ? 10 : (element.shadowBlur ?? 0)}
          />
        </Group>
      );
    }
    case 'line': {
      const [lx1, ly1, lx2, ly2] = element.points || [0, 0, 0, 0];
      return (
        <Group {...containerProps}>
          <Line 
            points={[lx1, ly1, lx2, ly2]} 
            stroke="transparent" 
            strokeWidth={Math.max(20, (element.strokeWidth || 2) * 5)} 
          />
          <Line 
            points={[lx1, ly1, lx2, ly2]} 
            {...shapeProps} stroke={element.stroke} strokeWidth={element.strokeWidth} 
            lineCap="round" lineJoin="round"
            listening={false} perfectDrawEnabled={false}
          />
        </Group>
      );
    }
    case 'text':
      return (
        <Text 
          {...containerProps}
          width={element.width || 200}
          height={element.height || 50}
          text={element.text} 
          fontSize={element.fontSize || 20} 
          fontFamily={element.fontFamily || 'Inter, sans-serif'}
          fill={element.stroke} 
          fontStyle={element.fontStyle || 'bold'}
          align={element.align || 'left'}
          verticalAlign={element.verticalAlign || 'top'}
          textDecoration={element.textDecoration || 'none'}
        />
      );
    default:
      return null;
  }
});
