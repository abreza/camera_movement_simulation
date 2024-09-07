import { MovementEasing } from "@/types/simulation";

export function calculateEaseValue(t: number, easing: MovementEasing): number {
  switch (easing) {
    case MovementEasing.Linear:
      return t;

    // Quadratic easing
    case MovementEasing.EaseInQuad:
      return t * t;
    case MovementEasing.EaseOutQuad:
      return t * (2 - t);
    case MovementEasing.EaseInOutQuad:
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    // Cubic easing
    case MovementEasing.EaseInCubic:
      return t * t * t;
    case MovementEasing.EaseOutCubic:
      return --t * t * t + 1;
    case MovementEasing.EaseInOutCubic:
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

    // Quartic easing
    case MovementEasing.EaseInQuart:
      return t * t * t * t;
    case MovementEasing.EaseOutQuart:
      return 1 - --t * t * t * t;
    case MovementEasing.EaseInOutQuart:
      return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;

    // Quintic easing
    case MovementEasing.EaseInQuint:
      return t * t * t * t * t;
    case MovementEasing.EaseOutQuint:
      return 1 + --t * t * t * t * t;
    case MovementEasing.EaseInOutQuint:
      return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;

    // Sinusoidal easing
    case MovementEasing.EaseInSine:
      return 1 - Math.cos((t * Math.PI) / 2);
    case MovementEasing.EaseOutSine:
      return Math.sin((t * Math.PI) / 2);
    case MovementEasing.EaseInOutSine:
      return -(Math.cos(Math.PI * t) - 1) / 2;

    // Exponential easing
    case MovementEasing.EaseInExpo:
      return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
    case MovementEasing.EaseOutExpo:
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    case MovementEasing.EaseInOutExpo:
      return t === 0
        ? 0
        : t === 1
        ? 1
        : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;

    // Circular easing
    case MovementEasing.EaseInCirc:
      return 1 - Math.sqrt(1 - t * t);
    case MovementEasing.EaseOutCirc:
      return Math.sqrt(1 - --t * t);
    case MovementEasing.EaseInOutCirc:
      return t < 0.5
        ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
        : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2;

    // Bounce easing
    case MovementEasing.EaseInBounce:
      return 1 - easeOutBounce(1 - t);
    case MovementEasing.EaseOutBounce:
      return easeOutBounce(t);
    case MovementEasing.EaseInOutBounce:
      return t < 0.5
        ? (1 - easeOutBounce(1 - 2 * t)) / 2
        : (1 + easeOutBounce(2 * t - 1)) / 2;

    // Elastic easing
    case MovementEasing.EaseInElastic:
      return t === 0
        ? 0
        : t === 1
        ? 1
        : -Math.pow(2, 10 * t - 10) *
          Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
    case MovementEasing.EaseOutElastic:
      return t === 0
        ? 0
        : t === 1
        ? 1
        : Math.pow(2, -10 * t) *
            Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) +
          1;
    case MovementEasing.EaseInOutElastic:
      return t === 0
        ? 0
        : t === 1
        ? 1
        : t < 0.5
        ? -(
            Math.pow(2, 20 * t - 10) *
            Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))
          ) / 2
        : (Math.pow(2, -20 * t + 10) *
            Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) /
            2 +
          1;

    default:
      return t;
  }
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}
