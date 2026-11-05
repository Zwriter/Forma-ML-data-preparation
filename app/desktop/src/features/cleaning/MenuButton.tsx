import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import '../../styles/menu-button.css';

export type MenuItem = { label: string; icon?: IconName; onSelect: () => void };

const ITEM_HEIGHT = 36;

/** Space under element before the nearest clipping ancestor or the window edge. */
function roomBelow(element: HTMLElement) {
  let bottom = window.innerHeight;
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (/auto|scroll|hidden/.test(getComputedStyle(node).overflowY))
      bottom = Math.min(bottom, node.getBoundingClientRect().bottom);
  }
  return bottom - element.getBoundingClientRect().bottom;
}

/** A button that opens a keyboard-navigable menu (arrows, Home, End, Escape). */
export function MenuButton({
  label,
  ariaLabel,
  title,
  menuLabel,
  items,
  disabled = false,
  className = '',
}: {
  label: ReactNode;
  ariaLabel?: string;
  /** Hover hint, for a trigger that shows only an icon. */
  title?: string;
  menuLabel: string;
  items: MenuItem[];
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [upward, setUpward] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (open) refs.current[0]?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    const count = items.length;
    const targets: Record<string, number> = {
      ArrowDown: (index + 1) % count,
      ArrowUp: (index - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    if (event.key in targets) {
      event.preventDefault();
      refs.current[targets[event.key]]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  return (
    <div
      className={`menu-button ${className}`.trim()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={ariaLabel}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={(event) => {
          setUpward(roomBelow(event.currentTarget) < items.length * ITEM_HEIGHT + 12);
          setOpen((value) => !value);
        }}
      >
        {label}
      </button>
      {open && (
        <div
          className={upward ? 'menu-options menu-upward' : 'menu-options'}
          role="menu"
          aria-label={menuLabel}
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onKeyDown={(event) => onKeyDown(event, index)}
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.icon && <Icon name={item.icon} />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
