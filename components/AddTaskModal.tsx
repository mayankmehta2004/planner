import React, { useState } from 'react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, scope: string[]) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [scopeInput, setScopeInput] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    
    // Parse scope by newlines
    const scope = scopeInput
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    onSave(title, scope);
    setTitle('');
    setScopeInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-md shadow-2xl relative">
        <h2 className="text-lg font-medium text-white mb-4">Add Task for Today</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Task Title</label>
            <input 
              autoFocus
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Email the design team"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Subtasks / Notes (Optional)</label>
            <textarea 
              value={scopeInput}
              onChange={(e) => setScopeInput(e.target.value)}
              placeholder="One per line..."
              className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-md px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors resize-none custom-scroll text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!title.trim()}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
              !title.trim() ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;