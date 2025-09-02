import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AnalysisResponse } from '@/lib/api';

type AnalysisState = {
  imageUri?: string;
  result?: AnalysisResponse;
  setAnalysis: (imageUri: string | undefined, result: AnalysisResponse | undefined) => void;
};

const Ctx = createContext<AnalysisState | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<AnalysisResponse | undefined>(undefined);

  const value = useMemo(
    () => ({
      imageUri,
      result,
      setAnalysis: (uri: string | undefined, res: AnalysisResponse | undefined) => {
        setImageUri(uri);
        setResult(res);
      },
    }),
    [imageUri, result]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAnalysis() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}

