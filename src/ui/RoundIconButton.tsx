// RoundIconButton — port of lib/ui/app_theme.dart RoundIconButton.
// Uses RN Animated for the press scale (motionScale * 0.94); classic theme and
// reduced motion skip scaling (matches Dart).
import * as React from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from './theme';
import { withAlpha } from './colors';

export interface RoundIconButtonProps {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress?: () => void;
  tooltip?: string;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
}

export default function RoundIconButton({
  Icon,
  onPress,
  size = 40,
  iconSize = 20,
  color,
  background,
}: RoundIconButtonProps) {
  const { palette: p } = useAppTheme();
  const scale = React.useRef(new Animated.Value(1)).current;
  const [active, setActive] = React.useState(false);

  const skipScale = p.isClassic;
  const pressedScale = 0.94 * p.motionScale;

  const animateTo = (toValue: number) => {
    if (skipScale) return;
    Animated.timing(scale, {
      toValue,
      duration: 140,
      useNativeDriver: true,
    }).start();
  };

  const resolvedBg =
    background ?? (active && !p.isClassic ? withAlpha(p.surfaceBright, p.isAurora ? 0.22 : 0.48) : 'transparent');

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        setActive(true);
        animateTo(pressedScale);
      }}
      onPressOut={() => {
        setActive(false);
        animateTo(1);
      }}
      disabled={!onPress}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: resolvedBg },
          { transform: [{ scale: skipScale ? 1 : scale }] },
        ]}
      >
        <Icon size={iconSize} color={color ?? p.onSurfaceVariant} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
