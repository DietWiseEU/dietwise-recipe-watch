import { useCallback } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { alertCircleOutline, informationCircleOutline } from 'ionicons/icons';
import type { Suggestion, SuggestionStatus } from '@/recipe/model';
import { isOutsideSeasonalityRange, makeCostString, recommendationForDisplay } from './suggestionsComponentUtils';
import './SuggestionComponent.css';

export interface SuggestionComponentProps {
	suggestion: Suggestion;
	disabled?: boolean;
	onAction: (arg: SuggestionStatus) => void | Promise<void>;
	onInfoClicked: (header: string, message: string) => void;
}

const SuggestionComponent: React.FC<SuggestionComponentProps> = ({ suggestion, disabled, onAction, onInfoClicked }) => {
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

	return (
		<div className="suggestion-card">
			<h4 className="suggestion-card__alternative">{suggestion.alternative}</h4>
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
				<IonButton
					className="suggestion-card__reject"
					shape="round"
					fill="outline"
					disabled={disabled}
					onClick={rejectCallback}
				>
					{t('ingredient.reject')}
				</IonButton>
			</div>
		</div>
	);
};

export default SuggestionComponent;
