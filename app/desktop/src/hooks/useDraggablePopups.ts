import { useEffect } from 'react';

const popupSelector = '[role="dialog"], .column-details-popover';
const dragHandleSelector = 'header, .inspector-heading, .confirm-dialog h2';

export function useDraggablePopups() {
  useEffect(() => {
    let stopDragging: (() => void) | undefined;

    function startDragging(event: PointerEvent) {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      if (event.target.closest('button, input, select, textarea, a')) return;
      const handle = event.target.closest(dragHandleSelector);
      const popup = handle?.closest<HTMLElement>(popupSelector);
      if (!handle || !popup) return;
      const dialog = popup;

      const bounds = dialog.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const offsetX = Number.parseFloat(dialog.style.getPropertyValue('--popup-x')) || 0;
      const offsetY = Number.parseFloat(dialog.style.getPropertyValue('--popup-y')) || 0;
      dialog.classList.add('draggable-popup');
      event.preventDefault();

      function move(pointer: PointerEvent) {
        const minX = 12 - bounds.left;
        const maxX = window.innerWidth - 12 - bounds.right;
        const minY = 12 - bounds.top;
        const maxY = window.innerHeight - 12 - bounds.bottom;
        const deltaX = Math.min(maxX, Math.max(minX, pointer.clientX - startX));
        const deltaY = Math.min(maxY, Math.max(minY, pointer.clientY - startY));
        dialog.style.setProperty('--popup-x', `${offsetX + deltaX}px`);
        dialog.style.setProperty('--popup-y', `${offsetY + deltaY}px`);
      }

      function stop() {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', stop);
        document.removeEventListener('pointercancel', stop);
        stopDragging = undefined;
      }

      stopDragging?.();
      stopDragging = stop;
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', stop);
      document.addEventListener('pointercancel', stop);
    }

    document.addEventListener('pointerdown', startDragging);
    return () => {
      document.removeEventListener('pointerdown', startDragging);
      stopDragging?.();
    };
  }, []);
}
