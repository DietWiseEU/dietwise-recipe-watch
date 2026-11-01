// import { useCallback } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { checkmark, chevronDown, chevronUp, removeOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { keyOfSuggestion } from '@/recipe/model';
import type { Ingredient, SuggestionState } from '@/recipe/model';
import './IngredientComponent.css';

export interface IngredientComponentProps {
	ingredient: Ingredient;
	acceptedSuggestion: SuggestionState | undefined;
	acceptedSuggestionDisabled?: boolean;
	onMarkUndecided: (suggestionKey: string) => void | Promise<void>;
	/** How many Suggestions the server sent for this ingredient. */
	suggestionCount: number;
	/** How many of the Suggestions for this ingredient the user has neither accepted nor rejected. */
	undecidedSuggestionCount: number;
	/** Whether the undecided Suggestions show under the ingredient. */
	open: boolean;
	/** Whether the user skipped the ingredient, leaving its Suggestions undecided. */
	skipped: boolean;
	onToggle: () => void;
}

export interface IngredientSuggestionProps {
	acceptedSuggestion: SuggestionState | undefined;
}

const IngredientSuggestion: React.FC<IngredientSuggestionProps> = ({ acceptedSuggestion }) => {
	const { t } = useTranslation();
	const suggestion = acceptedSuggestion?.suggestion;
	return (
		<>
			<div className="accepted-ingredient__alternative">{suggestion?.alternative}</div>
			{suggestion?.equivalence && (
				<div className="accepted-ingredient__detail">
					<span className="text-bold">{t('ingredient.equivalence')}</span> {suggestion?.equivalence}
				</div>
			)}
			{suggestion?.techniqueNotes && (
				<div className="accepted-ingredient__detail">
					<span className="text-bold">{t('ingredient.techniqueNotes')}</span> {suggestion?.techniqueNotes}
				</div>
			)}
		</>
	);
};

const IngredientComponent: React.FC<IngredientComponentProps> = ({
	ingredient,
	acceptedSuggestion,
	acceptedSuggestionDisabled,
	onMarkUndecided,
	suggestionCount,
	undecidedSuggestionCount,
	open,
	skipped,
	onToggle,
}) => {
	const { t } = useTranslation();
	if (acceptedSuggestion) {
		return (
			<div className="accepted-ingredient">
				<IonIcon className="accepted-ingredient__check" icon={checkmark} aria-hidden="true"></IonIcon>
				<div className="accepted-ingredient__text">
					<div className="accepted-ingredient__original text-strikethrough">{ingredient.nameInRecipe}</div>
					<IngredientSuggestion acceptedSuggestion={acceptedSuggestion} />
				</div>
				<IonButton
					className="accepted-ingredient__undo"
					shape="round"
					fill="outline"
					aria-label={t('ingredient.undo')}
					title={t('ingredient.undo')}
					disabled={acceptedSuggestionDisabled}
					onClick={() => onMarkUndecided(keyOfSuggestion(acceptedSuggestion.suggestion))}
				>
					<IonIcon slot="icon-only" icon={removeOutline}></IonIcon>
				</IonButton>
			</div>
		);
	}
	return (
		<div className="ingredient">
			<div className="ingredient__name">{ingredient.nameInRecipe}</div>
			{skipped && <span className="ingredient__note">{t('ingredient.skipped')}</span>}
			{undecidedSuggestionCount > 0 && (
				<IonButton
					className="ingredient__alternatives"
					shape="round"
					fill="outline"
					aria-expanded={open}
					onClick={onToggle}
				>
					{t('ingredient.alternatives', { count: undecidedSuggestionCount })}
					<IonIcon slot="end" icon={open ? chevronUp : chevronDown}></IonIcon>
				</IonButton>
			)}
			{suggestionCount === 0 && <span className="ingredient__note">{t('ingredient.noSuggestions')}</span>}
		</div>
	);
};

export default IngredientComponent;
