import { draftKey, useCleaningStore } from '../../../stores/cleaningStore';
import { useDatasetStore } from '../../../stores/datasetStore';
import { useProfileToolStore } from '../../../stores/profileToolStore';
import type { Suggestion, Suggestions } from '../../../types/profileTools';
import { formatCount } from '../profileFormat';
import { addCleanSteps, hasCleanSteps } from './cleanSteps';
import { ToolView } from './ToolView';
import { useLatestProfile, useTool } from './useTool';

/** New column names come from the step that creates them. */
const newColumns = (suggestion: Suggestion): string[] => {
  const parameters = suggestion.steps[0]?.parameters ?? {};
  if (Array.isArray(parameters.into)) return parameters.into as string[];
  return Object.values((parameters.names as Record<string, string>) ?? {});
};

function Examples({ suggestion }: { suggestion: Suggestion }) {
  const columns = newColumns(suggestion);
  const source = String(suggestion.steps[0]?.parameters.column ?? 'Value');
  return (
    <div className="tool-table-wrap suggestion-examples">
      <table className="tool-table" aria-label={`Examples for ${suggestion.title}`}>
        <thead>
          <tr>
            <th scope="col">{source}</th>
            {columns.map((name) => (
              <th key={name} scope="col">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {suggestion.examples!.map((example, index) => (
            <tr key={index}>
              <td>{example.before}</td>
              {example.after.map((value, cell) => (
                <td key={cell}>{value ?? <span className="tool-muted">Missing</span>}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One suggestion: title, figures, examples, "Add step", and optionally "Dismiss". */
export function SuggestionCard({
  suggestion,
  onDismiss,
}: {
  suggestion: Suggestion;
  onDismiss?: () => void;
}) {
  const drafts = useCleaningStore((state) => state.drafts[draftKey(useDatasetStore.getState())]);
  const added = hasCleanSteps(drafts ?? [], suggestion.steps);
  return (
    <article className="suggestion-card" aria-labelledby={`suggestion-${suggestion.id}`}>
      <h3 id={`suggestion-${suggestion.id}`}>{suggestion.title}</h3>
      <p>{suggestion.detail}</p>
      <p className="tool-muted">{formatCount(suggestion.cells_affected)} cells affected</p>
      {suggestion.examples?.length ? <Examples suggestion={suggestion} /> : null}
      <div className="suggestion-actions">
        <button
          type="button"
          disabled={added}
          onClick={() => addCleanSteps(suggestion.steps, suggestion.title)}
        >
          {added ? 'Added' : 'Add step'}
        </button>
        {onDismiss && (
          <button type="button" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </article>
  );
}

const NONE: string[] = [];

type Props = {
  title: 'Recommendations' | 'Creations';
  listLabel: string;
  empty: string;
  pick: (result: Suggestions) => Suggestion[];
  dismissible: boolean;
};

/** Recommendations and Creations: one `profile.suggestions` call, cards in returned order. */
export function SuggestionsView({ title, listLabel, empty, pick, dismissible }: Props) {
  const profile = useLatestProfile();
  const { result, view } = useTool<Suggestions>(
    'suggestions',
    'profile.suggestions',
    profile ? {} : null,
  );
  const dismissed = useProfileToolStore((state) =>
    result ? (state.dismissed[result.data_version] ?? NONE) : NONE,
  );
  const shown = result ? pick(result).filter((item) => !dismissed.includes(item.id)) : [];
  return (
    <ToolView title={title} {...view}>
      {result &&
        (shown.length ? (
          <ul className="suggestion-list" aria-label={listLabel}>
            {shown.map((item) => (
              <li key={item.id}>
                <SuggestionCard
                  suggestion={item}
                  onDismiss={
                    dismissible
                      ? () => useProfileToolStore.getState().dismiss(result.data_version, item.id)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="profile-panel-note">{empty}</p>
        ))}
    </ToolView>
  );
}
