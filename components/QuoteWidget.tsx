import React, { useState, useEffect } from 'react';

const RANDOM_QUOTES = [
  "Execution over planning.",
  "Clarity comes from action, not thought.",
  "Focus on being productive instead of busy.",
  "Small daily improvements are the key to staggering long-term results.",
  "The only way to do great work is to love what you do.",
  "Discipline is choosing between what you want now and what you want most.",
  "Do it for your future self.",
  "A year from now you may wish you had started today."
];

interface QuoteWidgetProps {
  positionClass: string;
  customQuote?: string | null;
  onUpdateQuote: (quote: string | null) => void;
}

const QuoteWidget: React.FC<QuoteWidgetProps> = ({ positionClass, customQuote, onUpdateQuote }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (customQuote) {
      setCurrentQuote(customQuote);
    } else {
      // Pick random quote once on mount or when switched to random
      const random = RANDOM_QUOTES[Math.floor(Math.random() * RANDOM_QUOTES.length)];
      setCurrentQuote(random);
    }
  }, [customQuote]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setInputValue(customQuote || currentQuote);
  };

  const handleSave = () => {
    if (inputValue.trim() === "") {
      onUpdateQuote(null); // Revert to random
    } else {
      onUpdateQuote(inputValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setIsEditing(false);
  };

  return (
    <div 
      className={`absolute ${positionClass} max-w-xl text-center transition-all duration-500 animate-fade-in z-10`}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <div className="bg-black/50 p-2 rounded-lg backdrop-blur-md">
          <input 
            autoFocus
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder="Type your mantra..."
            className="w-full bg-transparent border-none text-center text-lg md:text-xl font-light text-white focus:outline-none placeholder-white/30"
          />
          <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">Press Enter to Save • Empty to Randomize</div>
        </div>
      ) : (
        <div className="group cursor-pointer p-4 rounded-xl hover:bg-black/10 transition-colors">
          <p className="text-lg md:text-xl font-light text-white/90 leading-relaxed italic drop-shadow-md">
            "{currentQuote}"
          </p>
          <p className="text-[10px] text-white/0 group-hover:text-white/30 transition-colors mt-2 uppercase tracking-widest">
            Double click to edit
          </p>
        </div>
      )}
    </div>
  );
};

export default QuoteWidget;