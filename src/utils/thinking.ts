// Thinking-block parsing — port of parseText / stripThinkingBlocks in
// lib/services/ai_service.dart (lines ~2027-2075). Handles Claude-style
// <think>...</think> reasoning blocks, including a still-open block at EOF.

export interface ParsedText {
  thinkContent: string | null;
  mainContent: string;
  isThinkingStill: boolean;
}

const THINK_REGEX = /<think>([\s\S]*?)(<\/think>|$)/gi;

export function parseText(text: string): ParsedText {
  const matches = Array.from(text.matchAll(THINK_REGEX));
  if (matches.length === 0) {
    return { thinkContent: null, mainContent: text, isThinkingStill: false };
  }

  let thinkBuffer = '';
  let isThinkingStill = false;
  for (const match of matches) {
    const group1 = (match[1] ?? '').trim();
    if (group1.length > 0) {
      // Dart: thinkBuffer.writeln('\n') then write(group1) → groups joined by '\n\n'.
      if (thinkBuffer.length > 0) thinkBuffer += '\n\n';
      thinkBuffer += group1;
    }
    if (!match[0].toLowerCase().endsWith('</think>')) {
      isThinkingStill = true;
    }
  }

  let main = text.replace(THINK_REGEX, '').trim();
  main = main.replace(/<\/think>/gi, '').trimStart();

  return { thinkContent: thinkBuffer, mainContent: main, isThinkingStill };
}

export function stripThinkingBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, '')
    .replace(/<\/think>/gi, '')
    .trimStart();
}
