import { getEasedTime } from "@/service/simulation/instruction/helpers/movement-easing";
import { MovementEasing } from "@/service/simulation/instruction/types";
import { FC, useMemo } from "react";
import { ResponsiveContainer, Line, LineChart } from "recharts";

export const EasingChart: FC<{ easing: MovementEasing }> = ({ easing }) => {
  const data = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      points.push({
        t,
        value: getEasedTime(t, easing),
      });
    }
    return points;
  }, [easing]);

  return (
    <ResponsiveContainer width={30} height={30}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="#2196f3"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
