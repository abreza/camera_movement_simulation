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

    case MovementEasing.EaseInBack:
      return t * t * ((1.70158 + 1) * t - 1.70158);

    case MovementEasing.EaseOutBack: {
      const scaledTime = t - 1;
      return (
        scaledTime * scaledTime * ((1.70158 + 1) * scaledTime + 1.70158) + 1
      );
    }

    case MovementEasing.EaseInOutBack: {
      const s = 1.70158 * 1.525;
      const scaledTime = t * 2;
      const scaledTime2 = scaledTime - 2;

      if (scaledTime < 1) {
        return 0.5 * scaledTime * scaledTime * ((s + 1) * scaledTime - s);
      }

      return (
        0.5 * (scaledTime2 * scaledTime2 * ((s + 1) * scaledTime2 + s) + 2)
      );
    }

    case MovementEasing.EaseInElastic: {
      if (t === 0 || t === 1) return t;

      const p = 0.3;
      const s = (p / (2 * Math.PI)) * Math.asin(1);

      return -(
        Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1 - s) * (2 * Math.PI)) / p)
      );
    }

    case MovementEasing.EaseOutElastic: {
      if (t === 0 || t === 1) return t;

      const p = 0.3;
      const s = (p / (2 * Math.PI)) * Math.asin(1);

      return Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;
    }

    case MovementEasing.EaseInOutElastic: {
      if (t === 0 || t === 1) return t;

      const p = 0.3 * 1.5;
      const s = (p / (2 * Math.PI)) * Math.asin(1);
      const scaledTime = t * 2;

      if (scaledTime < 1) {
        return (
          -0.5 *
          (Math.pow(2, 10 * (scaledTime - 1)) *
            Math.sin(((scaledTime - 1 - s) * (2 * Math.PI)) / p))
        );
      }

      return (
        Math.pow(2, -10 * (scaledTime - 1)) *
          Math.sin(((scaledTime - 1 - s) * (2 * Math.PI)) / p) *
          0.5 +
        1
      );
    }

    case MovementEasing.EaseOutBounce: {
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        const scaledTime = t - 1.5 / 2.75;
        return 7.5625 * scaledTime * scaledTime + 0.75;
      } else if (t < 2.5 / 2.75) {
        const scaledTime = t - 2.25 / 2.75;
        return 7.5625 * scaledTime * scaledTime + 0.9375;
      } else {
        const scaledTime = t - 2.625 / 2.75;
        return 7.5625 * scaledTime * scaledTime + 0.984375;
      }
    }

    case MovementEasing.EaseInBounce:
      return 1 - getEasedTime(1 - t, MovementEasing.EaseOutBounce);

    case MovementEasing.EaseInOutBounce:
      return t < 0.5
        ? getEasedTime(t * 2, MovementEasing.EaseInBounce) * 0.5
        : getEasedTime(t * 2 - 1, MovementEasing.EaseOutBounce) * 0.5 + 0.5;

    case MovementEasing.HandHeld: {
      const noise =
        Math.sin(t * 12.9898) *
        Math.sin(t * 78.233) *
        Math.sin(t * 37.719) *
        0.015;
      return t + noise;
    }

    case MovementEasing.Anticipation: {
      if (t < 0.2) {
        return -0.1 * Math.sin((t / 0.2) * Math.PI);
      } else {
        const adjustedT = (t - 0.2) / 0.8;
        return adjustedT * adjustedT * (3 - 2 * adjustedT);
      }
    }

    case MovementEasing.Smooth:
      return t * t * (3 - 2 * t);

    default:
      return t;
  }
};
