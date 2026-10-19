import {
  MAX_HISTORY_ACTIONS,
  MIN_HISTORY_ACTIONS,
  useSettingsStore,
} from '../../stores/settingsStore';
import '../../styles/history-limit-setting.css';
import { setHistoryLimit as sendHistoryLimit } from '../../services/settingsClient';
import { isTauriRuntime } from '../../services/tauriRuntime';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function HistoryLimitSetting() {
  const historyLimit = useSettingsStore((state) => state.historyLimit);
  const setHistoryLimit = useSettingsStore((state) => state.setHistoryLimit);
  const setError = useWorkspaceStore((state) => state.setError);

  return (
    <fieldset className="history-limit-setting">
      <legend>Undo history</legend>
      <p>Choose how many actions Forma keeps available to undo and redo.</p>
      <label htmlFor="history-limit">Actions to keep</label>
      <input
        id="history-limit"
        type="number"
        min={MIN_HISTORY_ACTIONS}
        max={MAX_HISTORY_ACTIONS}
        step={1}
        value={historyLimit}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value)) {
            setHistoryLimit(value);
            if (isTauriRuntime()) {
              void sendHistoryLimit(useSettingsStore.getState().historyLimit).catch((cause) => {
                setError(cause instanceof Error ? cause.message : 'Could not update undo history.');
              });
            }
          }
        }}
      />
      <small>
        Choose {MIN_HISTORY_ACTIONS} to {MAX_HISTORY_ACTIONS} actions.
      </small>
    </fieldset>
  );
}
