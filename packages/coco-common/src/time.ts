export function nowUnixMs(): number {
  return Date.now();
}

export function nowUnixNs(): bigint {
  const ms = BigInt(Date.now());
  const perfFractional = BigInt(Math.floor((performance.now() % 1) * 1_000_000));
  return ms * 1_000_000n + perfFractional;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}

export function isoToMs(iso: string): number {
  return new Date(iso).getTime();
}

export function unixNsToIso(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  return new Date(ms).toISOString();
}

export function durationMs(from: number, to: number = nowUnixMs()): number {
  return to - from;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)}m`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  const d = h / 24;
  return `${d.toFixed(1)}d`;
}
