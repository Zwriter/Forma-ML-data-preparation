import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Icon } from '../../components/Icon';
import type { StepType } from '../../types/cleaning';
import { stepCatalog } from './stepCatalog';

const stepTypes = Object.keys(stepCatalog) as StepType[];

export function AddStepMenu({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (type: StepType) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (open) items.current[0]?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    const count = stepTypes.length;
    const targets: Record<string, number> = {
      ArrowDown: (index + 1) % count,
      ArrowUp: (index - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    if (event.key in targets) {
      event.preventDefault();
      items.current[targets[event.key]]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  return (
    <div
      className="add-step-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        Add step
      </button>
      {open && (
        <div className="add-step-options" role="menu" aria-label="Step types">
          {stepTypes.map((type, index) => (
            <button
              key={type}
              ref={(element) => {
                items.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onKeyDown={(event) => onKeyDown(event, index)}
              onClick={() => {
                setOpen(false);
                onSelect(type);
              }}
            >
              <Icon name={stepCatalog[type].icon} />
              <span>{stepCatalog[type].title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
