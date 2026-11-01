import { IonButton, IonChip, IonIcon } from '@ionic/react';
import { addIcons } from 'ionicons';
import { checkmark, playForwardOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
	IngredientStateType,
	Recipe,
	RecipeDetectionType,
	SuggestionState,
	SuggestionStatus,
} from '@/recipe/model';
import IngredientComponent from './IngredientComponent';
import SuggestionComponent from './SuggestionComponent';
import brainIcon from '@/assets/images/brain.svg';
import jsonLdIcon from '@/assets/images/json-ld.svg';
import './RecipeComponent.css';

addIcons({
	brain: brainIcon,
	jsonld: jsonLdIcon,
});

export interface RecipeComponentProps {
	index: number;
	recipe: Recipe;
	showTitle: boolean;
	detectionType: RecipeDetectionType | undefined;
	/** The Suggestions for every recipe, in the order the server sent them. */
	suggestionKeys: string[] | undefined;
	suggestions: { [key: string]: SuggestionState } | undefined;
	ingredientState: IngredientStateType | undefined;
	/** Whether accepting an alternative, or rejecting the last one, opens the next ingredient with alternatives. */
	autoAdvance: boolean;
	isSuggestionInFlight: (suggestionKey: string) => boolean;
	onChangeSuggestionStatus: (suggestionKey: string, nextStatus: SuggestionStatus) => void | Promise<void>;
	onInfoClicked: (header: string, message: string) => void;
}

const RecipeComponent: React.FC<RecipeComponentProps> = (props: RecipeComponentProps) => {
	const { t } = useTranslation();
	/** The ingredient the user opened, or null once they closed it; undefined until they open or close one. */
	const [chosenOpenIngredientId, setChosenOpenIngredientId] = useState<string | null>();
	/** The ingredients the user skipped and has not opened again since. */
	const [skippedIngredientIds, setSkippedIngredientIds] = useState<ReadonlySet<string>>(() => new Set());

	const suggestionKeysOf = (ingredientId: string) =>
		props.suggestionKeys?.filter((suggestionKey) => {
			const target = props.suggestions?.[suggestionKey]?.suggestion.target;
			return target?.type === 'INGREDIENT' && target.ingredient === ingredientId;
		}) ?? [];
	const suggestionKeysWithStatus = (suggestionKeys: string[], status: SuggestionStatus) =>
		suggestionKeys.filter(
			(suggestionKey) => (props.suggestions?.[suggestionKey]?.status ?? 'UNDECIDED') === status,
		);

	/** Whether the ingredient has no accepted Suggestion and some the user has neither accepted nor rejected. */
	const hasUndecidedSuggestions = (ingredientId: string) =>
		!props.ingredientState?.[ingredientId] &&
		suggestionKeysWithStatus(suggestionKeysOf(ingredientId), 'UNDECIDED').length > 0;
	/** The first ingredient after the given one, going on from the start, that is not skipped and has undecided Suggestions. */
	const nextIngredientIdAfter = (ingredientId: string, skipped: ReadonlySet<string>) => {
		const ingredients = props.recipe.recipeIngredients ?? [];
		const index = ingredients.findIndex((ingredient) => ingredient.id === ingredientId);
		return (
			[...ingredients.slice(index + 1), ...ingredients.slice(0, index)].find(
				(ingredient) => !skipped.has(ingredient.id) && hasUndecidedSuggestions(ingredient.id),
			)?.id ?? null
		);
	};
	/** Whether the user skipped the ingredient and it still has undecided Suggestions. */
	const remainsSkipped = (ingredientId: string) =>
		skippedIngredientIds.has(ingredientId) && hasUndecidedSuggestions(ingredientId);
	const skip = (ingredientId: string) => {
		const skipped = new Set(skippedIngredientIds).add(ingredientId);
		setSkippedIngredientIds(skipped);
		setChosenOpenIngredientId(nextIngredientIdAfter(ingredientId, skipped));
	};
	const toggle = (ingredientId: string, open: boolean) => {
		const skipped = new Set(skippedIngredientIds);
		skipped.delete(ingredientId);
		setSkippedIngredientIds(skipped);
		setChosenOpenIngredientId(open ? null : ingredientId);
	};

	const decide = (
		ingredientId: string,
		suggestionKey: string,
		nextStatus: SuggestionStatus,
		undecidedSuggestionCount: number,
	) => {
		const decidesIngredient =
			nextStatus === 'ACCEPTED' || (nextStatus === 'REJECTED' && undecidedSuggestionCount === 1);
		if (props.autoAdvance && decidesIngredient) {
			setChosenOpenIngredientId(nextIngredientIdAfter(ingredientId, skippedIngredientIds));
		}
		return props.onChangeSuggestionStatus(suggestionKey, nextStatus);
	};

	const ingredients = props.recipe.recipeIngredients ?? [];
	const allReviewed =
		ingredients.some((ingredient) => suggestionKeysOf(ingredient.id).length > 0) &&
		ingredients.every((ingredient) => !hasUndecidedSuggestions(ingredient.id) || remainsSkipped(ingredient.id));
	const acceptedCount = ingredients.filter((ingredient) => props.ingredientState?.[ingredient.id]).length;
	const skippedCount = ingredients.filter((ingredient) => remainsSkipped(ingredient.id)).length;

	const openIngredientId =
		chosenOpenIngredientId === undefined
			? props.recipe.recipeIngredients?.find((ingredient) => suggestionKeysOf(ingredient.id).length > 0)?.id
			: chosenOpenIngredientId;

	return (
		<section>
			{props.showTitle ? (
				<h2 className="sticky-recipe-title">
					<div className="ion-display-flex ion-align-items-center ion-justify-content-between">
						{props.recipe.name
							? props.recipe.name
							: t('recipe.anonymousRecipeTemplateTitle', { index: props.index + 1 })}
						{props.detectionType ? (
							<IonIcon
								icon={props.detectionType === 'JSONLD' ? 'jsonld' : 'brain'}
								aria-hidden="true"
								color="medium"
								size="large"
							/>
						) : null}
					</div>
				</h2>
			) : null}
			{props.recipe.recipeIngredients?.length > 0 ? (
				<>
					<div className="recipe-disclaimer">{t('recipe.disclaimer')}</div>
					<ul className="ingredient-rows">
						{props.recipe.recipeIngredients.map((ingredient) => {
							const acceptedSuggestionId = props.ingredientState?.[ingredient.id];
							const acceptedSuggestion = acceptedSuggestionId
								? props.suggestions?.[acceptedSuggestionId]
								: undefined;
							const suggestionKeys = suggestionKeysOf(ingredient.id);
							const undecidedSuggestionKeys = suggestionKeysWithStatus(suggestionKeys, 'UNDECIDED');
							const rejectedSuggestionKeys = suggestionKeysWithStatus(suggestionKeys, 'REJECTED');
							const open = openIngredientId === ingredient.id && hasUndecidedSuggestions(ingredient.id);
							return (
								<li
									key={ingredient.id}
									className={open ? 'ingredient-row ingredient-row--open' : 'ingredient-row'}
								>
									<IngredientComponent
										ingredient={ingredient}
										acceptedSuggestion={acceptedSuggestion}
										acceptedSuggestionDisabled={Boolean(
											acceptedSuggestionId && props.isSuggestionInFlight(acceptedSuggestionId),
										)}
										onMarkUndecided={(suggestionKey) =>
											props.onChangeSuggestionStatus(suggestionKey, 'UNDECIDED')
										}
										suggestionCount={suggestionKeys.length}
										undecidedSuggestionCount={undecidedSuggestionKeys.length}
										open={open}
										skipped={!open && remainsSkipped(ingredient.id)}
										onToggle={() => toggle(ingredient.id, open)}
									/>
									{open ? (
										<div className="ingredient-row__alternatives">
											{undecidedSuggestionKeys.map((suggestionKey) => {
												const suggestionState = props.suggestions![suggestionKey];
												return (
													<SuggestionComponent
														key={suggestionKey}
														suggestion={suggestionState.suggestion}
														disabled={props.isSuggestionInFlight(suggestionKey)}
														onAction={(action) =>
															decide(
																ingredient.id,
																suggestionKey,
																suggestionState.status === action
																	? 'UNDECIDED'
																	: action,
																undecidedSuggestionKeys.length,
															)
														}
														onInfoClicked={props.onInfoClicked}
													/>
												);
											})}
											<div className="ingredient-row__skip">
												<IonButton
													shape="round"
													fill="outline"
													title={t('ingredient.skipHint')}
													onClick={() => skip(ingredient.id)}
												>
													{t('ingredient.skip')}
													<IonIcon slot="end" icon={playForwardOutline}></IonIcon>
												</IonButton>
											</div>
										</div>
									) : null}
									{!acceptedSuggestion && rejectedSuggestionKeys.length > 0 ? (
										<div className="rejected-suggestions">
											{rejectedSuggestionKeys.map((suggestionKey) => {
												const alternative =
													props.suggestions![suggestionKey].suggestion.alternative;
												return (
													<IonChip
														key={suggestionKey}
														outline
														className="rejected-suggestions__chip"
														aria-label={t('ingredient.reconsider', { alternative })}
														disabled={props.isSuggestionInFlight(suggestionKey)}
														onClick={() =>
															props.onChangeSuggestionStatus(suggestionKey, 'UNDECIDED')
														}
													>
														{alternative}
													</IonChip>
												);
											})}
										</div>
									) : null}
								</li>
							);
						})}
					</ul>
					{allReviewed ? (
						<div className="all-reviewed" role="status">
							<IonIcon className="all-reviewed__check" icon={checkmark} aria-hidden="true"></IonIcon>
							<div>
								{[
									t('ingredient.allReviewed'),
									t('ingredient.acceptedCount', { count: acceptedCount }),
									...(skippedCount > 0
										? [t('ingredient.skippedCount', { count: skippedCount })]
										: []),
								].join(' · ')}
							</div>
						</div>
					) : null}
				</>
			) : props.recipe.text ? (
				<pre className="recipe-text text-pre-wrap">{props.recipe.text}</pre>
			) : null}
		</section>
	);
	// TODO We could have an accordeon or something similar to display the entire, pristine recipe
	// TODO Maybe this would give the user the opportunity to edit it
	// TODO After editing, allow reset or re-assess
};

export default RecipeComponent;
