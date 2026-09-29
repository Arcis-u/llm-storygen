import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ReaderPreferences {
  fontSize: number;
  typeface: "serif" | "sans";
  measure: "comfortable" | "wide";
  illustrations: boolean;
  setFontSize: (size: number) => void;
  setTypeface: (typeface: ReaderPreferences["typeface"]) => void;
  setMeasure: (measure: ReaderPreferences["measure"]) => void;
  setIllustrations: (enabled: boolean) => void;
  restore: () => void;
}

const defaults = { fontSize: 18, typeface: "serif" as const, measure: "comfortable" as const, illustrations: true };

export const useReaderPreferences = create<ReaderPreferences>()(persist(set => ({
  ...defaults,
  setFontSize: size => set({ fontSize: Math.max(16, Math.min(24, Number.isFinite(size) ? size : 18)) }),
  setTypeface: typeface => set({ typeface }),
  setMeasure: measure => set({ measure }),
  setIllustrations: illustrations => set({ illustrations }),
  restore: () => set(defaults),
}), {
  name: "nexus-reader-preferences-v1",
  // Keep storage writes restricted to display preferences, never story data.
  partialize: state => ({ fontSize: state.fontSize, typeface: state.typeface, measure: state.measure, illustrations: state.illustrations }),
  merge: (saved, current) => {
    const value = (saved || {}) as Partial<ReaderPreferences>;
    return {
      ...current,
      fontSize: typeof value.fontSize === "number" && Number.isFinite(value.fontSize) ? Math.max(16, Math.min(24, value.fontSize)) : defaults.fontSize,
      typeface: value.typeface === "sans" ? "sans" : "serif",
      measure: value.measure === "wide" ? "wide" : "comfortable",
      illustrations: typeof value.illustrations === "boolean" ? value.illustrations : true,
    };
  },
}));
