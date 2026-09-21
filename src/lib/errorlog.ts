/** Pure, platform-free parts of the local crash log (the storage and handlers live in diagnostics.ts). */
export interface ErrorEntry {
  at: number;
  message: string;
  stack?: string;
  context?: string;
}

export const MAX_ERRORS = 20;
const MAX_TEXT = 1500;

/** Newest first, capped, with long text trimmed. */
export function pushError(list: ErrorEntry[], entry: ErrorEntry, max = MAX_ERRORS): ErrorEntry[] {
  const clip = (s?: string) => (s && s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}…` : s);
  return [{ ...entry, message: clip(entry.message) ?? 'Unknown error', stack: clip(entry.stack) }, ...list].slice(0, max);
}

/** Plain text, ready to paste into a message. */
export function formatErrorReport(list: ErrorEntry[], appVersion: string, platform: string): string {
  const head = `LogSetGo ${appVersion} on ${platform}\n${list.length} recorded error(s)\n`;
  return (
    head +
    list
      .map((e) => `\n— ${new Date(e.at).toISOString()}${e.context ? ` [${e.context}]` : ''}\n${e.message}${e.stack ? `\n${e.stack}` : ''}`)
      .join('\n')
  );
}
