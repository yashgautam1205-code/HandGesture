export type Landmark = { x: number; y: number; z: number };
export type GestureName =
  | "pinch"
  | "open-palm"
  | "pointing"
  | "two-hand-spread"
  | "two-hand-zoom"
  | "closed-fist"
  | "thumbs-up"
  | "none";

const fingerTips = [8, 12, 16, 20];
const fingerPips = [6, 10, 14, 18];

export function distance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function smooth(previous: number, next: number, amount = 0.35): number {
  return previous + (next - previous) * amount;
}

export function smoothLandmarks(
  previous: Landmark[][],
  next: Landmark[][],
  amount = 0.4,
): Landmark[][] {
  return next.map((hand, handIndex) =>
    hand.map((point, index) => {
      const old = previous[handIndex]?.[index];
      return old
        ? {
            x: smooth(old.x, point.x, amount),
            y: smooth(old.y, point.y, amount),
            z: smooth(old.z, point.z, amount),
          }
        : point;
    }),
  );
}

export function meetsConfidenceThreshold(
  confidences: number[],
  requiredHands: number,
  threshold: number,
): boolean {
  return (
    requiredHands > 0 &&
    confidences.length >= requiredHands &&
    confidences.slice(0, requiredHands).every(
      (confidence) => Number.isFinite(confidence) && confidence >= threshold,
    )
  );
}

function isFingerExtended(hand: Landmark[], tip: number, pip: number): boolean {
  return hand[tip].y < hand[pip].y;
}

export function classifyGesture(hands: Landmark[][], pinchThreshold = 0.075): GestureName {
  if (hands.length >= 2) {
    const detectedHands = hands.slice(0, 2);
    if (detectedHands.some((hand) => hand.length < 21)) return "none";
    const pinching = detectedHands.map(
      (hand) => distance(hand[4], hand[8]) < pinchThreshold,
    );
    return pinching.length === 2 && pinching.every(Boolean) ? "two-hand-zoom" : "two-hand-spread";
  }
  const hand = hands[0];
  if (!hand || hand.length < 21) return "none";

  const extended = fingerTips.map((tip, index) =>
    isFingerExtended(hand, tip, fingerPips[index]),
  );
  const thumbIsUp = hand[4].y < hand[3].y && hand[4].y < hand[2].y;
  const pinchDistance = distance(hand[4], hand[8]);

  if (pinchDistance < pinchThreshold) return "pinch";
  if (thumbIsUp && extended.every((isExtended) => !isExtended)) return "thumbs-up";
  if (extended.every((isExtended) => !isExtended)) return "closed-fist";
  if (extended[0] && extended.slice(1).every((isExtended) => !isExtended)) return "pointing";
  if (extended.filter(Boolean).length >= 4) return "open-palm";
  return "none";
}

export function palmCenter(hand: Landmark[]): Landmark {
  const wrist = hand[0];
  const middleBase = hand[9];
  return {
    x: (wrist.x + middleBase.x) / 2,
    y: (wrist.y + middleBase.y) / 2,
    z: (wrist.z + middleBase.z) / 2,
  };
}
