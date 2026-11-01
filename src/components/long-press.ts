// Context-menu binding that also works on touch devices. Desktop gets the
// native `contextmenu` event (right-click). iOS WebKit does not fire
// `contextmenu` on long-press, so on mobile a ~500ms press without movement
// synthesizes the same event and routes it through the same handler.

import { Platform } from 'obsidian';

export const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 10;
// How long after release the trailing click is still swallowed. A new
// touchstart resets it, so a quick follow-up tap is never eaten.
const RELEASE_CLICK_WINDOW_MS = 800;

export function onContextMenuOrLongPress(
  el: HTMLElement,
  handler: (evt: MouseEvent) => void,
): void {
  // A long-press already handled the gesture; ignore the follow-up native
  // contextmenu (Android) and the click that ends the touch. `held` covers
  // the finger staying down for any length of time after the menu opens;
  // `suppressUntil` covers the click WebKit dispatches just after release.
  let held = false;
  let suppressUntil = 0;
  const suppressed = (): boolean => held || Date.now() < suppressUntil;

  el.addEventListener('contextmenu', (evt) => {
    if (suppressed()) {
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }
    handler(evt);
  });

  if (!Platform.isMobile) return;

  let timer: number | null = null;
  let startX = 0;
  let startY = 0;
  const clear = (): void => {
    if (timer !== null) activeWindow.clearTimeout(timer);
    timer = null;
  };

  el.addEventListener('touchstart', (evt: TouchEvent) => {
    if (evt.touches.length !== 1) {
      clear();
      return;
    }
    const touch = evt.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    clear();
    held = false;
    suppressUntil = 0;
    timer = activeWindow.setTimeout(() => {
      timer = null;
      held = true;
      handler(new MouseEvent('contextmenu', {
        bubbles: false,
        cancelable: true,
        clientX: startX,
        clientY: startY,
      }));
    }, LONG_PRESS_MS);
  }, { passive: true });

  el.addEventListener('touchmove', (evt: TouchEvent) => {
    const touch = evt.touches[0];
    if (!touch) return;
    if (Math.abs(touch.clientX - startX) > MOVE_TOLERANCE_PX
      || Math.abs(touch.clientY - startY) > MOVE_TOLERANCE_PX) clear();
  }, { passive: true });
  const release = (): void => {
    clear();
    if (!held) return;
    held = false;
    suppressUntil = Date.now() + RELEASE_CLICK_WINDOW_MS;
  };
  el.addEventListener('touchend', release);
  el.addEventListener('touchcancel', release);

  el.addEventListener('click', (evt) => {
    if (suppressed()) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
    }
  }, { capture: true });
}
