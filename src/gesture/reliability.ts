export type GestureName = string;

export type GestureState = {
  lastGesture: GestureName | null;
  lastActionTime: number;
  stableCount: number;
  confidence: number;
};

export function isStableGesture(
  current: GestureName,
  previous: GestureName | null,
  count: number,
  threshold: number,
): boolean {
  if (current !== previous) return false;
  return count >= threshold;
}

export function shouldTrigger(
  now: number,
  lastActionTime: number,
  cooldownMs: number,
): boolean {
  return now - lastActionTime >= cooldownMs;
}

export function applySmoothing(prev: number, next: number, alpha: number): number {
  const a = Math.min(1, Math.max(0, alpha));
  return prev * (1 - a) + next * a;
}

export function isTrackingLost(
  lastSeenTime: number,
  now: number,
  timeoutMs: number,
): boolean {
  return now - lastSeenTime > timeoutMs;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  }) as T;
}