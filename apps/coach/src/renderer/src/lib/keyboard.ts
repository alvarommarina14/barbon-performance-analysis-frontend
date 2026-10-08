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
      const pressable = (event.target as Element | null)?.closest<HTMLElement>('button, a[href], [role="button"]');
      if (!pressable) {
        return;
      }
      // Cancelling mousedown would also cancel the drag, so a draggable control lets go of focus
      // once the click lands instead.
      if (pressable.draggable) {
        pressable.addEventListener('click', () => pressable.blur(), { once: true });
        return;
      }
      event.preventDefault();
      (root.activeElement as HTMLElement | null)?.blur();
    },
    true,
  );
}
