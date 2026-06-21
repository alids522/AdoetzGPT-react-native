// Token helpers — port of countTokens / formatTokenCount / contextWindow in
// lib/services/ai_service.dart (lines ~2163-2191).

/** Rough estimate (~4 chars/token, min 1) — matches the Dart implementation. */
export function countTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return tokens.toString();
}

export function contextWindow(model: string): number {
  const normalized = model.toLowerCase().trim();
  if (normalized.includes('gemini-1.5-pro')) return 2_000_000;
  if (normalized.includes('gemini')) return 1_000_000;
  if (normalized.includes('claude')) return 200_000;
  if (normalized.includes('o1')) return 200_000;
  if (
    normalized.includes('gpt-4o') ||
    normalized.includes('gpt-4-turbo') ||
    normalized.includes('gpt')
  ) {
    return 128_000;
  }
  if (
    normalized.includes('llama-3.1') ||
    normalized.includes('llama-3.3') ||
    normalized.includes('qwen')
  ) {
    return 131_072;
  }
  if (normalized.includes('mistral') || normalized.includes('deepseek')) {
    return 128_000;
  }
  return 128_000;
}
