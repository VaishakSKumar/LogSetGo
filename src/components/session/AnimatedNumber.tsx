import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { roundedFont } from '../../theme';

interface Props {
  value: number;
  format?: (n: number) => string;
  className?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

const thousands = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * A figure that counts to its new value instead of jumping (ease-out, 350 ms). Interrupted mid-count,
 * it continues from wherever it had got to, so rapid changes never snap back.
 */
export function AnimatedNumber({ value, format = thousands, className = '', style, duration = 350 }: Props) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = t >= 1 ? value : from + (value - from) * eased;
      setShown(current.current);
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value, duration]);

  return (
    <Text className={`tabular-nums ${className}`} style={[{ fontFamily: roundedFont }, style]}>
      {format(shown)}
    </Text>
  );
}
