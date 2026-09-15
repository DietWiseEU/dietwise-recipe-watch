import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { addIcons } from 'ionicons';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { IngredientStateType, Rating, Recipe, RecipeDetectionType, SuggestionState } from '@/recipe/model';
import IngredientComponent from './IngredientComponent';
import RatingComponent from './RatingComponent';
import { MAX_RATING } from '@/recipe/reducers/calculateRating';
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
	rating?: Rating;
	detectionType: RecipeDetectionType | undefined;
	suggestions: { [key: string]: SuggestionState } | undefined;
	ingredientState: IngredientStateType | undefined;
	isSuggestionInFlight: (suggestionKey: string) => boolean;
	onMarkUndecided: (suggestionKey: string, suggestionId: string) => void | Promise<void>;
}

const RecipeComponent: React.FC<RecipeComponentProps> = (props: RecipeComponentProps) => {
	const { t } = useTranslation();
	const sectionRef = useRef<HTMLElement>(null);
	const titleRef = useRef<HTMLHeadingElement>(null);

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
		};
	}, []);

	return (
		<section ref={sectionRef}>
			<h2 ref={titleRef} className="sticky-recipe-title">
				<div className="ion-display-flex ion-align-items-center ion-justify-content-between">
					{props.recipe.name
						? props.recipe.name
						: t('recipe.anonymousRecipeTemplateTitle', { index: props.index + 1 })}
					{props.detectionType ? (
						<IonIcon
							icon={props.detectionType === 'JSONLD' ? 'jsonld' : 'brain'}
							aria-hidden="true"
							color="lightmedium"
							size="large"
						/>
					) : null}
				</div>
				{props.rating ? <RatingComponent rating={props.rating} max={MAX_RATING} /> : null}
			</h2>
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
							return (
								<IngredientComponent
									key={ingredient.id}
									ingredient={ingredient}
									acceptedSuggestion={acceptedSuggestion}
									acceptedSuggestionDisabled={Boolean(
										acceptedSuggestionId && props.isSuggestionInFlight(acceptedSuggestionId),
									)}
									onMarkUndecided={props.onMarkUndecided}
								/>
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
