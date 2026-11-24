import { describe, expect, it } from "vitest";
import {
  classifyGesture,
  distance,
  meetsConfidenceThreshold,
  smooth,
  smoothLandmarks,
  type Landmark,
} from "./classifier";

function hand(): Landmark[] {
  return Array.from({ length: 21 }, (_, index) => ({
    x: index * 0.01,
    y: 0.6,
    z: 0,
  }));
}

describe("gesture landmark helpers", () => {
  it("calculates normalized pinch distance", () => {
    expect(distance({ x: 0, y: 0, z: 0 }, { x: 0.03, y: 0.04, z: 0 })).toBeCloseTo(0.05);
  });

  it("smooths hand movement without jumping to the next value", () => {
    expect(smooth(0, 1, 0.25)).toBe(0.25);
    const [point] = smoothLandmarks(
      [[{ x: 0, y: 0, z: 0 }]],
      [[{ x: 1, y: 1, z: 1 }]],
      0.25,
    )[0];
    expect(point).toEqual({ x: 0.25, y: 0.25, z: 0.25 });
  });

  it("prioritizes two hands and recognizes a closed fist", () => {
    const fist = hand();
    for (const index of [4, 8, 12, 16, 20]) fist[index].y = 0.7;
    for (const index of [3, 6, 10, 14, 18]) fist[index].y = 0.4;
    fist[4].x = fist[8].x + 0.2;
    expect(classifyGesture([fist])).toBe("closed-fist");
    expect(classifyGesture([fist, fist])).toBe("two-hand-spread");
  });

  it("recognizes two-hand pinch as a dedicated zoom gesture", () => {
    const pinch = hand();
    for (const index of [4, 8, 12, 16, 20]) pinch[index].y = 0.7;
    for (const index of [3, 6, 10, 14, 18]) pinch[index].y = 0.4;
    pinch[4].x = pinch[8].x;
    expect(classifyGesture([pinch, pinch], 0.075)).toBe("two-hand-zoom");
  });

  it("recognizes single-hand open palm, point, and thumbs-up without confusing them for pinch", () => {
    const open = hand();
    for (const index of [8, 12, 16, 20]) open[index].y = 0.2;
    for (const index of [6, 10, 14, 18]) open[index].y = 0.5;
    open[4].x = -0.4;
    expect(classifyGesture([open])).toBe("open-palm");

    const point = hand();
    point[8].y = 0.2;
    point[6].y = 0.5;
    for (const index of [12, 16, 20]) point[index].y = 0.7;
    point[4].x = -0.4;
    expect(classifyGesture([point])).toBe("pointing");

    const thumbsUp = hand();
    for (const index of [8, 12, 16, 20]) thumbsUp[index].y = 0.7;
    for (const index of [6, 10, 14, 18]) thumbsUp[index].y = 0.5;
    thumbsUp[4].x = -0.4;
    thumbsUp[4].y = 0.2;
    thumbsUp[3].y = 0.45;
    thumbsUp[2].y = 0.5;
    expect(classifyGesture([thumbsUp])).toBe("thumbs-up");
  });

  it("rejects malformed two-hand input and requires every participating hand to meet confidence", () => {
    expect(classifyGesture([hand(), [{ x: 0, y: 0, z: 0 }]])).toBe("none");
    expect(meetsConfidenceThreshold([0.82], 1, 0.55)).toBe(true);
    expect(meetsConfidenceThreshold([0.82, 0.42], 2, 0.55)).toBe(false);
    expect(meetsConfidenceThreshold([0.82, Number.NaN], 2, 0.55)).toBe(false);
  });
});
