import Svg, { Circle, Path, Rect } from 'react-native-svg';

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

export const ArrowUpIcon = ({ size = 12, color = '#3DFF6E', stroke = 3 }: IconProps) => (
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

export const TrashIcon = ({ size = 16, color = '#FF5A4F', stroke = 2 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" {...line(color, stroke)} />
    <Path d="M10 11v6M14 11v6" {...line(color, stroke)} />
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

export const FingerprintIcon = ({ size = 24, color = '#fff', stroke = 1.8 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <Path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <Path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
    <Path d="M2 12a10 10 0 0 1 18-6" />
    <Path d="M2 16h.01" />
    <Path d="M21.8 16c.2-2 .131-5.354 0-6" />
    <Path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
    <Path d="M8.65 22c.21-.66.45-1.32.57-2" />
    <Path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
  </Svg>
);

export const CalendarIcon = ({ size = 24, color = '#fff', stroke = 1.9 }: IconProps) => (
  <Svg {...base(size)}>
    <Rect x={3} y={5} width={18} height={16} rx={3} {...line(color, stroke)} />
    <Path d="M16 3v4M8 3v4M3 10h18" {...line(color, stroke)} />
  </Svg>
);

export const CalendarCheckIcon = ({ size = 22, color = '#fff', stroke = 1.9 }: IconProps) => (
  <Svg {...base(size)}>
    <Rect x={3} y={5} width={18} height={16} rx={3} {...line(color, stroke)} />
    <Path d="M16 3v4M8 3v4M3 10h18M9 15.5l2 2 4-4" {...line(color, stroke)} />
  </Svg>
);

export const DumbbellIcon = ({ size = 22, color = '#fff', stroke = 1.9 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M6.5 6v12M3 9v6M17.5 6v12M21 9v6M6.5 12h11" {...line(color, stroke)} />
  </Svg>
);

export const PulseIcon = ({ size = 22, color = '#fff', stroke = 1.9 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M3 12h4l3-8 4 16 3-8h4" {...line(color, stroke)} />
  </Svg>
);

export const SunIcon = ({ size = 30, color = '#000', stroke = 2.4, opacity = 1 }: IconProps & { opacity?: number }) => (
  <Svg {...base(size)} opacity={opacity}>
    <Circle cx={12} cy={12} r={4} {...line(color, stroke)} />
    <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...line(color, stroke)} />
  </Svg>
);

export const CrossIcon = ({ size = 28, color = '#000', stroke = 2.8, opacity = 1 }: IconProps & { opacity?: number }) => (
  <Svg {...base(size)} opacity={opacity}>
    <Path d="M6 6l12 12M18 6L6 18" {...line(color, stroke)} />
  </Svg>
);

export const DotsIcon = ({ size = 20, color = '#C7C7CC' }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={5} cy={12} r={1.8} fill={color} />
    <Circle cx={12} cy={12} r={1.8} fill={color} />
    <Circle cx={19} cy={12} r={1.8} fill={color} />
  </Svg>
);

export const PlayCircleIcon = ({ size = 34, color = '#C7C7CC', stroke = 1.8 }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={12} cy={12} r={10} {...line(color, stroke)} />
    <Path d="M10 8.5v7l6-3.5z" {...line(color, stroke)} />
  </Svg>
);

export const PersonIcon = ({ size = 22, color = '#fff', stroke = 1.9 }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={12} cy={8} r={4} {...line(color, stroke)} />
    <Path d="M4.5 21c1-4 3.8-6 7.5-6s6.5 2 7.5 6" {...line(color, stroke)} />
  </Svg>
);

export const CameraIcon = ({ size = 24, color = '#fff', stroke = 2 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" {...line(color, stroke)} />
    <Circle cx={12} cy={13.5} r={3.5} {...line(color, stroke)} />
  </Svg>
);

export const PencilIcon = ({ size = 24, color = '#fff', stroke = 2 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" {...line(color, stroke)} />
  </Svg>
);

export const FileIcon = ({ size = 24, color = '#fff', stroke = 2 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M6 3h8l5 5v13H6z" {...line(color, stroke)} />
    <Path d="M14 3v5h5M9 13h7M9 17h7" {...line(color, stroke)} />
  </Svg>
);

export const UploadIcon = ({ size = 24, color = '#fff', stroke = 2 }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M12 16V5M7 10l5-5 5 5M4 19h16" {...line(color, stroke)} />
  </Svg>
);

export const InfoIcon = ({ size = 22, color = '#fff', stroke = 2 }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={12} cy={12} r={9} {...line(color, stroke)} />
    <Path d="M12 11v5M12 8v.01" {...line(color, stroke)} />
  </Svg>
);
