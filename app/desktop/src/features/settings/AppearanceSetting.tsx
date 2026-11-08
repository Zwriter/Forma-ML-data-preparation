import { COLOR_MODES, COLOR_THEMES, type ColorTheme } from '../../services/appearance';
import { useAppearanceStore } from '../../stores/appearanceStore';
import '../../styles/settings-appearance.css';

const themeInfo: Record<ColorTheme, { name: string; description: string }> = {
  graphite: { name: 'Graphite', description: 'Default. Dark title bar, teal accent.' },
  ledger: { name: 'Ledger', description: 'Cool slate, cobalt accent.' },
  paper: { name: 'Paper', description: 'Warm stone, terracotta accent.' },
  orchid: { name: 'Orchid', description: 'Lavender, Forma purple.' },
};

const modeLabels = { system: 'System', light: 'Light', dark: 'Dark' } as const;
const swatchRoles = ['chrome', 'surface', 'accent', 'success', 'warning', 'danger'];

export function AppearanceSetting() {
  const theme = useAppearanceStore((state) => state.theme);
  const mode = useAppearanceStore((state) => state.mode);
  const setTheme = useAppearanceStore((state) => state.setTheme);
  const setMode = useAppearanceStore((state) => state.setMode);

  return (
    <fieldset className="setting-group appearance-setting">
      <legend>Appearance</legend>
      <p>Applies to every tab.</p>
      <div className="appearance-themes" role="radiogroup" aria-label="Colour theme">
        {COLOR_THEMES.map((value) => (
          <label key={value} className="appearance-theme">
            <input
              type="radio"
              name="color-theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
            />
            <span className="appearance-swatches" data-theme-preview={value} aria-hidden="true">
              {swatchRoles.map((role) => (
                <i key={role} className={`appearance-swatch swatch-${role}`} />
              ))}
            </span>
            <span className="appearance-theme-text">
              <strong>{themeInfo[value].name}</strong>
              <small>{themeInfo[value].description}</small>
            </span>
          </label>
        ))}
      </div>
      <div className="segmented" role="radiogroup" aria-label="Mode">
        {COLOR_MODES.map((value) => (
          <label key={value} className="segmented-option">
            <input
              type="radio"
              name="color-mode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            <span>{modeLabels[value]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
