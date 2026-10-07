// The keyboard drives the video and nothing else: Tab never moves focus, and a clicked button or
// link never keeps focus, so Space or Enter cannot press it again.
export function restrictKeyboard(root: Document): void {
  root.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
      }
    },
    true,
  );
  root.addEventListener(
    'mousedown',
    (event) => {
      if ((event.target as Element | null)?.closest('button, a[href], [role="button"]')) {
        event.preventDefault();
        (root.activeElement as HTMLElement | null)?.blur();
      }
    },
    true,
  );
}
