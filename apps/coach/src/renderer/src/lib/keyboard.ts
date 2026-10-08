// While coaching, the keyboard drives the video and nothing else: Tab never moves focus. Setup is
// form work with no video to drive, so Tab moves between fields there. Everywhere, a clicked
// button or link never keeps focus, so Space or Enter cannot press it again.
export function restrictKeyboard(root: Document): void {
  root.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Tab' && !root.querySelector('[data-mode="setup"]')) {
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
