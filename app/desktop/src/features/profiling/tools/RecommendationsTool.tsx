import { SuggestionsView } from './SuggestionCard';

/** Recommendations (FR-043): fixes found by fixed rules, ordered by cells affected. */
export function RecommendationsTool() {
  return (
    <SuggestionsView
      title="Recommendations"
      listLabel="Recommendations"
      empty="No recommendations: the data passes every rule"
      pick={(result) => result.recommendations}
      dismissible
    />
  );
}
