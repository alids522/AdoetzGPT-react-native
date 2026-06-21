// SegmentedPills — port of lib/ui/app_theme.dart SegmentedPills.
// Generic over the value type T. Selected pill gets the primary fill + glow.
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from './theme';
import { withAlpha } from './colors';

export interface SegmentItem<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
}

export interface SegmentedPillsProps<T extends string> {
  value: T;
  items: SegmentItem<T>[];
  onChange: (value: T) => void;
}

export default function SegmentedPills<T extends string>({
  value,
  items,
  onChange,
}: SegmentedPillsProps<T>) {
  const { palette: p } = useAppTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: p.surfaceDim,
          borderRadius: 18,
          borderColor: p.outline,
        },
      ]}
    >
      {items.map((item) => {
        const selected = item.value === value;
        const Icon = item.icon;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[
              styles.pill,
              {
                backgroundColor: selected ? p.primary : 'transparent',
                borderRadius: 14,
                shadowColor: selected ? p.primary : 'transparent',
                shadowOpacity: selected ? 0.25 : 0,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 0 },
                elevation: selected ? 3 : 0,
              },
            ]}
          >
            {Icon ? <Icon size={14} color={selected ? '#FFFFFF' : p.onSurfaceVariant} /> : null}
            <Text
              numberOfLines={1}
              style={{
                color: selected ? '#FFFFFF' : p.onSurfaceVariant,
                fontSize: 12,
                fontWeight: '800',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
});
