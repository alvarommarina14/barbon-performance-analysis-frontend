// Tab does nothing anywhere in the app: every control is reached with the mouse.
export function disableTabKey(root: Document): void {
  root.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
      }
    },
    true,
  );
}
