import Svg, { Circle, Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  stroke?: number;
}

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const });

const line = (color: string, stroke: number) => ({
  stroke: color,
  strokeWidth: stroke,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const CheckIcon = ({ size = 18, color = '#fff', stroke = 3 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M5 12.5l4.6 4.6L19 7.4" {...line(color, stroke)} />
  </Svg>
);

export const SearchIcon = ({ size = 18, color = '#8E8E93', stroke = 2 }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={11} cy={11} r={6.5} {...line(color, stroke)} />
    <Path d="M16 16l4 4" {...line(color, stroke)} />
  </Svg>
);

export const PlusIcon = ({ size = 18, color = '#fff', stroke = 2.4 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M12 5v14M5 12h14" {...line(color, stroke)} />
  </Svg>
);

export const MinusIcon = ({ size = 18, color = '#fff', stroke = 2.4 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M5 12h14" {...line(color, stroke)} />
  </Svg>
);

export const CloseIcon = ({ size = 16, color = '#8E8E93', stroke = 2.4 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M6 6l12 12M18 6L6 18" {...line(color, stroke)} />
  </Svg>
);

export const ChevronDownIcon = ({ size = 14, color = '#8E8E93', stroke = 2.6 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M6 9l6 6 6-6" {...line(color, stroke)} />
  </Svg>
);

export const ClockIcon = ({ size = 16, color = '#8E8E93', stroke = 2 }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={12} cy={12} r={8.5} {...line(color, stroke)} />
    <Path d="M12 7.5V12l3 2" {...line(color, stroke)} />
  </Svg>
);

export const ArrowUpIcon = ({ size = 12, color = '#30D158', stroke = 3 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M12 19V5M6 11l6-6 6 6" {...line(color, stroke)} />
  </Svg>
);

export const PlayIcon = ({ size = 18, color = '#fff' }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill={color} />
  </Svg>
);

export const PauseIcon = ({ size = 18, color = '#fff' }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M8 5v14M16 5v14" stroke={color} strokeWidth={3.4} strokeLinecap="round" />
  </Svg>
);

export const ChevronLeftIcon = ({ size = 18, color = '#fff', stroke = 2.6 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M15 5l-7 7 7 7" {...line(color, stroke)} />
  </Svg>
);

export const ChevronRightIcon = ({ size = 18, color = '#fff', stroke = 2.6 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M9 5l7 7-7 7" {...line(color, stroke)} />
  </Svg>
);

export const SlidersIcon = ({ size = 20, color = '#fff', stroke = 2.2 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M4 7h9M17 7h3M4 17h3M11 17h9" {...line(color, stroke)} />
    <Circle cx={15} cy={7} r={2.2} {...line(color, stroke)} />
    <Circle cx={9} cy={17} r={2.2} {...line(color, stroke)} />
  </Svg>
);
