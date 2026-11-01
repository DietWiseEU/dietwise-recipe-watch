import { IonButton, IonChip, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { addIcons } from 'ionicons';
import { playForwardOutline } from 'ionicons/icons';
import { Fragment, useEffect, useRef, useState } from 'react';
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
	isSuggestionInFlight: (suggestionKey: string) => boolean;
	onChangeSuggestionStatus: (suggestionKey: string, nextStatus: SuggestionStatus) => void | Promise<void>;
	onInfoClicked: (header: string, message: string) => void;
}

const RecipeComponent: React.FC<RecipeComponentProps> = (props: RecipeComponentProps) => {
	const { t } = useTranslation();
	const sectionRef = useRef<HTMLElement>(null);
	const titleRef = useRef<HTMLHeadingElement>(null);
	/** The ingredient the user opened, or null once they closed it; undefined until they open or close one. */
	const [chosenOpenIngredientId, setChosenOpenIngredientId] = useState<string | null>();
	/** The ingredients the user skipped and has not opened again since. */
	const [skippedIngredientIds, setSkippedIngredientIds] = useState<ReadonlySet<string>>(() => new Set());

	useEffect(() => {
		const section = sectionRef.current;
		const title = titleRef.current;
		if (!section || !title) {
			return;
		}

		const updateTitleHeight = () => {
			section.style.setProperty('--recipe-title-height', `${title.getBoundingClientRect().height}px`);
		};

		updateTitleHeight();

		const resizeObserver = new ResizeObserver(updateTitleHeight);
		resizeObserver.observe(title);
		window.addEventListener('resize', updateTitleHeight);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateTitleHeight);
			section.style.removeProperty('--recipe-title-height');
		};
	}, [props.showTitle]);

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

	const openIngredientId =
		chosenOpenIngredientId === undefined
			? props.recipe.recipeIngredients?.find((ingredient) => suggestionKeysOf(ingredient.id).length > 0)?.id
			: chosenOpenIngredientId;

	return (
		<section ref={sectionRef}>
			{props.showTitle ? (
				<h2 ref={titleRef} className="sticky-recipe-title">
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
					<h3 className="sticky-ingredients-title">{t('recipe.titleOfIngredients')}</h3>
					<IonList>
						<IonItem color="warning">
							<IonLabel>{t('recipe.disclaimer')}</IonLabel>
						</IonItem>
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
								<Fragment key={ingredient.id}>
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
										skipped={
											!open &&
											skippedIngredientIds.has(ingredient.id) &&
											hasUndecidedSuggestions(ingredient.id)
										}
										onToggle={() => toggle(ingredient.id, open)}
									/>
									{open
										? undecidedSuggestionKeys.map((suggestionKey) => {
												const suggestionState = props.suggestions![suggestionKey];
												return (
													<SuggestionComponent
														key={suggestionKey}
														suggestion={suggestionState.suggestion}
														status={suggestionState.status}
														disabled={props.isSuggestionInFlight(suggestionKey)}
														onAction={(action) =>
															props.onChangeSuggestionStatus(
																suggestionKey,
																suggestionState.status === action
																	? 'UNDECIDED'
																	: action,
															)
														}
														onInfoClicked={props.onInfoClicked}
													/>
												);
											})
										: null}
									{open ? (
										<IonItem lines="none">
											<IonButton
												slot="end"
												size="small"
												shape="round"
												fill="outline"
												color="medium"
												title={t('ingredient.skipHint')}
												onClick={() => skip(ingredient.id)}
											>
												{t('ingredient.skip')}
												<IonIcon slot="end" icon={playForwardOutline}></IonIcon>
											</IonButton>
										</IonItem>
									) : null}
									{!acceptedSuggestion && rejectedSuggestionKeys.length > 0 ? (
										<IonItem lines="none">
											<div className="rejected-suggestions">
												{rejectedSuggestionKeys.map((suggestionKey) => {
													const alternative =
														props.suggestions![suggestionKey].suggestion.alternative;
													return (
														<IonChip
															key={suggestionKey}
															outline
															className="text-strikethrough"
															aria-label={t('ingredient.reconsider', { alternative })}
															disabled={props.isSuggestionInFlight(suggestionKey)}
															onClick={() =>
																props.onChangeSuggestionStatus(
																	suggestionKey,
																	'UNDECIDED',
																)
															}
														>
															{alternative}
														</IonChip>
													);
												})}
											</div>
										</IonItem>
									) : null}
								</Fragment>
							);
						})}
					</IonList>
				</>
			) : props.recipe.text ? (
				<pre className="text-pre-wrap">{props.recipe.text}</pre>
			) : null}
		</section>
	);
	// TODO We could have an accordeon or something similar to display the entire, pristine recipe
	// TODO Maybe this would give the user the opportunity to edit it
	// TODO After editing, allow reset or re-assess
};

export default RecipeComponent;
