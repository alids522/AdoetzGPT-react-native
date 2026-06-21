// SparkleMark — port of lib/ui/app_theme.dart SparkleMark (CustomPainter) to SVG.
// Same 4-stop gradient and cubic-bezier sparkle path as the Flutter source.
import * as React from 'react';
import { Svg, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface SparkleMarkProps {
  size?: number;
}

export default function SparkleMark({ size = 48 }: SparkleMarkProps) {
  const w = size;
  const h = size;
  const c = w / 2;
  // Path transcribed verbatim from _SparklePainter.paint().
  const d = [
    `M ${c} 0`,
    `C ${c + w * 0.08} ${c * 0.72}, ${c * 1.28} ${c * 0.92}, ${w} ${c}`,
    `C ${c * 1.28} ${c * 1.08}, ${c + w * 0.08} ${c * 1.28}, ${c} ${h}`,
    `C ${c - w * 0.08} ${c * 1.28}, ${c * 0.72} ${c * 1.08}, 0 ${c}`,
    `C ${c * 0.72} ${c * 0.92}, ${c - w * 0.08} ${c * 0.72}, ${c} 0`,
    'Z',
  ].join(' ');

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <LinearGradient id="sparkleGrad" x1="0" y1="0" x2={w} y2={h} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#38BDF8" />
          <Stop offset="0.33" stopColor="#818CF8" />
          <Stop offset="0.66" stopColor="#C084FC" />
          <Stop offset="1" stopColor="#F472B6" />
        </LinearGradient>
      </Defs>
      <Path d={d} fill="url(#sparkleGrad)" />
    </Svg>
  );
}
