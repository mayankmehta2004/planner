import React, { useState, useEffect, useMemo } from 'react';
import { ExecutionData, ScheduledTask } from '../types';
import { ALIGNMENT_CLASSES, WALLPAPER_STYLES } from '../constants';
import { updateTaskStatus, processMissedTasks, saveExecutionData, addAdhocTask, deleteTask, updateTaskTitle, clearBacklog, resetApplication } from '../services/storageService';
import CalendarWidget from './CalendarWidget';
import QuoteWidget from './QuoteWidget';
import AddTaskModal from './AddTaskModal';

interface ExecutionModeProps {
  data: ExecutionData;
  onRefreshData: () => void;
}

const ExecutionMode: React.FC<ExecutionModeProps> = ({ data, onRefreshData }) => {
  // Initialize with current system date
  const [todayDate, setTodayDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null);
  
  // Modal & Sidebar State
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Edit State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // --- MIDNIGHT WATCHER ---
  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date().toISOString().split('T')[0];
      if (current !== todayDate) {
        console.log("Midnight detected! Updating schedule...");
        setTodayDate(current);
        processMissedTasks(); // Move yesterday's undone tasks to backlog
        onRefreshData();      // Reload full data
      }
    }, 60000); // Check every 60s
    return () => clearInterval(timer);
  }, [todayDate, onRefreshData]);

  useEffect(() => {
    processMissedTasks();
    onRefreshData(); 
  }, []);

  useEffect(() => {
    if (data.schedule[todayDate]) {
      setTasks(data.schedule[todayDate]);
    } else {
      setTasks([]);
    }
  }, [data, todayDate]);

  const goalTitleMap = useMemo(() => {
    const map: Record<string, string> = { 'adhoc': 'Quick Task' };
    data.goals.forEach(g => {
      map[g.id] = g.title;
    });
    return map;
  }, [data.goals]);

  const handleToggleDone = (index: number) => {
    const newStatus = !tasks[index].done;
    updateTaskStatus(todayDate, index, newStatus);
    onRefreshData();
  };

  const handleEditPlan = () => {
    const newData = { ...data };
    newData.settings.mode = 'setup';
    saveExecutionData(newData);
    onRefreshData();
  };

  const handleAddTask = (title: string, scope: string[]) => {
    addAdhocTask(todayDate, title, scope);
    onRefreshData();
  };

  const handleQuoteUpdate = (quote: string | null) => {
    const newData = { ...data };
    newData.settings.customQuote = quote;
    saveExecutionData(newData);
    onRefreshData();
  };

  const handleClearBacklog = () => {
    if (confirm("Clear all items from the backlog?")) {
      clearBacklog();
      onRefreshData();
    }
  };

  // Task Management
  const startEditing = (index: number, currentText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(index);
    setEditValue(currentText);
  };

  const saveEdit = (index: number) => {
    if (editValue.trim()) {
      updateTaskTitle(todayDate, index, editValue);
    }
    setEditingIndex(null);
    onRefreshData();
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const handleDeleteTask = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this task?")) {
      deleteTask(todayDate, index);
      onRefreshData();
    }
  };

  const { alignment, wallpaper, customWallpaper, customQuote } = data.settings;
  const backlog = data.backlog;

  const getBackgroundStyle = () => {
    if (wallpaper === 'custom' && customWallpaper) {
      return { backgroundImage: `url(${customWallpaper})` };
    }
    return { background: WALLPAPER_STYLES[wallpaper] };
  };

  const isRightAligned = alignment.includes('right');
  const calendarPosition = isRightAligned ? 'top-8 left-8' : 'top-8 right-8';
  const isBottomCenter = alignment === 'bottom-center';
  const quotePosition = isBottomCenter ? 'top-8 left-1/2 -translate-x-1/2' : 'bottom-12 left-1/2 -translate-x-1/2';

  return (
    <div 
      className="h-screen w-screen overflow-hidden bg-cover bg-center relative text-white selection:bg-cyan-500/30"
      style={{ 
        ...getBackgroundStyle(),
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* --- Hamburger Menu Button --- */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-6 left-6 z-40 p-3 rounded-full bg-black/20 text-white/50 border border-white/5 hover:bg-white hover:text-black hover:border-white hover:scale-105 transition-all backdrop-blur-sm shadow-lg group"
        title="Menu"
      >
        <div className="space-y-1">
          <span className="block w-4 h-0.5 bg-current transition-transform group-hover:rotate-180"></span>
          <span className="block w-4 h-0.5 bg-current transition-transform group-hover:rotate-180"></span>
          <span className="block w-4 h-0.5 bg-current transition-transform group-hover:rotate-180"></span>
        </div>
      </button>

      {/* --- Sidebar Overlay --- */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar Panel --- */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-zinc-950/90 backdrop-blur-2xl border-r border-white/10 p-8 z-50 transform transition-transform duration-300 ease-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
           <h2 className="text-xl font-light tracking-tight">Wall-Schedule</h2>
           <button onClick={() => setIsSidebarOpen(false)} className="text-white/40 hover:text-white">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <nav className="flex-1 space-y-4">
          <button 
            onClick={handleEditPlan}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-3 text-sm"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Manage Roadmaps
          </button>
          
          <button 
            onClick={() => { setIsAddTaskOpen(true); setIsSidebarOpen(false); }}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-3 text-sm"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Quick Task
          </button>

          <button 
            onClick={handleClearBacklog}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-3 text-sm"
          >
             <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Backlog
          </button>
        </nav>

        <div className="pt-8 border-t border-white/10">
          <button 
            onClick={resetApplication}
            className="w-full text-left px-4 py-3 rounded-lg text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/30 transition-colors flex items-center gap-3 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Reset Application
          </button>
          <div className="mt-4 text-center text-[10px] text-white/20">
            Wall-Schedule v1.0
          </div>
        </div>
      </div>

      <CalendarWidget positionClass={calendarPosition} />
      <QuoteWidget 
        positionClass={quotePosition} 
        customQuote={customQuote} 
        onUpdateQuote={handleQuoteUpdate} 
      />

      <div 
        className={`absolute w-[26rem] backdrop-blur-2xl bg-black/40 border border-white/10 shadow-2xl rounded-3xl p-8 transition-all duration-500 flex flex-col gap-6 max-h-[80vh] overflow-y-auto custom-scroll ${ALIGNMENT_CLASSES[alignment]}`}
      >
        <div className="flex items-center justify-between sticky top-0 z-10 bg-transparent mb-4">
           <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-white/50">Today's Focus</h2>
           <button 
             onClick={() => setIsAddTaskOpen(true)}
             className="w-6 h-6 rounded flex items-center justify-center border border-white/20 text-white/50 hover:bg-white hover:text-black hover:border-white transition-all"
             title="Add specific task"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
           </button>
        </div>
        
        <div>
          {tasks.length === 0 ? (
             <div className="text-xl font-light text-white/80 py-4 text-center">No tasks scheduled.</div>
          ) : (
            <div className="space-y-8">
              {tasks.map((task, idx) => (
                <div key={idx} className="animate-fade-in-up group relative">
                   
                   <div className="mb-1 pl-10 flex items-center gap-2">
                      <span className={`text-[9px] font-bold tracking-widest uppercase ${task.goalId === 'adhoc' ? 'text-amber-400' : 'text-cyan-400/80'}`}>
                        {goalTitleMap[task.goalId] || 'Unknown Goal'}
                      </span>
                   </div>

                   <div className="flex items-start gap-4 mb-2">
                      <button 
                        onClick={() => handleToggleDone(idx)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border transition-all mt-1.5 flex items-center justify-center ${
                          task.done 
                            ? 'bg-white border-white text-black' 
                            : 'border-white/40 hover:border-white bg-transparent'
                        }`}
                      >
                        {task.done && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      
                      {editingIndex === idx ? (
                        <div className="flex-1 flex flex-col gap-2">
                            <input 
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') saveEdit(idx);
                                    if(e.key === 'Escape') cancelEdit();
                                }}
                                className="w-full bg-white/10 border border-white/30 rounded px-2 py-1 text-lg font-light focus:outline-none text-white"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => saveEdit(idx)} className="text-xs bg-white text-black px-2 py-1 rounded hover:bg-zinc-200">Save</button>
                                <button onClick={cancelEdit} className="text-xs text-white/50 px-2 py-1 hover:text-white">Cancel</button>
                            </div>
                        </div>
                      ) : (
                        <div className="flex-1 group/item relative">
                            <h3 
                            className={`text-xl font-light leading-snug cursor-pointer transition-opacity select-none ${task.done ? 'line-through opacity-40' : 'opacity-100'}`}
                            onClick={() => setExpandedTaskIndex(expandedTaskIndex === idx ? null : idx)}
                            >
                            {task.task}
                            </h3>
                            
                            {/* Hover Actions for Task */}
                            <div className="absolute -right-2 -top-1 opacity-0 group-hover/item:opacity-100 flex items-center gap-1 bg-zinc-900/80 backdrop-blur rounded-lg px-1.5 py-1 transition-opacity border border-white/10">
                                <button 
                                    onClick={(e) => startEditing(idx, task.task, e)}
                                    className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded"
                                    title="Edit"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button 
                                    onClick={(e) => handleDeleteTask(idx, e)}
                                    className="p-1 text-white/60 hover:text-red-400 hover:bg-red-400/10 rounded"
                                    title="Delete"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                      )}
                   </div>
                   
                   <div className={`overflow-hidden transition-all duration-300 ${expandedTaskIndex === idx && !task.done && editingIndex !== idx ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                      {task.scope.length > 0 ? (
                        <ul className="pl-11 space-y-2 border-l border-white/10 ml-3 py-1">
                           {task.scope.map((item, i) => (
                             <li key={i} className="text-sm text-white/70 font-light flex items-start gap-2 pl-4">
                               <span className="block w-1 h-1 rounded-full bg-white/50 mt-1.5 flex-shrink-0"></span>
                               {item}
                             </li>
                           ))}
                        </ul>
                      ) : (
                        <div className="pl-11 text-xs text-white/30 italic">No details provided.</div>
                      )}
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {backlog.length > 0 && (
          <div className="pt-6 border-t border-white/10">
             <div className="flex items-center justify-between mb-3">
               <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-red-300/70">Backlog</h3>
               <button 
                  onClick={handleClearBacklog}
                  className="text-[10px] text-white/40 hover:text-red-300 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded hover:bg-white/5 transition-all"
               >
                 Clear
               </button>
             </div>
             <div className="space-y-3 max-h-40 overflow-y-auto custom-scroll pr-2">
               {backlog.map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between group">
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-[9px] uppercase tracking-wider text-white/30 mb-0.5">{goalTitleMap[item.goalId] || 'Goal'}</span>
                      <span className="text-sm text-white/70 font-light truncate">{item.task}</span>
                    </div>
                    <span className="text-[10px] text-white/30 font-mono flex-shrink-0">{item.originalDate.slice(5)}</span>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      <AddTaskModal 
        isOpen={isAddTaskOpen} 
        onClose={() => setIsAddTaskOpen(false)} 
        onSave={handleAddTask} 
      />
    </div>
  );
};

export default ExecutionMode;