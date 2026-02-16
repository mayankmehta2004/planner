import React, { useState, useRef } from 'react';
import { Alignment, ExecutionData, Goal, RoadmapDay, ScheduledTask, WallpaperMood } from '../types';
import { generateRoadmap } from '../services/geminiService';
import { ALIGNMENT_CLASSES, WALLPAPER_STYLES } from '../constants';
import { saveExecutionData, resetApplication } from '../services/storageService';

interface SetupModeProps {
  initialData: ExecutionData;
  onComplete: () => void;
}

const SetupMode: React.FC<SetupModeProps> = ({ initialData, onComplete }) => {
  // Main State
  const [goals, setGoals] = useState<Goal[]>(initialData.goals || []);
  const [wallpaper, setWallpaper] = useState<WallpaperMood>(initialData.settings.wallpaper);
  const [customWallpaper, setCustomWallpaper] = useState<string | undefined>(initialData.settings.customWallpaper);
  const [alignment, setAlignment] = useState<Alignment>(initialData.settings.alignment);
  const [startDate, setStartDate] = useState(
    initialData.settings.startDate || new Date().toISOString().split('T')[0]
  );
  
  // Navigation State
  const [view, setView] = useState<'hub' | 'editor' | 'preview'>('hub');
  
  // Editor State
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'ai' | 'manual'>('ai');
  const [editorGoalTitle, setEditorGoalTitle] = useState('');
  const [editorDuration, setEditorDuration] = useState(14);
  const [editorStartDate, setEditorStartDate] = useState(''); // Per roadmap start date
  const [editorRoadmap, setEditorRoadmap] = useState<RoadmapDay[]>([]);
  const [editorStep, setEditorStep] = useState<'input' | 'review'>('input');
  
  // Manual Input State
  const [manualJson, setManualJson] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- GOAL EDITOR LOGIC ---

  const startNewGoal = () => {
    setEditingGoalId(null);
    setEditorGoalTitle('');
    setEditorDuration(14);
    setEditorStartDate(startDate); // Default to global start
    setEditorRoadmap([]);
    setManualJson('[\n  {\n    "day": 1,\n    "title": "Start Here",\n    "scope": ["Task 1", "Task 2"]\n  }\n]');
    setEditorMode('ai');
    setEditorStep('input');
    setError(null);
    setView('editor');
  };

  const editGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditorGoalTitle(goal.title);
    setEditorDuration(goal.duration_days);
    setEditorStartDate(goal.startDate || startDate);
    setEditorRoadmap(goal.roadmap);
    // Pre-fill manual JSON in case they want to switch to manual mode to edit raw data
    setManualJson(JSON.stringify(goal.roadmap, null, 2));
    setEditorMode('manual'); // Default to manual/review for existing goals usually
    setEditorStep('review'); // Go straight to review
    setError(null);
    setView('editor');
  };

  const handleGenerate = async () => {
    if (!editorGoalTitle) return;
    setIsGenerating(true);
    setError(null);
    try {
      const generated = await generateRoadmap(editorGoalTitle, editorDuration);
      setEditorRoadmap(generated);
      setEditorStep('review');
    } catch (e) {
      setError("Failed to generate roadmap. Please check your connection or try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualParse = () => {
    try {
      const parsed = JSON.parse(manualJson);
      if (!Array.isArray(parsed)) throw new Error("Root must be an array");
      
      const roadmapData = parsed as any[];

      // Basic validation
      roadmapData.forEach((d: any, i: number) => {
        if (!d.day || !d.title || !d.scope) throw new Error(`Item at index ${i} missing required fields (day, title, scope)`);
      });
      setEditorRoadmap(roadmapData);
      setEditorDuration(roadmapData.length);
      setEditorStep('review');
      setError(null);
    } catch (e: any) {
      setError("Invalid JSON format: " + e.message);
    }
  };

  const saveGoal = () => {
    const newGoal: Goal = {
      id: editingGoalId || Date.now().toString(),
      title: editorGoalTitle || "Untitled Goal",
      duration_days: editorDuration,
      roadmap: editorRoadmap,
      startDate: editorStartDate !== startDate ? editorStartDate : undefined // Only save if different from global to keep clean
    };

    if (editingGoalId) {
      setGoals(goals.map(g => g.id === editingGoalId ? newGoal : g));
    } else {
      setGoals([...goals, newGoal]);
    }
    
    setView('hub');
  };

  const deleteGoal = (id: string) => {
    if (confirm("Are you sure you want to delete this roadmap? History for this goal will be removed.")) {
      setGoals(goals.filter(g => g.id !== id));
    }
  };

  // --- WALLPAPER LOGIC ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCustomWallpaper(result);
        setWallpaper('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  // --- APPLY LOGIC ---

  const handleApply = () => {
    if (goals.length === 0) {
        alert("Please add at least one roadmap.");
        return;
    }

    // 1. Build history map from existing schedule to preserve 'done' status
    // Map: goalId -> dayIndex -> isDone
    const historyMap: Record<string, Record<number, boolean>> = {};
    const oldGlobalStartStr = initialData.settings.startDate;
    const oldGlobalStart = oldGlobalStartStr ? new Date(oldGlobalStartStr) : new Date();

    // Map Schedule to history based on RELATIVE day index from its respective goal start date
    Object.entries(initialData.schedule).forEach(([dateStr, tasks]) => {
        const taskDate = new Date(dateStr);
        
        (tasks as ScheduledTask[]).forEach(task => {
            if (task.goalId === 'adhoc') return;

            // Find the goal in OLD data to check its start date
            const oldGoal = initialData.goals.find(g => g.id === task.goalId);
            
            // Determine effective start date for this task in the old data
            let effectiveStart = oldGlobalStart;
            if (oldGoal && oldGoal.startDate) {
                effectiveStart = new Date(oldGoal.startDate);
            }

            // Calculate Day Index
            const diffTime = taskDate.getTime() - effectiveStart.getTime();
            const dayIndex = Math.round(diffTime / (86400000)) + 1;
            
            if (dayIndex > 0) {
                if (!historyMap[task.goalId]) historyMap[task.goalId] = {};
                if (task.done) historyMap[task.goalId][dayIndex] = true;
            }
        });
    });

    // 2. Preserve Backlog (filter out deleted goals)
    const activeGoalIds = new Set(goals.map(g => g.id));
    const preservedBacklog = initialData.backlog.filter(b => activeGoalIds.has(b.goalId));

    // 3. Generate New Schedule
    const newSchedule: ExecutionData['schedule'] = {};
    const globalStartObj = new Date(startDate); // Current global start setting
    
    goals.forEach(goal => {
      // Determine effective start date for this goal
      const effectiveGoalStart = goal.startDate ? new Date(goal.startDate) : globalStartObj;

      goal.roadmap.forEach(day => {
        const date = new Date(effectiveGoalStart);
        date.setDate(effectiveGoalStart.getDate() + (day.day - 1));
        const dateStr = date.toISOString().split('T')[0];
        
        if (!newSchedule[dateStr]) {
          newSchedule[dateStr] = [];
        }

        // Check history (if goal ID and day match)
        const isDone = historyMap[goal.id]?.[day.day] || false;

        newSchedule[dateStr].push({
          task: day.title,
          scope: day.scope,
          goalId: goal.id,
          done: isDone
        });
      });
    });

    // 4. Preserve Adhoc Tasks 
    Object.entries(initialData.schedule).forEach(([date, tasks]) => {
        (tasks as ScheduledTask[]).forEach(task => {
            if (task.goalId === 'adhoc') {
                if (!newSchedule[date]) newSchedule[date] = [];
                // Avoid duplicates
                if (!newSchedule[date].some(t => t.task === task.task && t.goalId === 'adhoc')) {
                    newSchedule[date].push(task);
                }
            }
        });
    });

    const newData: ExecutionData = {
      settings: {
        mode: 'execution',
        wallpaper,
        customWallpaper,
        alignment,
        startDate
      },
      goals,
      schedule: newSchedule,
      backlog: preservedBacklog
    };

    try {
      saveExecutionData(newData);
      onComplete();
    } catch (e) {
      alert("Failed to save data. Your custom wallpaper might be too large.");
    }
  };

  // --- RENDER HELPERS ---

  const getBackgroundStyle = () => {
    if (wallpaper === 'custom' && customWallpaper) {
      return { backgroundImage: `url(${customWallpaper})` };
    }
    return { background: WALLPAPER_STYLES[wallpaper] };
  };

  // --- VIEWS ---

  return (
    <div className="min-h-screen w-full flex bg-zinc-900 text-white font-light">
      
      {/* Sidebar */}
      <div className="w-96 flex-shrink-0 border-r border-zinc-800 p-8 flex flex-col h-screen overflow-y-auto custom-scroll bg-zinc-950/50 backdrop-blur-xl z-20">
        <h1 className="text-2xl font-medium tracking-tight mb-8">Wall-Schedule <span className="text-zinc-500">Studio</span></h1>

        {view === 'hub' && (
          <div className="space-y-8 animate-fade-in pb-10">
            {/* Goals List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg text-zinc-300">Roadmaps</h2>
                <button 
                  onClick={startNewGoal}
                  className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200"
                >
                  + Add Roadmap
                </button>
              </div>
              
              <div className="space-y-3">
                {goals.length === 0 ? (
                  <div className="p-4 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-600 text-sm">
                    No roadmaps defined.<br/>Click Add to start planning.
                  </div>
                ) : (
                  goals.map(goal => (
                    <div key={goal.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg flex justify-between items-center group">
                      <div>
                        <div className="font-medium text-sm">{goal.title}</div>
                        <div className="text-xs text-zinc-500">
                          {goal.duration_days} Days • {goal.roadmap.length} Tasks
                          {goal.startDate && <span className="text-cyan-400 ml-2">Starts: {goal.startDate}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => editGoal(goal)}
                          className="text-zinc-500 hover:text-white p-2"
                          title="Edit Goal"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button 
                          onClick={() => deleteGoal(goal.id)}
                          className="text-zinc-500 hover:text-red-400 p-2"
                          title="Delete Goal"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Global Settings */}
            {goals.length > 0 && (
               <div className="pt-8 border-t border-zinc-800 space-y-8">
                 <div>
                    <h2 className="text-lg mb-4 text-zinc-300">Default Schedule</h2>
                    <label className="block text-sm text-zinc-500 mb-2">Primary Start Date</label>
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-4 py-3 focus:outline-none text-white scheme-dark"
                    />
                    <p className="text-[10px] text-zinc-600 mt-2">Individual roadmaps can override this date.</p>
                  </div>
                  
                  <button 
                    onClick={() => setView('preview')}
                    className="w-full py-3 bg-zinc-800 text-white rounded-md font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Configure Layout & Wallpaper
                  </button>

                  <button 
                    onClick={handleApply}
                    className="w-full py-3 bg-white text-black rounded-md font-medium hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                  >
                    Apply & Start Execution
                  </button>
               </div>
            )}
            
            {/* Danger Zone */}
            <div className="pt-8 border-t border-zinc-800">
               <button 
                 onClick={resetApplication}
                 className="w-full py-2 border border-red-900/50 text-red-400 text-xs rounded hover:bg-red-950/30 transition-colors"
               >
                 Reset Application Data
               </button>
            </div>
          </div>
        )}

        {view === 'editor' && (
          <div className="space-y-6 animate-fade-in">
             <button onClick={() => setView('hub')} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 mb-4">
               ← Back to Goals
             </button>
             
             {editorStep === 'input' ? (
                <>
                  <h2 className="text-lg">{editingGoalId ? 'Edit Roadmap' : 'Create Roadmap'}</h2>
                  
                  {/* Mode Toggles */}
                  <div className="grid grid-cols-2 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    <button 
                      onClick={() => setEditorMode('ai')}
                      className={`py-2 text-xs font-medium rounded-md transition-all ${editorMode === 'ai' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Use AI Generator
                    </button>
                    <button 
                      onClick={() => setEditorMode('manual')}
                      className={`py-2 text-xs font-medium rounded-md transition-all ${editorMode === 'manual' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Manual / Paste JSON
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Goal Title</label>
                        <input 
                        type="text" 
                        value={editorGoalTitle}
                        onChange={(e) => setEditorGoalTitle(e.target.value)}
                        placeholder="e.g. Learn Python"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-4 py-3 focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Specific Start Date (Optional)</label>
                        <input 
                          type="date" 
                          value={editorStartDate}
                          onChange={(e) => setEditorStartDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-4 py-3 focus:outline-none text-white scheme-dark"
                        />
                         <p className="text-[10px] text-zinc-600 mt-1">Leave blank to use global start date ({startDate}).</p>
                    </div>
                  </div>

                  {editorMode === 'ai' ? (
                    <>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Duration (Days)</label>
                        <input 
                          type="number" 
                          value={editorDuration}
                          onChange={(e) => setEditorDuration(Number(e.target.value))}
                          min={1}
                          max={365}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-4 py-3 focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
                      <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !editorGoalTitle}
                        className={`w-full py-3 rounded-md font-medium transition-all ${
                          isGenerating || !editorGoalTitle 
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                            : 'bg-white text-black hover:bg-zinc-200'
                        }`}
                      >
                        {isGenerating ? 'Generating Plan...' : 'Generate with Gemini'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">JSON Data</label>
                        <textarea 
                          value={manualJson}
                          onChange={(e) => setManualJson(e.target.value)}
                          className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded-md p-3 font-mono text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 leading-relaxed custom-scroll"
                          placeholder='[{"day":1, "title":"...", "scope":["..."]}]'
                        />
                        <p className="text-[10px] text-zinc-600 mt-2">Required format: Array of objects with day, title, scope.</p>
                      </div>
                      <button 
                        onClick={handleManualParse}
                        disabled={!editorGoalTitle}
                        className={`w-full py-3 rounded-md font-medium transition-all ${
                          !editorGoalTitle 
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                            : 'bg-white text-black hover:bg-zinc-200'
                        }`}
                      >
                        Parse & Preview
                      </button>
                    </>
                  )}
                  
                  {error && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded border border-red-400/20">{error}</p>}
                </>
             ) : (
               <>
                 <h2 className="text-lg">Review Roadmap</h2>
                 <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scroll pr-2">
                    {editorRoadmap.map((day) => (
                      <div key={day.day} className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
                        <div className="flex justify-between items-baseline mb-2">
                           <span className="text-xs font-mono text-zinc-500">Day {day.day}</span>
                           <span className="text-sm font-medium">{day.title}</span>
                        </div>
                        <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1">
                          {day.scope.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    ))}
                 </div>
                 <div className="flex gap-2">
                    <button 
                        onClick={() => setEditorStep('input')}
                        className="flex-1 py-3 border border-zinc-700 text-zinc-400 rounded-md font-medium hover:text-white"
                     >
                        Edit
                     </button>
                    <button 
                        onClick={saveGoal}
                        className="flex-[2] py-3 bg-white text-black rounded-md font-medium hover:bg-zinc-200 transition-colors"
                     >
                        {editingGoalId ? 'Update Roadmap' : 'Save Roadmap'}
                     </button>
                 </div>
               </>
             )}
          </div>
        )}

        {view === 'preview' && (
          <div className="space-y-8 animate-fade-in">
            <button onClick={() => setView('hub')} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 mb-4">
               ← Back to Hub
             </button>
            
            <div>
              <h2 className="text-lg mb-4">Design</h2>
              
              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">Alignment</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['top-left', 'top-center', 'top-right', 'center-center', 'bottom-left', 'bottom-center', 'bottom-right'] as Alignment[]).map(a => (
                    <button
                      key={a}
                      onClick={() => setAlignment(a)}
                      className={`h-10 rounded border flex items-center justify-center transition-all ${
                        a === 'center-center' ? 'col-span-3' : ''
                      } ${
                        alignment === a ? 'border-white bg-white/10' : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                      title={a}
                    >
                      {a === 'center-center' ? (
                        <div className="text-xs text-zinc-400">Center</div>
                      ) : (
                        <div className={`w-2 h-2 bg-current rounded-sm ${
                          a.includes('left') ? 'mr-auto ml-1' : a.includes('right') ? 'ml-auto mr-1' : 'mx-auto'
                        } ${
                          a.includes('top') ? 'mb-auto mt-1' : 'mt-auto mb-1'
                        }`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Wallpaper</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {(['pastel', 'gradient', 'nature', 'dark'] as WallpaperMood[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setWallpaper(m)}
                      className={`px-3 py-2 rounded text-sm border transition-all ${
                        wallpaper === m ? 'border-white bg-white/10' : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-3 py-2 rounded text-sm border transition-all ${
                    wallpaper === 'custom' ? 'border-white bg-white/10' : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {customWallpaper ? 'Change Custom Image' : 'Upload Custom Image'}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                {wallpaper === 'custom' && !customWallpaper && (
                  <p className="text-xs text-amber-400 mt-2">Please upload an image</p>
                )}
              </div>
            </div>

             <button 
                onClick={handleApply}
                className="w-full py-3 bg-white text-black rounded-md font-medium hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
              >
                Apply All & Start
              </button>
          </div>
        )}
      </div>

      {/* Preview Area */}
      <div 
        className="flex-1 relative bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ 
          ...getBackgroundStyle(),
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Mock Execution Panel in Preview */}
        <div 
           className={`absolute w-80 backdrop-blur-xl bg-black/20 border border-white/10 p-6 rounded-2xl text-white shadow-2xl transition-all duration-500 ${ALIGNMENT_CLASSES[alignment]}`}
        >
          <div className="mb-6">
             <div className="text-xs font-semibold tracking-[0.2em] uppercase text-white/50 mb-4 sticky top-0">Today's Focus</div>
             <div className="mb-1 pl-10">
                <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-400/80">
                  {goals[0]?.title || "SAMPLE GOAL"}
                </span>
             </div>
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full border border-white/40 mt-1 flex-shrink-0" />
                <div className="text-xl font-light">{goals[0]?.roadmap[0]?.title || "Task Title"}</div>
             </div>
          </div>
          
          <div className="space-y-3">
             {/* Show Subtasks Preview */}
             <div className="ml-12 pl-3 border-l border-white/10 space-y-1">
                <div className="text-sm text-white/70 font-light">• Subtask example</div>
                <div className="text-sm text-white/70 font-light">• Another subtask</div>
             </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 text-white/30 text-xs pointer-events-none">
          Preview Mode
        </div>
      </div>
    </div>
  );
};

export default SetupMode;