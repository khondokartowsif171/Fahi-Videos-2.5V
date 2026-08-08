import { useState, useCallback, useRef } from 'react';

export function useHistory<T>(initialState: T) {
  const [state, setStateObj] = useState<{history: T[], currentIndex: number}>({
      history: [initialState],
      currentIndex: 0
  });

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setStateObj((prevState) => {
      const { history: prevHistory, currentIndex } = prevState;
      const stateToSave = typeof newState === 'function' ? (newState as Function)(prevHistory[currentIndex]) : newState;
      
      if (JSON.stringify(prevHistory[currentIndex]) === JSON.stringify(stateToSave)) {
          return prevState;
      }
      
      const newHistory = prevHistory.slice(0, currentIndex + 1);
      newHistory.push(stateToSave);
      
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
          history: newHistory,
          currentIndex: newHistory.length - 1
      };
    });
  }, []);

  const undo = useCallback(() => {
    setStateObj((prev) => ({
        ...prev,
        currentIndex: Math.max(0, prev.currentIndex - 1)
    }));
  }, []);

  const redo = useCallback(() => {
    setStateObj((prev) => ({
        ...prev,
        currentIndex: Math.min(prev.history.length - 1, prev.currentIndex + 1)
    }));
  }, []);

  // Expose raw history update to allow capturing state manually
  const pushState = useCallback((stateToPush: T) => {
      setState(stateToPush);
  }, [setState]);

  const canUndo = state.currentIndex > 0;
  const canRedo = state.currentIndex < state.history.length - 1;

  const currentState = state.history[state.currentIndex] || initialState;

  return [currentState, setState, { undo, redo, canUndo, canRedo }] as const;
}
