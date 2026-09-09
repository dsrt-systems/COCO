export function nowUnixMs(): number {
  return Date.now();
}

export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function nowUnixNs(): bigint {
  return BigInt(Date.now()) * BigInt(1_000_000);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoTimestamp(): string {
  return nowIso();
}

export function unixNsToIso(unixNs: bigint): string {
  const ms = Number(unixNs / BigInt(1_000_000));
  return new Date(ms).toISOString();
}
