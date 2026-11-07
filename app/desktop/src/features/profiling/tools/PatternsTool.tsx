import type { Patterns } from '../../../types/profileTools';
import { CorrelationGrid, correlationText } from '../charts/CorrelationGrid';
import { formatCount, formatPercent } from '../profileFormat';
import { ToolView } from './ToolView';
import { useLatestProfile, useTool } from './useTool';

/** Patterns (FR-041): correlations between number columns and text value formats. */
export function PatternsTool() {
  const profile = useLatestProfile();
  const { result, view } = useTool<Patterns>('patterns', 'profile.patterns', profile ? {} : null);
  const correlation = result?.correlation;

  return (
    <ToolView title="Patterns" {...view}>
      {result && correlation && (
        <div className="tool-split">
          <section className="tool-panel" aria-labelledby="patterns-correlations">
            <h3 id="patterns-correlations">Correlations</h3>
            {correlation.columns.length < 2 ? (
              <p className="profile-panel-note">Fewer than two number columns</p>
            ) : (
              <CorrelationGrid columns={correlation.columns} matrix={correlation.matrix} />
            )}
            {correlation.left_out > 0 && (
              <p className="tool-muted">
                {formatCount(correlation.left_out)} less complete number columns left out
              </p>
            )}
            <h3>Strongest pairs</h3>
            <ul className="tool-list" aria-label="Strongest pairs">
              {correlation.strongest.map((pair) => (
                <li key={`${pair.a}|${pair.b}`}>
                  {`${pair.a} and ${pair.b}: ${correlationText(pair.r)}`}
                </li>
              ))}
            </ul>
          </section>
          <section className="tool-panel" aria-labelledby="patterns-formats">
            <h3 id="patterns-formats">Value formats</h3>
            <ul className="tool-list" aria-label="Value formats">
              {result.formats.map((item) => (
                <li key={item.column}>
                  <strong>{item.column}</strong>
                  {item.mixed && <span className="tool-flag"> Mixed formats</span>}
                  <ul className="tool-formats">
                    {item.formats.map((format) => (
                      <li key={format.shape}>
                        <code>{format.shape}</code> {formatPercent(format.share)} (
                        {formatCount(format.count)})
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </ToolView>
  );
}
