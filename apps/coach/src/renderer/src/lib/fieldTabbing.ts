const FIELDS = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not(:disabled)',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
].join(', ');

// Tab walks between form fields only; buttons and links stay reachable by mouse, not by Tab.
export function installFieldTabbing(root: Document): void {
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    event.preventDefault();

    const fields = Array.from(root.querySelectorAll<HTMLElement>(FIELDS)).filter(
      (field) => field.getClientRects().length > 0,
    );
    if (fields.length === 0) {
      return;
    }
    const current = fields.indexOf(root.activeElement as HTMLElement);
    const step = event.shiftKey ? -1 : 1;
    const next =
      current === -1
        ? event.shiftKey ? fields.length - 1 : 0
        : (current + step + fields.length) % fields.length;
    fields[next]?.focus();
  });
}
