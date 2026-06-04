import { Keypoint } from './PoseTypes';

export function angleBetweenThreePoints(
  a: Keypoint,
  b: Keypoint,
  c: Keypoint
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

export function distanceBetween(a: Keypoint, b: Keypoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function midpoint(a: Keypoint, b: Keypoint): Keypoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    score: Math.min(a.score, b.score),
  };
}

// Returns angle of a vector from vertical (0 = straight up/down)
export function angleFromVertical(top: Keypoint, bottom: Keypoint): number {
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;
  const radians = Math.atan2(Math.abs(dx), Math.abs(dy));
  return (radians * 180) / Math.PI;
}
