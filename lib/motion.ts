import { createContext, useContext } from 'react';

// Shared context for "Reduce Motion" accessibility preference.
// AppProvider wires the real value; components that want to gate animations
// read it via useReduceMotion().

export const ReduceMotionContext = createContext<boolean>(false);

export function useReduceMotion() {
  return useContext(ReduceMotionContext);
}
