import React, { createContext, useContext, useState, useMemo } from 'react';

interface MutationContextType {
  isMutating: boolean;
  setIsMutating: React.Dispatch<React.SetStateAction<boolean>>;
}

interface CodeValueContextType {
  currentCode?: string;
}

type SetCodeContextType = React.Dispatch<React.SetStateAction<string | undefined>>;

const MutationContext = createContext<MutationContextType | undefined>(undefined);
const CodeValueContext = createContext<CodeValueContextType | undefined>(undefined);
const SetCodeContext = createContext<SetCodeContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [isMutating, setIsMutating] = useState(false);
  const [currentCode, setCurrentCode] = useState<string | undefined>();

  const mutationValue = useMemo(() => ({ isMutating, setIsMutating }), [isMutating]);
  const codeValue = useMemo(() => ({ currentCode }), [currentCode]);

  return (
    <MutationContext.Provider value={mutationValue}>
      <SetCodeContext.Provider value={setCurrentCode}>
        <CodeValueContext.Provider value={codeValue}>{children}</CodeValueContext.Provider>
      </SetCodeContext.Provider>
    </MutationContext.Provider>
  );
}

export function useMutationState() {
  const context = useContext(MutationContext);
  if (context === undefined) {
    throw new Error('useMutationState must be used within an EditorProvider');
  }
  return context;
}

export function useCodeState() {
  const codeValue = useContext(CodeValueContext);
  const setCurrentCode = useContext(SetCodeContext);
  if (codeValue === undefined || setCurrentCode === undefined) {
    throw new Error('useCodeState must be used within an EditorProvider');
  }
  return { ...codeValue, setCurrentCode };
}

