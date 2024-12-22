import { MovementEasing } from "@/types/simulation";

const elasticOut = (t: number): number => {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
};

const bounceOut = (t: number): number => {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    const adjusted = t - 1.5 / 2.75;
    return 7.5625 * adjusted * adjusted + 0.75;
  } else if (t < 2.5 / 2.75) {
    const adjusted = t - 2.25 / 2.75;
    return 7.5625 * adjusted * adjusted + 0.9375;
  } else {
    const adjusted = t - 2.625 / 2.75;
    return 7.5625 * adjusted * adjusted + 0.984375;
  }
};

const handHeldNoise = (t: number): number => {
  // Perlin-like noise simulation for handheld camera effect
  const noise =
    Math.sin(t * 12.9898) * Math.sin(t * 78.233) * Math.sin(t * 37.719) * 0.015;
  return t + noise;
};

export const getEasedTime = (t: number, easing: MovementEasing): number => {
  t = Math.max(0, Math.min(1, t));

  switch (easing) {
    case MovementEasing.Linear:
      return t;

    case MovementEasing.EaseIn:
      return t * t;

    case MovementEasing.EaseOut:
      return t * (2 - t);

    case MovementEasing.EaseInOut:
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    case MovementEasing.Smooth:
      return t * t * (3 - 2 * t);

    case MovementEasing.Bounce:
      return bounceOut(t);

    case MovementEasing.Elastic:
      return elasticOut(t);

    case MovementEasing.HandHeld:
      return handHeldNoise(t);

    case MovementEasing.Anticipation:
      if (t < 0.2) {
        return -0.1 * Math.sin((t / 0.2) * Math.PI);
      } else {
        const adjustedT = (t - 0.2) / 0.8;
        return adjustedT * adjustedT * (3 - 2 * adjustedT);
      }

    default:
      return t;
  }
};
