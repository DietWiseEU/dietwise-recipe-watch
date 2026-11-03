import { useCallback } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { alertCircleOutline, close, informationCircleOutline } from 'ionicons/icons';
import type { Suggestion, SuggestionStatus } from '@/recipe/model';
import { isOutsideSeasonalityRange, makeCostString, recommendationForDisplay } from './suggestionsComponentUtils';
import './SuggestionComponent.css';

export interface SuggestionComponentProps {
	suggestion: Suggestion;
	/**
	 * Where the Suggestion shows: in the list of alternatives under its ingredient, or next to the other alternatives
	 * when comparing them, where it also shows the equivalence and the notes.
	 */
	variant?: 'list' | 'compare';
	disabled?: boolean;
	onAction: (arg: SuggestionStatus) => void | Promise<void>;
	onInfoClicked: (header: string, message: string) => void;
}

const SuggestionComponent: React.FC<SuggestionComponentProps> = ({
	suggestion,
	variant = 'list',
	disabled,
	onAction,
	onInfoClicked,
}) => {
	const { t } = useTranslation();
	const acceptCallback = useCallback(() => onAction('ACCEPTED'), [onAction]);
	const rejectCallback = useCallback(() => onAction('REJECTED'), [onAction]);
	const infoCallback = useCallback(() => {
		const header = suggestion.alternative;
		const costMessage = `${makeCostString(suggestion.cost)} = ${t('recipe.cost.' + (suggestion.cost ?? 'MED'))}`;
		const outOfSeasonMessage = isOutsideSeasonalityRange(suggestion)
			? `<br/><br/>${t('recipe.seasonalityWarning')}`
			: '';
		const message = `${recommendationForDisplay(suggestion)}<br/><br/>${costMessage}${outOfSeasonMessage}`;
		onInfoClicked(header, message);
	}, [suggestion, onInfoClicked, t]);

	const showSeasonalityWarning = isOutsideSeasonalityRange(suggestion);
	const comparing = variant === 'compare';

	return (
		<div className={comparing ? 'suggestion-card suggestion-card--compare' : 'suggestion-card'}>
			<h4 className="suggestion-card__alternative">{suggestion.alternative}</h4>
			{comparing && suggestion.equivalence && (
				<div className="suggestion-card__equivalence">{suggestion.equivalence}</div>
			)}
			{comparing && suggestion.techniqueNotes && (
				<div className="suggestion-card__notes">
					<span className="text-bold">{t('ingredient.techniqueNotes')}</span> {suggestion.techniqueNotes}
				</div>
			)}
			<div className="suggestion-card__details">
				<span className="suggestion-card__cost">{makeCostString(suggestion.cost)}</span>
				{showSeasonalityWarning && (
					<span className="suggestion-card__season">
						<IonIcon icon={alertCircleOutline} aria-hidden="true"></IonIcon>
						<span>{t('recipe.seasonalityWarning')}</span>
					</span>
				)}
				<IonButton
					className="suggestion-card__info"
					fill="clear"
					size="small"
					color="medium"
					aria-label={t('ingredient.moreInfo')}
					onClick={infoCallback}
				>
					<IonIcon slot="icon-only" icon={informationCircleOutline}></IonIcon>
				</IonButton>
			</div>
			<div className="suggestion-card__actions">
				<IonButton shape="round" disabled={disabled} onClick={acceptCallback}>
					{t('ingredient.accept')}
				</IonButton>
				{comparing ? (
					<IonButton
						className="suggestion-card__reject suggestion-card__reject--icon"
						shape="round"
						fill="outline"
						aria-label={t('ingredient.reject')}
						title={t('ingredient.reject')}
						disabled={disabled}
						onClick={rejectCallback}
					>
						<IonIcon slot="icon-only" icon={close}></IonIcon>
					</IonButton>
				) : (
					<IonButton
						className="suggestion-card__reject"
						shape="round"
						fill="outline"
						disabled={disabled}
						onClick={rejectCallback}
					>
						{t('ingredient.reject')}
					</IonButton>
				)}
			</div>
		</div>
	);
};

export default SuggestionComponent;
