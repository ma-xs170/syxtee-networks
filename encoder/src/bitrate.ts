// Contrôleur de débit adaptatif : baisse vite quand les liens se dégradent, remonte lentement quand ils sont sains (AIMD).
export type Sample = { rttMs: number; lossPct: number };
export type BitrateConfig = { minKbps: number; maxKbps: number; goodTicksToRaise: number };

export const DEFAULT_BITRATE: BitrateConfig = { minKbps: 800, maxKbps: 8000, goodTicksToRaise: 3 };

export class BitrateController {
  kbps: number;
  private good = 0;
  private baseRtt = Infinity;
  private cfg: BitrateConfig;

  constructor(startKbps: number, cfg: BitrateConfig = DEFAULT_BITRATE) {
    this.cfg = cfg;
    this.kbps = clamp(startKbps, cfg.minKbps, cfg.maxKbps);
  }

  /** À appeler une fois par seconde avec les stats agrégées. Renvoie le débit cible. */
  update(s: Sample): number {
    this.baseRtt = Math.min(this.baseRtt, Math.max(s.rttMs, 1));
    const congested = s.lossPct > 2 || s.rttMs > this.baseRtt * 3 + 50;
    if (s.lossPct > 8) {
      this.good = 0;
      this.kbps = clamp(this.kbps * 0.5, this.cfg.minKbps, this.cfg.maxKbps);
    } else if (congested) {
      this.good = 0;
      this.kbps = clamp(this.kbps * 0.75, this.cfg.minKbps, this.cfg.maxKbps);
    } else if (++this.good >= this.cfg.goodTicksToRaise) {
      this.good = 0;
      this.kbps = clamp(this.kbps * 1.05, this.cfg.minKbps, this.cfg.maxKbps);
    }
    return Math.round(this.kbps);
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
