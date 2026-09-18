/** Quote all cells and neutralize spreadsheet formula prefixes. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
