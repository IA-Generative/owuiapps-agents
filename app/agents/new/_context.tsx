// Contexte React partagé par les 4 étapes du wizard de création d'agent.
// Stocke toute la config du brouillon dans un unique useState, exposé via
// un hook useWizard(). Évite de lifter manuellement des dizaines de props
// à travers les étapes.

'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_MODEL_ID } from '@/lib/models';

export type AgentVisibility = 'private' | 'community' | 'ministry';

export type AgentDraft = {
  // Étape 1 — Identité
  name: string;
  description: string;
  category: string;
  visibility: AgentVisibility;
  communityPath: string | null;

  // Étape 2 — Comportement
  systemPrompt: string;
  greeting: string;
  examples: string[];
  modelId: string;
  temperature: number;
};

const INITIAL: AgentDraft = {
  name: '',
  description: '',
  category: '',
  visibility: 'private',
  communityPath: null,
  systemPrompt: '',
  greeting: '',
  examples: [],
  modelId: DEFAULT_MODEL_ID,
  temperature: 0.7,
};

type WizardContextValue = {
  draft: AgentDraft;
  update: (patch: Partial<AgentDraft>) => void;
  reset: () => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({
  children,
  initialDraft,
}: {
  children: ReactNode;
  initialDraft?: Partial<AgentDraft>;
}) {
  const [draft, setDraft] = useState<AgentDraft>({ ...INITIAL, ...initialDraft });
  const value: WizardContextValue = {
    draft,
    update: (patch) => setDraft((d) => ({ ...d, ...patch })),
    reset: () => setDraft(INITIAL),
  };
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error('useWizard doit être utilisé dans <WizardProvider>');
  }
  return ctx;
}
