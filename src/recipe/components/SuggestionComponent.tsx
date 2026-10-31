import { useCallback } from 'react';
import { IonButton, IonIcon, IonItem, IonLabel } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { alertCircleOutline, checkmark, close, information } from 'ionicons/icons';
import type { Suggestion, SuggestionStatus } from '@/recipe/model';
import { isOutsideSeasonalityRange, makeCostString, recommendationForDisplay } from './suggestionsComponentUtils';

export interface SuggestionComponentProps {
	suggestion: Suggestion;
	status: SuggestionStatus | undefined;
	disabled?: boolean;
	onAction: (arg: SuggestionStatus) => void | Promise<void>;
	onInfoClicked: (header: string, message: string) => void;
}

const SuggestionComponent: React.FC<SuggestionComponentProps> = ({
	suggestion,
	status,
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
	const acceptButtonFill = status === 'ACCEPTED' ? 'solid' : 'outline';
	const rejectButtonFill = status === 'REJECTED' ? 'solid' : 'outline';

	return (
		<>
			<IonItem lines="none">
				<IonLabel>{suggestion.text}</IonLabel>
			</IonItem>
			<IonItem lines="full">
				<IonButton slot="start" size="small" color="medium" fill="outline" onClick={infoCallback}>
					<IonIcon slot="icon-only" icon={information}></IonIcon>
				</IonButton>
				<IonLabel>
					<p className="ion-display-flex ion-align-items-end ion-align-content-center gap-5px">
						<span>{makeCostString(suggestion.cost)}</span>
						{showSeasonalityWarning && (
							<>
								<IonIcon icon={alertCircleOutline}></IonIcon>
								<span>{t('recipe.seasonalityWarning')}</span>
							</>
						)}
					</p>
				</IonLabel>
				<IonButton
					slot="end"
					size="small"
					color="success"
					fill={acceptButtonFill}
					disabled={disabled}
					onClick={acceptCallback}
				>
					<IonIcon slot="icon-only" icon={checkmark}></IonIcon>
				</IonButton>
				<IonButton
					slot="end"
					size="small"
					color="medium"
					fill={rejectButtonFill}
					disabled={disabled}
					onClick={rejectCallback}
				>
					<IonIcon slot="icon-only" icon={close}></IonIcon>
				</IonButton>
			</IonItem>
		</>
	);
};

export default SuggestionComponent;
