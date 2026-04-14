/**
 * QualityContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides the Adaptive Quality Engine state to the entire component tree.
 * Any component can call useQuality() to get tier, config, and static mode state.
 */

import React, { createContext, useContext } from 'react';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';

const QualityContext = createContext(null);

export function QualityProvider({ children }) {
  const quality = useAdaptiveQuality();
  return (
    <QualityContext.Provider value={quality}>
      {children}
    </QualityContext.Provider>
  );
}

/**
 * useQuality — consume the quality engine from any child component.
 * Must be used inside <QualityProvider>.
 */
export function useQuality() {
  const ctx = useContext(QualityContext);
  if (!ctx) throw new Error('useQuality must be used within <QualityProvider>');
  return ctx;
}
