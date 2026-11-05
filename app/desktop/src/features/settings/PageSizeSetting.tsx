import { useId, useState } from 'react';
import { LARGE_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from '../../services/pageSize';
import { useSettingsStore } from '../../stores/settingsStore';
import '../../styles/history-limit-setting.css';

/** Rows per worksheet page. Typing is kept as a draft and saved when the field is left. */
export function PageSizeSetting() {
  const pageSize = useSettingsStore((state) => state.pageSize);
  const setPageSize = useSettingsStore((state) => state.setPageSize);
  const [draft, setDraft] = useState(String(pageSize));
  const hintId = useId();
  const warningId = useId();
  const large = Number(draft) > LARGE_PAGE_SIZE;

  function save() {
    setPageSize(Number(draft));
    setDraft(String(useSettingsStore.getState().pageSize));
  }

  return (
    <fieldset className="history-limit-setting">
      <legend>Worksheet</legend>
      <p>Choose how many rows each worksheet page shows when a file opens.</p>
      <label htmlFor="page-size">Rows per page</label>
      <input
        id="page-size"
        type="number"
        min={MIN_PAGE_SIZE}
        max={MAX_PAGE_SIZE}
        step={500}
        value={draft}
        aria-describedby={large ? `${hintId} ${warningId}` : hintId}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save();
        }}
      />
      <small id={hintId}>
        Choose {MIN_PAGE_SIZE} to {MAX_PAGE_SIZE} rows.
      </small>
      {large && (
        <p id={warningId} className="setting-warning" role="status">
          More than {LARGE_PAGE_SIZE} rows per page can make the worksheet slow to load and scroll.
        </p>
      )}
    </fieldset>
  );
}
