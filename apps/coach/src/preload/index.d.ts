import type { BarbonAnalysisBridge } from './index';

declare global {
  interface Window {
    barbonAnalysis: BarbonAnalysisBridge;
  }
}

export {};
