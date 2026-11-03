import { IonButton, IonModal } from '@ionic/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Ingredient, SuggestionState, SuggestionStatus } from '@/recipe/model';
import { keyOfSuggestion } from '@/recipe/model';
import SuggestionComponent from './SuggestionComponent';
import './CompareSheet.css';

export interface CompareSheetProps {
	/** The ingredient whose alternatives the sheet compares; the sheet is closed while there is none. */
	ingredient: Ingredient | undefined;
	/** The Suggestions for the ingredient that the user has neither accepted nor rejected. */
	undecidedSuggestions: SuggestionState[];
	isSuggestionInFlight: (suggestionKey: string) => boolean;
	/** Called only while the sheet is open, never for a tap on it as it closes. */
	onAction: (suggestionKey: string, action: SuggestionStatus) => void | Promise<void>;
	onInfoClicked: (header: string, message: string) => void;
	onLeaveUndecided: () => void;
	/** Called only while the sheet is open, never for a tap on it as it closes. */
	onSkip: () => void;
}

const CompareSheet: React.FC<CompareSheetProps> = ({
	ingredient,
	undecidedSuggestions,
	isSuggestionInFlight,
	onAction,
	onInfoClicked,
	onLeaveUndecided,
	onSkip,
}) => {
	const { t } = useTranslation();
	const isOpen = ingredient !== undefined;
	/** What the sheet shows; it stays as it was while the sheet slides away. */
	const [shown, setShown] = useState({ ingredient, undecidedSuggestions });
	if (isOpen && (shown.ingredient !== ingredient || shown.undecidedSuggestions !== undecidedSuggestions)) {
		setShown({ ingredient, undecidedSuggestions });
	}
	return (
		<IonModal
			className="compare-sheet"
			isOpen={isOpen}
			initialBreakpoint={1}
			breakpoints={[0, 1]}
			onDidDismiss={onLeaveUndecided}
		>
			<div className="compare-sheet__header">
				<div className="compare-sheet__eyebrow">{t('ingredient.compareTitle')}</div>
				<h3 className="compare-sheet__title">{shown.ingredient?.nameInRecipe}</h3>
				<div className="compare-sheet__hint">{t('ingredient.compareHint')}</div>
			</div>
			<div className="compare-sheet__alternatives">
				{shown.undecidedSuggestions.map(({ suggestion }) => {
					const suggestionKey = keyOfSuggestion(suggestion);
					return (
						<SuggestionComponent
							key={suggestionKey}
							suggestion={suggestion}
							variant="compare"
							disabled={isSuggestionInFlight(suggestionKey)}
							onAction={(action) => (isOpen ? onAction(suggestionKey, action) : undefined)}
							onInfoClicked={onInfoClicked}
						/>
					);
				})}
			</div>
			<div className="compare-sheet__actions">
				<IonButton className="compare-sheet__leave" shape="round" fill="outline" onClick={onLeaveUndecided}>
					{t('ingredient.leaveUndecided')}
				</IonButton>
				<IonButton
					className="compare-sheet__skip"
					shape="round"
					fill="outline"
					title={t('ingredient.skipHint')}
					onClick={() => isOpen && onSkip()}
				>
					{t('ingredient.skip')}
				</IonButton>
			</div>
		</IonModal>
	);
};

export default CompareSheet;
