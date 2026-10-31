import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { apiServerHostAtom } from '@/config/atoms';
import { mainStateAtom } from '@/recipe/atoms';
import { createSuggestionStatusAction } from '@/recipe/actions';
import type { SuggestionStatus } from '@/recipe/model';
import { waitForSuggestionStatisticsWithTimeout } from './suggestionsStatisticsUtils';
import { useSuggestionInFlight } from './useSuggestionInFlight';

/**
 * Changes the status of a Suggestion and tells the server, for its statistics. Accepting a Suggestion takes back the
 * one accepted before it for the same ingredient; both stay locked until the server has heard of the change.
 */
export function useChangeSuggestionStatus() {
	const [mainState, dispatch] = useAtom(mainStateAtom);
	const apiServerHost = useAtomValue(apiServerHostAtom);
	const { isSuggestionInFlight, setSuggestionInFlight } = useSuggestionInFlight();

	const changeSuggestionStatus = useCallback(
		async (suggestionKey: string, nextStatus: SuggestionStatus) => {
			const suggestionState = mainState.suggestions?.[suggestionKey];
			if (!suggestionState || isSuggestionInFlight(suggestionKey)) {
				return;
			}

			const status = suggestionState.status;
			const previousAcceptedSuggestionKey =
				nextStatus === 'ACCEPTED' && suggestionState.suggestion.target.type === 'INGREDIENT'
					? mainState.ingredientState?.[suggestionState.suggestion.target.ingredient]
					: undefined;
			const previousAcceptedSuggestion =
				previousAcceptedSuggestionKey && previousAcceptedSuggestionKey !== suggestionKey
					? mainState.suggestions?.[previousAcceptedSuggestionKey]
					: undefined;
			const lockedSuggestionKeys = previousAcceptedSuggestionKey
				? [suggestionKey, previousAcceptedSuggestionKey]
				: [suggestionKey];
			dispatch(createSuggestionStatusAction(suggestionKey, nextStatus));
			for (const lockedSuggestionKey of lockedSuggestionKeys) {
				setSuggestionInFlight(lockedSuggestionKey, true);
			}
			try {
				if (previousAcceptedSuggestion) {
					await waitForSuggestionStatisticsWithTimeout(
						apiServerHost,
						{
							suggestionId: previousAcceptedSuggestion.suggestion.id,
							assessmentId: mainState.assessmentId,
						},
						'ACCEPTED',
						'UNDECIDED',
					);
				}
				await waitForSuggestionStatisticsWithTimeout(
					apiServerHost,
					{
						suggestionId: suggestionState.suggestion.id,
						assessmentId: mainState.assessmentId,
					},
					status,
					nextStatus,
				);
			} catch (error) {
				console.error('Unable to notify suggestion statistics', error);
			} finally {
				for (const lockedSuggestionKey of lockedSuggestionKeys) {
					setSuggestionInFlight(lockedSuggestionKey, false);
				}
			}
		},
		[
			apiServerHost,
			dispatch,
			isSuggestionInFlight,
			mainState.assessmentId,
			mainState.ingredientState,
			mainState.suggestions,
			setSuggestionInFlight,
		],
	);

	return { isSuggestionInFlight, changeSuggestionStatus };
}
