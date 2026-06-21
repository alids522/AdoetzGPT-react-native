// artifactParser — port of lib/utils/artifact_parser.dart.
// Extracts files (// file: ... / <!-- file: ... -->) from fenced code blocks.

export function parseArtifactFiles(markdown: string): Record<string, string> {
  const files: Record<string, string> = {};
  const fence = /```([^\n`]*)\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(markdown)) !== null) {
    const content = (match[2] ?? '').trim();
    if (content.length === 0) continue;
    const firstLine = content.split('\n')[0].trim();
    let filename: string | null = null;
    const fileMatch = /(?:\/\/|<!--|\/\*)\s*file:\s*([^\s>]+)/.exec(firstLine);
    if (fileMatch) {
      filename = fileMatch[1];
    } else if (firstLine.startsWith('file: ')) {
      filename = firstLine.substring(6).trim();
    }
    if (filename && filename.length > 0) files[filename] = content;
  }
  return files;
}
