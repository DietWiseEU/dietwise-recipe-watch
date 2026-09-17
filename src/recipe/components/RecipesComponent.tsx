import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { apiServerHostAtom } from '@/config/atoms';
import { mainStateAtom } from '@/recipe/atoms';
import { createSuggestionStatusAction } from '@/recipe/actions';
import type { MainDataStatus, Recipe, RecipeDetectionType, SuggestionState } from '@/recipe/model';
import { useTranslation } from 'react-i18next';
import RecipeComponent from './RecipeComponent';
import { waitForSuggestionStatisticsWithTimeout } from './suggestionsStatisticsUtils';
import { useSuggestionInFlight } from './useSuggestionInFlight';

export interface RecipesComponentProps {
	status: MainDataStatus;
	recipes: Recipe[] | undefined;
	detectionTypes: RecipeDetectionType[] | undefined;
	suggestions: { [key: string]: SuggestionState } | undefined;
	errors: string[] | undefined;
}

const RecipesComponent: React.FC = () => {
	const { t } = useTranslation();
	const [mainState, dispatch] = useAtom(mainStateAtom);
	const apiServerHost = useAtomValue(apiServerHostAtom);
	const { isSuggestionInFlight, setSuggestionInFlight } = useSuggestionInFlight();

	const onMarkUndecided = useCallback(
		async (suggestionKey: string, suggestionId: string) => {
			if (isSuggestionInFlight(suggestionKey)) {
				return;
			}

			dispatch(createSuggestionStatusAction(suggestionKey, 'UNDECIDED'));
			setSuggestionInFlight(suggestionKey, true);
			try {
				await waitForSuggestionStatisticsWithTimeout(apiServerHost, suggestionId, 'ACCEPTED', 'UNDECIDED');
			} catch (error) {
				console.error('Unable to notify suggestion statistics', error);
			} finally {
				setSuggestionInFlight(suggestionKey, false);
			}
		},
		[apiServerHost, dispatch, isSuggestionInFlight, setSuggestionInFlight],
	);

	if (mainState.recipes?.length) {
		return (
			<div className="recipes-pane">
				{mainState.recipes.map((r, index) => (
					<RecipeComponent
						key={
							// eslint-disable-next-line @eslint-react/no-array-index-key -- the index only backs up a recipe with no name
							r.name ?? `recipe-${index}`
						}
						index={index}
						recipe={r}
						rating={mainState.recipes?.length === 1 ? mainState.rating : undefined}
						detectionType={mainState.detectionTypes?.[index]}
						suggestions={mainState.suggestions}
						ingredientState={mainState.ingredientState}
						isSuggestionInFlight={isSuggestionInFlight}
						onMarkUndecided={onMarkUndecided}
					/>
				))}
			</div>
		);
	} else if (mainState.errors?.length && !mainState.suggestions) {
		return (
			<div className="recipes-pane error-pane">
				<h2>{t('recipe.encounteredErrors')}</h2>
				<ul>
					{mainState.errors.map((err, index) => (
						// eslint-disable-next-line @eslint-react/no-array-index-key -- the error list is static and never reordered
						<li key={index}>{err}</li>
					))}
				</ul>
			</div>
		);
	} else {
		return null;
	}
};

export default RecipesComponent;
