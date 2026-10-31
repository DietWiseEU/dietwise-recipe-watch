import { useIonAlert } from '@ionic/react';
import { useAtomValue } from 'jotai';
import { mainStateAtom } from '@/recipe/atoms';
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
	const { isSuggestionInFlight, changeSuggestionStatus } = useChangeSuggestionStatus();
	const [presentAlert] = useIonAlert();

	const hasRecipes = Boolean(mainState.recipes?.length);
	const hasProblems =
		!mainState.suggestionKeys?.length && Boolean(mainState.errors?.length || mainState.emptySuggestionsFromServer);
	if (!hasRecipes && !hasProblems) {
		return null;
	}

	return (
		<div className="recipes-pane">
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
					isSuggestionInFlight={isSuggestionInFlight}
					onChangeSuggestionStatus={changeSuggestionStatus}
					onInfoClicked={(header, message) => presentAlert({ header, message, buttons: [t('general.OK')] })}
				/>
			))}
			{hasProblems ? (
				<div className="error-pane">
					<h2>{t('recipe.encounteredErrors')}</h2>
					<ul>
						{mainState.errors?.map((err, index) => (
							// eslint-disable-next-line @eslint-react/no-array-index-key -- the error list is static and never reordered
							<li key={index}>{err}</li>
						))}
						{mainState.emptySuggestionsFromServer ? (
							<li>{t('recipe.emptySuggestionsFromServer')}</li>
						) : null}
					</ul>
				</div>
			) : null}
		</div>
	);
};

export default RecipesComponent;
