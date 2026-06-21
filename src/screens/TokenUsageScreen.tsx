// TokenUsageScreen (Phase 6). Totals + a gifted-charts bar chart of tokens by
// model. Full filters (time/model/endpoint, line+pie) land in Phase 8.
import * as React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import { Gauge } from 'lucide-react-native';
import ThemedBackdrop from '../ui/ThemedBackdrop';
import GlassPanel from '../ui/GlassPanel';
import SectionHeader from '../ui/SectionHeader';
import { useAppTheme } from '../ui/theme';
import { useAppStore } from '../state/store';
import { formatTokenCount } from '../utils/tokens';

const BAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#A855F7', '#EC4899', '#22D3EE', '#F472B6', '#8B5CF6'];

export default function TokenUsageScreen() {
  const { palette: p } = useAppTheme();
  const records = useAppStore((s) => s.tokenUsageData);
  const inputCosts = useAppStore((s) => s.modelInputCosts);
  const outputCosts = useAppStore((s) => s.modelOutputCosts);
  const cacheCosts = useAppStore((s) => s.modelCacheHitCosts);

  const { totals, byModel } = React.useMemo(() => {
    const map = new Map<string, { input: number; output: number; cost: number }>();
    let input = 0, output = 0, cached = 0, cost = 0;
    for (const r of records) {
      input += r.inputTokens;
      output += r.outputTokens;
      cached += r.cachedInputTokens;
      const c =
        (r.inputTokens / 1_000_000) * (inputCosts[r.model] ?? 0) +
        (r.outputTokens / 1_000_000) * (outputCosts[r.model] ?? 0) +
        (r.cachedInputTokens / 1_000_000) * (cacheCosts[r.model] ?? 0);
      cost += c;
      const m = map.get(r.model) ?? { input: 0, output: 0, cost: 0 };
      m.input += r.inputTokens;
      m.output += r.outputTokens;
      m.cost += c;
      map.set(r.model, m);
    }
    const byModel = Array.from(map.entries())
      .map(([model, v]) => ({ model, ...v, total: v.input + v.output }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
    return { totals: { input, output, cached, cost }, byModel };
  }, [records, inputCosts, outputCosts, cacheCosts]);

  const chartData = byModel.map((m, i) => ({
    value: Math.round(m.total / 1000),
    label: m.model.length > 10 ? m.model.slice(0, 9) + '…' : m.model,
    frontColor: BAR_COLORS[i % BAR_COLORS.length],
  }));

  return (
    <View style={styles.root}>
      <ThemedBackdrop />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
          <Text style={[styles.pageTitle, { color: p.onSurface }]}>Token Usage</Text>

          <View style={styles.section}>
            <SectionHeader Icon={Gauge} title="Totals" />
            <GlassPanel padding={18}>
              <View style={styles.statRow}>
                <Text style={{ color: p.onSurfaceVariant, fontSize: 13 }}>Total tokens</Text>
                <Text style={{ color: p.primary, fontSize: 22, fontWeight: '800' }}>{formatTokenCount(totals.input + totals.output)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={{ color: p.onSurfaceVariant, fontSize: 13 }}>Input / Output</Text>
                <Text style={{ color: p.onSurface, fontSize: 16, fontWeight: '700' }}>
                  {formatTokenCount(totals.input)} / {formatTokenCount(totals.output)}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={{ color: p.onSurfaceVariant, fontSize: 13 }}>Estimated cost</Text>
                <Text style={{ color: p.onSurface, fontSize: 18, fontWeight: '700' }}>${totals.cost.toFixed(4)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={{ color: p.onSurfaceVariant, fontSize: 13 }}>Requests / Cache hits</Text>
                <Text style={{ color: p.onSurface, fontSize: 16, fontWeight: '700' }}>
                  {records.length} / {formatTokenCount(totals.cached)}
                </Text>
              </View>
            </GlassPanel>
          </View>

          {chartData.length > 0 && (
            <View style={styles.section}>
              <SectionHeader Icon={Gauge} title="By model (K tokens)" />
              <GlassPanel padding={18}>
                <BarChart
                  data={chartData}
                  barWidth={Math.max(18, Math.floor(260 / Math.max(chartData.length, 1)))}
                  roundedTop
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={p.outline}
                  yAxisColor={p.onSurfaceVariant}
                  xAxisLabelTextStyle={{ color: p.onSurfaceVariant, fontSize: 10 }}
                  rulesColor={withAlphaFix(p.outline, 0.4)}
                  rotateLabel
                  height={180}
                />
                <View style={{ marginTop: 12 }}>
                  {byModel.map((m, i) => (
                    <View key={m.model} style={[styles.legendRow]}>
                      <View style={[styles.dot, { backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
                      <Text style={{ color: p.onSurface, fontSize: 13, flex: 1 }}>{m.model}</Text>
                      <Text style={{ color: p.onSurfaceVariant, fontSize: 12 }}>{formatTokenCount(m.total)} · ${m.cost.toFixed(3)}</Text>
                    </View>
                  ))}
                </View>
              </GlassPanel>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// gifted-charts rulesColor needs a non-rgba hex in some versions; keep hex.
function withAlphaFix(color: string, _alpha: number): string {
  return color.startsWith('#') && color.length === 7 ? color : '#888888';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  pageTitle: { fontSize: 28, fontWeight: '800', fontFamily: 'HankenGrotesk_800ExtraBold', paddingHorizontal: 4, paddingBottom: 12 },
  section: { marginBottom: 22 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
