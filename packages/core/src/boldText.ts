export interface TextRun {
  text: string;
  bold: boolean;
}

// Bold is stored as **word**, the rule the program PDF applies on the server: the marks wrap
// non-blank text and never span a line break.
const BOLD = /\*\*(\S(?:.*?\S)?)\*\*/g;

export function boldRuns(line: string): TextRun[] {
  const runs: TextRun[] = [];
  let last = 0;
  for (const match of line.matchAll(BOLD)) {
    if (match.index > last) {
      runs.push({ text: line.slice(last, match.index), bold: false });
    }
    runs.push({ text: match[1] ?? '', bold: true });
    last = match.index + match[0].length;
  }
  if (last < line.length) {
    runs.push({ text: line.slice(last), bold: false });
  }
  return runs;
}

// The inverse: whitespace at a bold run's edges moves outside the marks, which must hug the text.
export function boldMarkup(runs: TextRun[]): string {
  return runs
    .map(({ text, bold }) => {
      if (!bold || !text.trim()) {
        return text;
      }
      const [, lead, core, trail] = /^(\s*)(.*?)(\s*)$/s.exec(text) as RegExpExecArray;
      return `${lead}**${core}**${trail}`;
    })
    .join('');
}
