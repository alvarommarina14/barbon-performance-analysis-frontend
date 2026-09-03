import type { CourtProofBridge } from './index';

declare global {
  interface Window {
    courtProof: CourtProofBridge;
  }
}

export {};
