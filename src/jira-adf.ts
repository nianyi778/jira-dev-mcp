export function adfToPlainText(node: unknown): string {
  if (!node || typeof node !== 'object') { return ''; }
  const record = node as { type?: string; text?: string; content?: unknown[] };
  if (record.type === 'text') { return record.text || ''; }
  if (!Array.isArray(record.content)) { return ''; }
  const content = record.content.map(adfToPlainText).filter(Boolean);
  if (record.type === 'paragraph' || record.type === 'heading') { return content.join(''); }
  if (record.type === 'listItem') { return `- ${content.join('')}`; }
  return content.join('\n');
}
