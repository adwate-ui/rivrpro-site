const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** A headline's HTML: the text escaped, and each *word* set as the gold italic accent. */
export function accent(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ENTITIES[char]!).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
