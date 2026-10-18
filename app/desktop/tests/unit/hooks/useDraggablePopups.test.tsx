import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useDraggablePopups } from '../../../src/hooks/useDraggablePopups';

function PopupFixture() {
  useDraggablePopups();
  return (
    <section role="dialog" aria-label="Sample dialog">
      <header>
        <h2>Popup title</h2>
      </header>
    </section>
  );
}

describe('draggable popups', () => {
  afterEach(cleanup);

  it('moves a dialog when its header is dragged', () => {
    render(<PopupFixture />);
    const popup = screen.getByRole('dialog');
    Object.defineProperty(popup, 'getBoundingClientRect', {
      value: () => ({ left: 200, top: 120, right: 500, bottom: 420 }),
    });

    fireEvent(
      screen.getByText('Popup title'),
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 240, clientY: 140 }),
    );
    expect(popup.classList.contains('draggable-popup')).toBe(true);
    fireEvent(
      document,
      new MouseEvent('pointermove', { bubbles: true, clientX: 280, clientY: 175 }),
    );
    fireEvent(document, new MouseEvent('pointerup', { bubbles: true }));

    expect(popup.style.getPropertyValue('--popup-x')).toBe('40px');
    expect(popup.style.getPropertyValue('--popup-y')).toBe('35px');
  });
});
