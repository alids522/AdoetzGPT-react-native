// SectionHeader — port of lib/ui/app_theme.dart SectionHeader.
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from './theme';
import { withAlpha } from './colors';

export interface SectionHeaderProps {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  accent?: string;
}

export default function SectionHeader({ Icon, title, accent }: SectionHeaderProps) {
  const { palette: p } = useAppTheme();
  const c = accent ?? p.primary;
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: withAlpha(c, 0.12), borderRadius: 12 }]}>
        <Icon size={18} color={c} />
      </View>
      <Text style={[styles.title, { color: p.primary }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { padding: 9 },
  title: { fontSize: 14, fontWeight: '800', letterSpacing: 2.2 },
});
