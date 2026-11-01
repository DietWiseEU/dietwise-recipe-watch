// import { useCallback } from 'react';
import { IonButton, IonIcon, IonItem, IonLabel, IonNote } from '@ionic/react';
import { chevronDown, chevronUp, removeOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { keyOfSuggestion } from '@/recipe/model';
import type { Ingredient, SuggestionState } from '@/recipe/model';

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
	onToggle: () => void;
}

export interface IngredientSuggestionProps {
	acceptedSuggestion: SuggestionState | undefined;
}

const IngredientSuggestion: React.FC<IngredientSuggestionProps> = ({ acceptedSuggestion }) => {
	const { t } = useTranslation();
	const suggestion = acceptedSuggestion?.suggestion;
	return (
		<div>
			<span>{suggestion?.alternative}</span>
			{suggestion?.equivalence && (
				<div>
					<span className="text-bold">{t('ingredient.equivalence')}</span> {suggestion?.equivalence}
				</div>
			)}
			{suggestion?.techniqueNotes && (
				<div>
					<span className="text-bold">{t('ingredient.techniqueNotes')}</span> {suggestion?.techniqueNotes}
				</div>
			)}
		</div>
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
	onToggle,
}) => {
	const { t } = useTranslation();
	const originalIngredientClassName = acceptedSuggestion ? 'text-strikethrough color-medium' : '';
	return (
		<IonItem key={ingredient.id}>
			<IonLabel>
				<div className={originalIngredientClassName}>{ingredient.nameInRecipe}</div>
				{acceptedSuggestion && <IngredientSuggestion acceptedSuggestion={acceptedSuggestion} />}
			</IonLabel>
			{acceptedSuggestion && (
				<IonButton
					slot="end"
					size="default"
					shape="round"
					color="dark"
					fill="outline"
					disabled={acceptedSuggestionDisabled}
					onClick={() => onMarkUndecided(keyOfSuggestion(acceptedSuggestion.suggestion))}
				>
					<IonIcon slot="icon-only" icon={removeOutline}></IonIcon>
				</IonButton>
			)}
			{!acceptedSuggestion && undecidedSuggestionCount > 0 && (
				<IonButton slot="end" size="small" shape="round" fill="outline" aria-expanded={open} onClick={onToggle}>
					{t('ingredient.alternatives', { count: undecidedSuggestionCount })}
					<IonIcon slot="end" icon={open ? chevronUp : chevronDown}></IonIcon>
				</IonButton>
			)}
			{suggestionCount === 0 && <IonNote slot="end">{t('ingredient.noSuggestions')}</IonNote>}
		</IonItem>
	);
};

export default IngredientComponent;
