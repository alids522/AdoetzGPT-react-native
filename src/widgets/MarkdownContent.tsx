// MarkdownContent — themed wrapper around react-native-markdown-display.
import * as React from 'react';
import { Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useAppTheme } from '../ui/theme';

export default function MarkdownContent({ text }: { text: string }) {
  const { palette: p } = useAppTheme();
  const styles = React.useMemo(
    () => ({
      body: { color: p.onSurface, fontSize: 15, lineHeight: 22 },
      heading1: { color: p.onSurface, fontSize: 24, fontWeight: '700' as const, marginTop: 12, marginBottom: 6 },
      heading2: { color: p.onSurface, fontSize: 20, fontWeight: '700' as const, marginTop: 10, marginBottom: 4 },
      heading3: { color: p.onSurface, fontSize: 17, fontWeight: '700' as const, marginTop: 8, marginBottom: 4 },
      strong: { fontWeight: '700' as const, color: p.onSurface },
      em: { fontStyle: 'italic' as const },
      code_inline: { backgroundColor: p.surfaceDim, color: p.onSurface, paddingHorizontal: 4, borderRadius: 4 },
      fence: { backgroundColor: p.surfaceDim, borderRadius: 10, padding: 12, color: p.onSurface, marginBottom: 8 },
      code_block: { backgroundColor: p.surfaceDim, borderRadius: 10, padding: 12, color: p.onSurface },
      blockquote: { borderLeftWidth: 3, borderLeftColor: p.primary, paddingLeft: 10, opacity: 0.9 },
      link: { color: p.primary, textDecorationLine: 'underline' as const },
      bullet_list: { marginVertical: 4 },
      ordered_list: { marginVertical: 4 },
      list_item: { marginVertical: 2 },
      paragraph: { marginTop: 0, marginBottom: 8 },
    }),
    [p],
  );

  return (
    <Markdown
      style={styles}
      mergeStyle
      onLinkPress={(url) => {
        Linking.openURL(url).catch(() => {});
        return true;
      }}
    >
      {text}
    </Markdown>
  );
}
