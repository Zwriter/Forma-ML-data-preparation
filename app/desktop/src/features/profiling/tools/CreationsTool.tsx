import { SuggestionsView } from './SuggestionCard';

/** Creations (FR-044): new columns from date parts and splits, with examples. */
export function CreationsTool() {
  return (
    <SuggestionsView
      title="Creations"
      listLabel="New columns"
      empty="No new columns to suggest"
      pick={(result) => result.creations}
      dismissible={false}
    />
  );
}
