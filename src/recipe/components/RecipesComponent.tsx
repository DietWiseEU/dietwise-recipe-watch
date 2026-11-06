import { useIonAlert } from '@ionic/react';
import { useAtomValue } from 'jotai';
import { autoAdvanceAtom, mainStateAtom } from '@/recipe/atoms';
import type { MainDataStatus, Recipe, RecipeDetectionType, SuggestionState } from '@/recipe/model';
import { useTranslation } from 'react-i18next';
import { hasSingleRecipe } from './recipesComponentUtils';
import RecipeComponent from './RecipeComponent';
import { useChangeSuggestionStatus } from './useChangeSuggestionStatus';

export interface RecipesComponentProps {
	status: MainDataStatus;
	recipes: Recipe[] | undefined;
	detectionTypes: RecipeDetectionType[] | undefined;
	suggestions: { [key: string]: SuggestionState } | undefined;
	errors: string[] | undefined;
}

const RecipesComponent: React.FC = () => {
	const { t } = useTranslation();
	const mainState = useAtomValue(mainStateAtom);
	const autoAdvance = useAtomValue(autoAdvanceAtom);
	const { isSuggestionInFlight, changeSuggestionStatus } = useChangeSuggestionStatus();
	const [presentAlert] = useIonAlert();

	if (!mainState.recipes?.length && !mainState.emptySuggestionsFromServer) {
		return null;
	}

	return (
		<div className="recipes-pane">
			{mainState.emptySuggestionsFromServer ? (
				<p className="no-suggestions-note">{t('recipe.emptySuggestionsFromServer')}</p>
			) : null}
			{mainState.recipes?.map((r, index) => (
				<RecipeComponent
					key={
						// eslint-disable-next-line @eslint-react/no-array-index-key -- the index only backs up a recipe with no name
						r.name ?? `recipe-${index}`
					}
					index={index}
					recipe={r}
					showTitle={!hasSingleRecipe(mainState)}
					detectionType={mainState.detectionTypes?.[index]}
					suggestionKeys={mainState.suggestionKeys}
					suggestions={mainState.suggestions}
					ingredientState={mainState.ingredientState}
					autoAdvance={autoAdvance}
					isSuggestionInFlight={isSuggestionInFlight}
					onChangeSuggestionStatus={changeSuggestionStatus}
					onInfoClicked={(header, message) => presentAlert({ header, message, buttons: [t('general.OK')] })}
				/>
			))}
		</div>
	);
};

export default RecipesComponent;
