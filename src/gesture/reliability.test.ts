import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRecoveryState,
  updateRecoveryState,
  getLastKnownPalmCenter,
  getGestureCooldown,
  debounce,
  throttle,
  isStableGesture,
  shouldTrigger,
  applySmoothing,
  isTrackingLost,
  type Landmark,
} from "./reliability";

describe("Gesture reliability utilities", () => {
  describe("createRecoveryState", () => {
    it("initializes with default values", () => {
      const state = createRecoveryState();
      expect(state.lostSince).toBe(0);
      expect(state.wasTracking).toBe(false);
      expect(state.lastKnownLandmarks).toBeNull();
    });
  });

  describe("updateRecoveryState", () => {
    const mockLandmarks: Landmark[][] = [
      Array.from({ length: 21 }, (_, i) => ({ x: i * 0.01, y: i * 0.01, z: i * 0.01 })),
    ];

    it("marks tracking as active when landmarks present", () => {
      const state = createRecoveryState();
      const { isLost, recovered } = updateRecoveryState(state, mockLandmarks, 1000, 3500);
      expect(isLost).toBe(false);
      expect(recovered).toBe(false);
      expect(state.wasTracking).toBe(true);
      expect(state.lastKnownLandmarks).toEqual(mockLandmarks);
    });

    it("detects tracking loss after timeout", () => {
      const state = createRecoveryState();
      updateRecoveryState(state, mockLandmarks, 1000, 3500);
      const { isLost } = updateRecoveryState(state, [], 5000, 3500);
      expect(isLost).toBe(false); // First call after loss sets lostSince to 5000
      const { isLost: isLost2 } = updateRecoveryState(state, [], 9000, 3500);
      expect(isLost2).toBe(true); // 9000 - 5000 = 4000 > 3500
    });

    it("reports recovery when landmarks return after loss", () => {
      const state = createRecoveryState();
      updateRecoveryState(state, mockLandmarks, 1000, 3500);
      updateRecoveryState(state, [], 5000, 3500); // Sets lostSince = 5000
      updateRecoveryState(state, [], 9000, 3500); // isLost = true
      const { recovered } = updateRecoveryState(state, mockLandmarks, 10000, 3500);
      expect(recovered).toBe(true);
    });
  });

  describe("getLastKnownPalmCenter", () => {
    it("returns null when no landmarks", () => {
      const state = createRecoveryState();
      expect(getLastKnownPalmCenter(state)).toBeNull();
    });

    it("returns palm center from last known landmarks", () => {
      const state = createRecoveryState();
      const mockLandmarks: Landmark[][] = [
        Array.from({ length: 21 }, (_, i) => ({ x: i * 0.01, y: i * 0.01, z: i * 0.01 })),
      ];
      updateRecoveryState(state, mockLandmarks, 1000, 3500);
      const palm = getLastKnownPalmCenter(state);
      expect(palm).not.toBeNull();
      // wrist (index 0) = (0, 0, 0), middleBase (index 9) = (0.09, 0.09, 0.09)
      // center = (0.045, 0.045, 0.045)
      expect(palm?.x).toBeCloseTo(0.045);
      expect(palm?.y).toBeCloseTo(0.045);
      expect(palm?.z).toBeCloseTo(0.045);
    });
  });

  describe("getGestureCooldown", () => {
    it("returns specific cooldown for known gestures", () => {
      expect(getGestureCooldown("pinch")).toBe(1200);
      expect(getGestureCooldown("open-palm")).toBe(800);
      expect(getGestureCooldown("pointing")).toBe(1000);
      expect(getGestureCooldown("two-hand-spread")).toBe(1500);
      expect(getGestureCooldown("two-hand-zoom")).toBe(1500);
      expect(getGestureCooldown("closed-fist")).toBe(2000);
      expect(getGestureCooldown("thumbs-up")).toBe(1800);
    });

    it("returns default cooldown for unknown gestures", () => {
      expect(getGestureCooldown("unknown")).toBe(1500);
    });
  });

  describe("debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("delays function execution", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("only calls once for multiple rapid calls", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      debounced();
      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("throttle", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("executes immediately on first call", () => {
      const fn = vi.fn();
      const { execute } = throttle(fn, 100);
      execute();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("ignores calls within limit", () => {
      const fn = vi.fn();
      const { execute } = throttle(fn, 100);
      execute();
      execute();
      execute();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("executes again after limit expires", () => {
      const fn = vi.fn();
      const { execute } = throttle(fn, 100);
      execute();
      vi.advanceTimersByTime(100);
      // After limit expires, the trailing call is made
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("executes pending call on cancel", () => {
      const fn = vi.fn();
      const { execute, cancel } = throttle(fn, 100);
      execute();
      execute();
      cancel();
      execute();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("isStableGesture", () => {
    it("returns false when gesture changes", () => {
      expect(isStableGesture("pinch", "pointing", 5, 3)).toBe(false);
    });

    it("returns false when count below threshold", () => {
      expect(isStableGesture("pinch", "pinch", 2, 3)).toBe(false);
    });

    it("returns true when gesture stable and count meets threshold", () => {
      expect(isStableGesture("pinch", "pinch", 3, 3)).toBe(true);
      expect(isStableGesture("pinch", "pinch", 5, 3)).toBe(true);
    });
  });

  describe("shouldTrigger", () => {
    it("returns true when cooldown elapsed", () => {
      expect(shouldTrigger(2000, 0, 1500)).toBe(true);
    });

    it("returns false when cooldown not elapsed", () => {
      expect(shouldTrigger(1000, 0, 1500)).toBe(false);
    });
  });

  describe("applySmoothing", () => {
    it("returns previous when alpha is 0", () => {
      expect(applySmoothing(10, 20, 0)).toBe(10);
    });

    it("returns next when alpha is 1", () => {
      expect(applySmoothing(10, 20, 1)).toBe(20);
    });

    it("interpolates between previous and next", () => {
      expect(applySmoothing(10, 20, 0.5)).toBe(15);
    });

    it("clamps alpha to 0-1 range", () => {
      expect(applySmoothing(10, 20, -0.5)).toBe(10);
      expect(applySmoothing(10, 20, 1.5)).toBe(20);
    });
  });

  describe("isTrackingLost", () => {
    it("returns true when timeout exceeded", () => {
      expect(isTrackingLost(0, 5000, 3500)).toBe(true);
    });

    it("returns false when timeout not exceeded", () => {
      expect(isTrackingLost(0, 2000, 3500)).toBe(false);
    });
  });
});