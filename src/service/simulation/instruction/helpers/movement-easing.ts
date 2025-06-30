import { MovementEasing } from "../types";

export const getEasedTime = (t: number, easing: MovementEasing): number => {
  t = Math.max(0, Math.min(1, t));

  switch (easing) {
    case MovementEasing.Linear:
      return t;

    case MovementEasing.EaseInSine:
      return -1 * Math.cos(t * (Math.PI / 2)) + 1;

    case MovementEasing.EaseOutSine:
      return Math.sin(t * (Math.PI / 2));

    case MovementEasing.EaseInOutSine:
      return -0.5 * (Math.cos(Math.PI * t) - 1);

    case MovementEasing.EaseInQuad:
      return t * t;

    case MovementEasing.EaseOutQuad:
      return t * (2 - t);

    case MovementEasing.EaseInOutQuad:
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    case MovementEasing.EaseInCubic:
      return t * t * t;

    case MovementEasing.EaseOutCubic: {
      const t1 = t - 1;
      return t1 * t1 * t1 + 1;
    }

    case MovementEasing.EaseInOutCubic:
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

    case MovementEasing.EaseInQuart:
      return t * t * t * t;

    case MovementEasing.EaseOutQuart: {
      const t1 = t - 1;
      return 1 - t1 * t1 * t1 * t1;
    }

    case MovementEasing.EaseInOutQuart: {
      const t1 = t - 1;
      return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * t1 * t1 * t1 * t1;
    }

    case MovementEasing.EaseInQuint:
      return t * t * t * t * t;

    case MovementEasing.EaseOutQuint: {
      const t1 = t - 1;
      return 1 + t1 * t1 * t1 * t1 * t1;
    }

    case MovementEasing.EaseInOutQuint: {
      const t1 = t - 1;
      return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * t1 * t1 * t1 * t1 * t1;
    }

    case MovementEasing.EaseInExpo:
      return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));

    case MovementEasing.EaseOutExpo:
      return t === 1 ? 1 : -Math.pow(2, -10 * t) + 1;

    case MovementEasing.EaseInOutExpo: {
      if (t === 0 || t === 1) return t;
      const scaledTime = t * 2;
      const scaledTime1 = scaledTime - 1;

      if (scaledTime < 1) {
        return 0.5 * Math.pow(2, 10 * scaledTime1);
      }

      return 0.5 * (-Math.pow(2, -10 * scaledTime1) + 2);
    }

    case MovementEasing.EaseInCirc:
      return -1 * (Math.sqrt(1 - t * t) - 1);

    case MovementEasing.EaseOutCirc: {
      const t1 = t - 1;
      return Math.sqrt(1 - t1 * t1);
    }

    case MovementEasing.EaseInOutCirc: {
      const scaledTime = t * 2;
      const scaledTime1 = scaledTime - 2;

      if (scaledTime < 1) {
        return -0.5 * (Math.sqrt(1 - scaledTime * scaledTime) - 1);
      }

      return 0.5 * (Math.sqrt(1 - scaledTime1 * scaledTime1) + 1);
    }

    case MovementEasing.Smooth:
      return t * t * (3 - 2 * t);

    default:
      return t;
  }
};
