import type { KeyboardEvent } from 'react';

// Ctrl+B wraps the selection in **…**, which the program PDF prints in bold. insertText goes through
// the browser's own editing, so React's onChange fires and Ctrl+Z undoes it like typing.
export function boldOnCtrlB(event: KeyboardEvent<HTMLTextAreaElement>): void {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'b') {
    return;
  }
  event.preventDefault();
  const field = event.currentTarget;
  const { selectionStart: start, selectionEnd: end, value } = field;
  const selected = value.slice(start, end);
  document.execCommand('insertText', false, `**${selected}**`);
  if (selected) {
    field.setSelectionRange(start + 2, end + 2);
  } else {
    field.setSelectionRange(start + 2, start + 2);
  }
}
