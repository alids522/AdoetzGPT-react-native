// StreamingText — renders a (possibly partial) assistant message: parses
// <think>...</think> reasoning into a collapsible block, then renders the main
// markdown body. Phase 8 adds the word-by-word reveal pacing + animated cursor
// (port of streaming_text_renderer.dart); this faithful version re-renders the
// full text each flush, which is correct and smooth for typical message sizes.
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Brain } from 'lucide-react-native';
import { parseText } from '../utils/thinking';
import { useAppTheme } from '../ui/theme';
import { withAlpha } from '../ui/colors';
import MarkdownContent from './MarkdownContent';

export default function StreamingText({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const { palette: p } = useAppTheme();
  const { thinkContent, mainContent, isThinkingStill } = parseText(text);
  const [showThink, setShowThink] = React.useState(true);

  return (
    <View>
      {thinkContent && thinkContent.length > 0 ? (
        <View
          style={[
            styles.think,
            {
              borderLeftColor: withAlpha(p.primary, isThinkingStill ? 1 : 0.5),
              backgroundColor: withAlpha(p.primary, 0.06),
              borderRadius: p.controlRadius,
            },
          ]}
        >
          <View style={styles.thinkHeader}>
            <Brain size={14} color={p.primary} />
            <Text style={[styles.thinkTitle, { color: p.primary }]}>
              {isThinkingStill ? 'Thinking…' : 'Thoughts'}
            </Text>
          </View>
          {showThink ? (
            <Text style={[styles.thinkBody, { color: p.onSurfaceVariant }]}>{thinkContent}</Text>
          ) : null}
        </View>
      ) : null}

      {mainContent.length > 0 ? (
        <MarkdownContent text={mainContent} />
      ) : isStreaming ? (
        <Text style={{ color: p.onSurfaceVariant }}>…</Text>
      ) : null}

      {isStreaming && mainContent.length > 0 ? (
        <Text style={{ color: p.primary, fontSize: 16 }}> ▋</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  think: { borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  thinkHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  thinkTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  thinkBody: { fontSize: 13, lineHeight: 19 },
});
