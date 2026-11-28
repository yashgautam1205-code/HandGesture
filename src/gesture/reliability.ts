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

export type RecoveryState = {
  lostSince: number;
  wasTracking: boolean;
  lastKnownLandmarks: Landmark[][] | null;
};

export type Landmark = { x: number; y: number; z: number };

export function createRecoveryState(): RecoveryState {
  return {
    lostSince: 0,
    wasTracking: false,
    lastKnownLandmarks: null,
  };
}

export function updateRecoveryState(
  state: RecoveryState,
  landmarks: Landmark[][],
  now: number,
  timeoutMs: number,
): { isLost: boolean; recovered: boolean } {
  const hasLandmarks = landmarks.length > 0 && landmarks[0]?.length >= 21;

  if (hasLandmarks) {
    const wasLost = state.wasTracking && now - state.lostSince > timeoutMs;
    state.wasTracking = true;
    state.lastKnownLandmarks = landmarks;
    state.lostSince = 0;
    return { isLost: false, recovered: wasLost };
  }

  if (state.wasTracking) {
    if (state.lostSince === 0) {
      state.lostSince = now;
    }
    const isLost = now - state.lostSince > timeoutMs;
    return { isLost, recovered: false };
  }

  return { isLost: false, recovered: false };
}

export function getLastKnownPalmCenter(state: RecoveryState): Landmark | null {
  if (!state.lastKnownLandmarks || state.lastKnownLandmarks[0]?.length < 21) {
    return null;
  }
  const hand = state.lastKnownLandmarks[0];
  const wrist = hand[0];
  const middleBase = hand[9];
  return {
    x: (wrist.x + middleBase.x) / 2,
    y: (wrist.y + middleBase.y) / 2,
    z: (wrist.z + middleBase.z) / 2,
  };
}

export const gestureCooldowns: Record<string, number> = {
  pinch: 1200,
  "open-palm": 800,
  pointing: 1000,
  "two-hand-spread": 1500,
  "two-hand-zoom": 1500,
  "closed-fist": 2000,
  "thumbs-up": 1800,
};

export function getGestureCooldown(gesture: GestureName): number {
  return gestureCooldowns[gesture] ?? 1500;
}

export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  limit: number,
): { execute: T; cancel: () => void } {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  const execute = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    }
  }) as T;

  const cancel = () => {
    inThrottle = false;
    lastArgs = null;
  };

  return { execute, cancel };
}