import React, { useEffect, useState } from 'react';

interface CalendarWidgetProps {
  positionClass: string;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ positionClass }) => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();

  return (
    <div className={`absolute ${positionClass} backdrop-blur-md bg-black/20 border border-white/10 p-6 rounded-2xl text-white shadow-lg animate-fade-in transition-all duration-500 hover:bg-black/30 select-none`}>
      <div className="text-right">
        <div className="text-xs font-bold tracking-[0.2em] uppercase text-white/40 mb-1">{year}</div>
        <div className="text-5xl font-light tracking-tighter mb-1">{dayNum}</div>
        <div className="text-lg font-medium text-white/80 uppercase tracking-widest">{month}</div>
        <div className="text-sm text-cyan-300 font-mono mt-2">{dayName}</div>
      </div>
    </div>
  );
};

export default CalendarWidget;