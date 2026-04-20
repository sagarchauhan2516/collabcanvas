import { memo } from 'react';

export const ToolButton = memo(({ active, onClick, icon, label, type }: { active: boolean, onClick: () => void, icon: any, label: string, type?: string }) => {
  return (
    <button
      onClick={onClick}
      draggable={!!type}
      onDragStart={(e) => {
        if (type) {
          e.dataTransfer.setData('application/react-konva', type);
        }
      }}
      title={label}
      className={`tool-btn transition-all duration-200 active:scale-90 ${active ? 'tool-btn-active bg-purple-500/20 shadow-lg shadow-purple-500/20' : 'tool-btn-inactive hover:bg-white/5'}`}
    >
      {icon}
    </button>
  );
});

export const ContextMenuItem = ({ icon, label, onClick, danger }: { icon: any, label: string, onClick: () => void, danger?: boolean }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
  >
    {icon}
    <span className="flex-1 text-left">{label}</span>
  </button>
);
