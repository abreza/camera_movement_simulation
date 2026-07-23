export type RandomSource = () => number;

let activeRandomSource: RandomSource = Math.random;

export function randomValue(): number {
  return activeRandomSource();
}

export function withRandomSource<T>(
  source: RandomSource,
  operation: () => T
): T {
  const previousSource = activeRandomSource;
  activeRandomSource = source;

  try {
    return operation();
  } finally {
    activeRandomSource = previousSource;
  }
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRandom(seed: string | number): RandomSource {
  let state = hashSeed(String(seed));

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandomSeed(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}
