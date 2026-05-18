import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ROUTE_MARKER_COLORS } from '@/shared/theme/routeMarkers';

type Props = {
  width?: number;
  height?: number;
};

/** Vector from `assets/images/locationFrame.svg` (no native image deps). */
export function LocationFrameSvg({ width = 28, height = 104 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 34 118" preserveAspectRatio="xMidYMid meet">
      <Line
        x1="17.5571"
        y1="37.5571"
        x2="17.5571"
        y2="84.4429"
        stroke="black"
        strokeOpacity={0.35}
        strokeWidth={1.11419}
        strokeLinecap="round"
        strokeDasharray="5, 5"
      />
      <Circle cx="17" cy="98" r="17" fill={ROUTE_MARKER_COLORS.dropoff} />
      <Path
        d="M12.5 88.5C12.5 87.9477 12.9477 87.5 13.5 87.5C14.0523 87.5 14.5 87.9477 14.5 88.5V89.35H23.2C23.7657 89.35 24.1048 89.9785 23.7931 90.4505L21.75 93.55L23.7931 96.6495C24.1048 97.1215 23.7657 97.75 23.2 97.75H14.5V107.5C14.5 108.052 14.0523 108.5 13.5 108.5C12.9477 108.5 12.5 108.052 12.5 107.5V88.5Z"
        fill="white"
      />
      <Circle cx="17" cy="17" r="17" fill={ROUTE_MARKER_COLORS.pickup} />
      <Path
        d="M16.75 8C13.022 8 10 11.022 10 14.75C10 16.3469 10.7037 17.7512 11.4825 18.9688L16.291 25.7626C16.3965 25.9117 16.5677 26 16.75 26C16.9322 26 17.1035 25.9117 17.209 25.7626L22.0175 18.9688C22.7617 17.9669 23.5 16.3469 23.5 14.75C23.5 11.022 20.478 8 16.75 8ZM16.75 18.6875C14.5754 18.6875 12.8125 16.9246 12.8125 14.75C12.8125 12.5754 14.5754 10.8125 16.75 10.8125C18.9246 10.8125 20.6875 12.5754 20.6875 14.75C20.6875 16.9246 18.9246 18.6875 16.75 18.6875Z"
        fill="white"
      />
    </Svg>
  );
}
