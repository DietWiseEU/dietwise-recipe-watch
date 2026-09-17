import { useState } from 'react';
import { IonList, useIonAlert } from '@ionic/react';
import { useAtom, useAtomValue } from 'jotai';
import { apiServerHostAtom } from '@/config/atoms';
import { mainStateAtom } from '@/recipe/atoms';
import { useTranslation } from 'react-i18next';
import { createSuggestionStatusAction } from '@/recipe/actions';
import SuggestionComponent from './SuggestionComponent';
import CookingModeToggle from './CookingModeToggle';
import type { SuggestionStatus } from '@/recipe/model';
import { randomInterventionKey } from './interventions';
import { waitForSuggestionStatisticsWithTimeout } from './suggestionsStatisticsUtils';
import { useSuggestionInFlight } from './useSuggestionInFlight';
import { useKeepScreenAwake } from '@/recipe/useKeepScreenAwake';
import './SuggestionsComponent.css';

const SuggestionsComponent: React.FC = () => {
	const { t } = useTranslation();
	const [mainState, dispatch] = useAtom(mainStateAtom);
	const apiServerHost = useAtomValue(apiServerHostAtom);
	const { isSuggestionInFlight, setSuggestionInFlight } = useSuggestionInFlight();
	const [presentAlert] = useIonAlert();
	// Re-pick a random banner each time a new assessment completes. suggestionKeys is a fresh
	// array per assessment and is left untouched by accept/reject, so the banner stays stable
	// while the user browses suggestions.
	const [bannerForKeys, setBannerForKeys] = useState(mainState.suggestionKeys);
	const [interventionKey, setInterventionKey] = useState(randomInterventionKey);
	const [cookingMode, setCookingMode] = useState(false);
	if (bannerForKeys !== mainState.suggestionKeys) {
		setBannerForKeys(mainState.suggestionKeys);
		setInterventionKey(randomInterventionKey());
		setCookingMode(false);
	}
	useKeepScreenAwake(cookingMode);

	if (mainState.suggestionKeys?.length) {
		return (
			<div className="sugestions-pane">
				<div className="sticky-suggestions-header">
					<div className="suggestions-title-row">
						<h2 className="suggestions-title">{t('recipe.titleOfSuggestions')}</h2>
						<CookingModeToggle active={cookingMode} onToggle={() => setCookingMode((on) => !on)} />
					</div>
					<div className="intervention-banner" role="status">
						{t(interventionKey)}
					</div>
				</div>
				<IonList>
					{mainState.suggestionKeys.map((suggestionKey) => {
						const suggestionState = mainState.suggestions?.[suggestionKey];
						if (!suggestionState) return null;
						const status = suggestionState.status;
						const onAction = async (action: SuggestionStatus) => {
							if (isSuggestionInFlight(suggestionKey)) {
								return;
							}

							const nextStatus = status === action ? 'UNDECIDED' : action;
							const previousAcceptedSuggestionKey =
								nextStatus === 'ACCEPTED' && suggestionState.suggestion.target.type === 'INGREDIENT'
									? mainState.ingredientState?.[suggestionState.suggestion.target.ingredient]
									: undefined;
							const previousAcceptedSuggestion =
								previousAcceptedSuggestionKey && previousAcceptedSuggestionKey !== suggestionKey
									? mainState.suggestions?.[previousAcceptedSuggestionKey]
									: undefined;
							const lockedSuggestionKeys = previousAcceptedSuggestionKey
								? [suggestionKey, previousAcceptedSuggestionKey]
								: [suggestionKey];
							dispatch(createSuggestionStatusAction(suggestionKey, nextStatus));
							for (const lockedSuggestionKey of lockedSuggestionKeys) {
								setSuggestionInFlight(lockedSuggestionKey, true);
							}
							try {
								if (previousAcceptedSuggestion) {
									await waitForSuggestionStatisticsWithTimeout(
										apiServerHost,
										previousAcceptedSuggestion.suggestion.id,
										'ACCEPTED',
										'UNDECIDED',
									);
								}
								await waitForSuggestionStatisticsWithTimeout(
									apiServerHost,
									suggestionState.suggestion.id,
									status,
									nextStatus,
								);
							} catch (error) {
								console.error('Unable to notify suggestion statistics', error);
							} finally {
								for (const lockedSuggestionKey of lockedSuggestionKeys) {
									setSuggestionInFlight(lockedSuggestionKey, false);
								}
							}
						};
						return (
							<SuggestionComponent
								key={suggestionKey}
								suggestion={suggestionState.suggestion}
								status={status}
								disabled={isSuggestionInFlight(suggestionKey)}
								onAction={onAction}
								onInfoClicked={(header, message) =>
									presentAlert({ header, message, buttons: [t('general.OK')] })
								}
							/>
						);
					})}
				</IonList>
			</div>
		);
	} else if ((mainState.emptySuggestionsFromServer || mainState.errors) && mainState.recipes) {
		return (
			<div className="sugestions-pane error-pane">
				<h2>{t('recipe.encounteredErrors')}</h2>
				<ul>
					{mainState.errors
						? mainState.errors.map((err, index) => (
								// eslint-disable-next-line @eslint-react/no-array-index-key -- the error list is static and never reordered
								<li key={index}>{err}</li>
							))
						: null}
					{mainState.emptySuggestionsFromServer ? <li>{t('recipe.emptySuggestionsFromServer')}</li> : null}
				</ul>
			</div>
		);
	} else {
		return null;
	}
};

export default SuggestionsComponent;
