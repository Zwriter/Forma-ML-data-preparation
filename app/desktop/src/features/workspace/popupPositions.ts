import type { CSSProperties } from 'react';

export type PopupPosition = { left: number; top: number };

export function popupPositionFromAnchor(anchor: HTMLElement): PopupPosition {
  const bounds = anchor.getBoundingClientRect();
  const width = Math.min(350, window.innerWidth - 16);
  return {
    left: Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(bounds.bottom + 8, window.innerHeight - 120)),
  };
}

export function popupStyle(position: PopupPosition = { left: 8, top: 100 }): CSSProperties {
  return {
    position: 'fixed',
    left: position.left,
    top: position.top,
    maxHeight: `calc(100vh - ${position.top}px - 12px)`,
    '--popup-x': '0px',
    '--popup-y': '0px',
  } as CSSProperties;
}
