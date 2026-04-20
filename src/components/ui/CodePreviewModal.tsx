import { Code, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export function CodePreviewModal({ 
  isOpen, 
  onClose, 
  code, 
  isLoading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  code: string; 
  isLoading: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // try to get clean code without markdown backticks if present
    let textToCopy = code;
    if (textToCopy.startsWith('```')) {
      const lines = textToCopy.split('\n');
      lines.shift(); // remove first line like ```tsx
      if (lines[lines.length - 1].startsWith('```')) {
        lines.pop(); // remove last line
      }
      textToCopy = lines.join('\n');
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="panel flex flex-col p-6 rounded-2xl w-full max-w-4xl max-h-[80vh] border border-white/10 shadow-[0_0_40px_rgba(168,85,247,0.2)] bg-[#121212]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Code size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">AI Canvas-to-Code</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">Generative Wireframe Export</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isLoading && code && (
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors border border-white/5 text-xs font-medium"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors" aria-label="Close modal">
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden relative rounded-xl border border-white/10 bg-[#0a0a0a]">
              {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]">
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-400 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Code size={20} className="text-blue-400 animate-pulse" />
                    </div>
                  </div>
                  <h4 className="text-white font-medium mb-2">Compiling your canvas...</h4>
                  <p className="text-xs text-white/40 text-center max-w-xs">Our AI is analyzing the spatial relationships of your elements and writing the code.</p>
                </div>
              ) : code ? (
                <pre className="p-4 h-full overflow-auto text-xs font-mono text-white/80 leading-relaxed custom-scrollbar whitespace-pre-wrap word-break">
                  {code}
                </pre>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                  <Code size={32} className="mb-4 opacity-50" />
                  <p className="text-sm">No code generated yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
