import React, { createContext, useContext, useState, useEffect } from 'react';

export type AIModeState = 
  | 'inactive' 
  | 'activating' 
  | 'video_forward' 
  | 'portal' 
  | 'world' 
  | 'video_reverse' 
  | 'deactivating';

interface AIContextProps {
  aiModeState: AIModeState;
  enterAIMode: () => void;
  exitAIMode: () => void;
  setAiModeState: (state: AIModeState) => void;
  scrollPos: number;
}

const AIContext = createContext<AIContextProps | undefined>(undefined);

export const AIContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aiModeState, setAiModeState] = useState<AIModeState>('inactive');
  const [scrollPos, setScrollPos] = useState(0);

  const enterAIMode = () => {
    if (aiModeState !== 'inactive') return;
    setScrollPos(window.scrollY);
    setAiModeState('activating');
  };

  const exitAIMode = () => {
    if (aiModeState !== 'world') return;
    setAiModeState('video_reverse');
  };

  useEffect(() => {
    if (aiModeState === 'activating') {
      document.body.classList.add('ai-portal-active');
      document.body.classList.add('ai-portal-glitch');
      document.body.style.overflow = 'hidden';
    } else if (aiModeState === 'inactive') {
      document.body.classList.remove('ai-portal-active', 'ai-portal-glitch');
      document.body.style.overflow = '';
      // Smoothly restore position
      window.scrollTo(0, scrollPos);
    }
  }, [aiModeState, scrollPos]);

  return (
    <AIContext.Provider value={{ aiModeState, enterAIMode, exitAIMode, setAiModeState, scrollPos }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIContextProvider');
  }
  return context;
};
