import { useSettingsStore } from '../../stores/settingsStore';
import '../../styles/save-behavior-setting.css';

export function SaveBehaviorSetting() {
  const behavior = useSettingsStore((state) => state.saveBehavior);
  const setBehavior = useSettingsStore((state) => state.setSaveBehavior);

  return (
    <fieldset className="save-behavior-setting">
      <legend>Save behavior</legend>
      <p>Choose where Save writes your changes.</p>
      <label>
        <input
          type="radio"
          name="save-behavior"
          value="replace"
          checked={behavior === 'replace'}
          onChange={() => setBehavior('replace')}
        />
        <span>
          <strong>Replace original</strong>
          <small>Update the file you opened.</small>
        </span>
      </label>
      <label>
        <input
          type="radio"
          name="save-behavior"
          value="copy"
          checked={behavior === 'copy'}
          onChange={() => setBehavior('copy')}
        />
        <span>
          <strong>Save a copy</strong>
          <small>Save beside the original as name-copy-YYYY-MM-DD.</small>
        </span>
      </label>
    </fieldset>
  );
}
