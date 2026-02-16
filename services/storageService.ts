import { ExecutionData, ScheduledTask } from '../types';
import { STORAGE_KEY, INITIAL_DATA } from '../constants';

export const getExecutionData = (): ExecutionData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return INITIAL_DATA;
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse execution data", e);
    return INITIAL_DATA;
  }
};

export const saveExecutionData = (data: ExecutionData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const updateTaskStatus = (date: string, taskIndex: number, done: boolean): ExecutionData => {
  const data = getExecutionData();
  if (data.schedule[date] && data.schedule[date][taskIndex]) {
    data.schedule[date][taskIndex].done = done;
    saveExecutionData(data);
  }
  return data;
};

export const updateTaskTitle = (date: string, taskIndex: number, newTitle: string): ExecutionData => {
  const data = getExecutionData();
  if (data.schedule[date] && data.schedule[date][taskIndex]) {
    data.schedule[date][taskIndex].task = newTitle;
    saveExecutionData(data);
  }
  return data;
};

export const deleteTask = (date: string, taskIndex: number): ExecutionData => {
  const data = getExecutionData();
  if (data.schedule[date]) {
    data.schedule[date].splice(taskIndex, 1);
    saveExecutionData(data);
  }
  return data;
};

export const addAdhocTask = (date: string, taskTitle: string, scope: string[]): ExecutionData => {
  const data = getExecutionData();
  const newTask: ScheduledTask = {
    task: taskTitle,
    scope: scope,
    goalId: 'adhoc', // Special ID for ad-hoc tasks
    done: false
  };

  if (!data.schedule[date]) {
    data.schedule[date] = [];
  }
  
  data.schedule[date].push(newTask);
  saveExecutionData(data);
  return data;
};

// Helper to check for missed tasks and move them to backlog
export const processMissedTasks = (): ExecutionData => {
  const data = getExecutionData();
  const today = new Date().toISOString().split('T')[0];
  let changed = false;

  const dates = Object.keys(data.schedule);
  
  dates.forEach(date => {
    if (date < today) {
      const tasks = data.schedule[date];
      const remainingTasks: ScheduledTask[] = [];
      
      tasks.forEach(task => {
        if (!task.done) {
          // Move to backlog
          data.backlog.push({
            task: task.task,
            originalDate: date,
            goalId: task.goalId
          });
          changed = true;
        } else {
          // Keep done tasks in history if desired, or we can just leave them in schedule
          // For this app, we leave them in schedule to maintain history of what was done
          remainingTasks.push(task);
        }
      });

      // If we moved everything to backlog, we might want to clean up the schedule entry
      // providing it only contained incomplete tasks.
      // However, to preserve "Done" history, we update the schedule to only contain Done tasks.
      if (changed) {
        data.schedule[date] = remainingTasks;
      }
    }
  });

  if (changed) {
    saveExecutionData(data);
  }
  return data;
};

export const clearBacklog = (): ExecutionData => {
  const data = getExecutionData();
  data.backlog = [];
  saveExecutionData(data);
  return data;
};

export const resetApplication = (): void => {
  if (confirm("Are you sure you want to completely reset the application? All data will be lost.")) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
};