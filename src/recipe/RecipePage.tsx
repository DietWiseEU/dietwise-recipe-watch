import { useCallback, useRef, useState } from 'react';
import {
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonIcon,
	IonMenuButton,
	IonPage,
	IonTitle,
	IonToolbar,
} from '@ionic/react';
import { helpCircleOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { mainStateAtom, suggestionInFlightAtom } from '@/recipe/atoms';
import { apiServerHostAtom } from '@/config/atoms';
import {
	createPrepareToAssessRecipeAction,
	createRecipeAssessmentCompletedAction,
	createRecipeAssessmentFailedAction,
	createResetMainPageAction,
	createMessageReceivedAction,
} from '@/recipe/actions';
import { assessRecipe } from '@/recipe/assessRecipe';
import type { CancellationFunction } from '@/recipe/assessRecipe';
import { useLogRating } from '@/recipe/useLogRating';
import UrlContainer from '@/recipe/components/UrlContainer';
import UrlModal from '@/recipe/components/UrlModal';
import HelpModal from '@/recipe/help/HelpModal';
import SplitPane from '@/recipe/components/SplitPane';
import RecipesComponent from '@/recipe/components/RecipesComponent';
import SuggestionsComponent from '@/recipe/components/SuggestionsComponent';
import { hasRecipesContent } from './components/recipesComponentUtils';
import { hasSuggestionsContent } from '@/recipe/components/suggestionsComponentUtils';
import HelpContentsComponent from '@/recipe/help/HelpContentsComponent';
import './RecipePage.css';

const RecipePage: React.FC = () => {
	const { t } = useTranslation();
	const [mainState, dispatch] = useAtom(mainStateAtom);
	const setSuggestionInFlight = useSetAtom(suggestionInFlightAtom);
	const apiServerHost = useAtomValue(apiServerHostAtom);
	const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
	const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

	useLogRating(mainState);

	const cancelRef = useRef<CancellationFunction>(null);

	const assessRecipeCallback = useCallback(
		async (url: string, lang: string) => {
			try {
				dispatch(createPrepareToAssessRecipeAction(url, lang));
				cancelRef.current = await assessRecipe(
					apiServerHost,
					url || '',
					lang,
					(message) => {
						dispatch(createMessageReceivedAction(message));
					},
					(error) => {
						cancelRef.current = null;
						dispatch(createRecipeAssessmentFailedAction(error));
					},
					() => {
						cancelRef.current = null;
						dispatch(createRecipeAssessmentCompletedAction());
					},
				);
			} catch (error) {
				dispatch(createRecipeAssessmentFailedAction(error));
			}
		},
		[dispatch, apiServerHost],
	);

	const resetCallback = useCallback(() => {
		dispatch(createResetMainPageAction());
		setSuggestionInFlight({});
	}, [dispatch, setSuggestionInFlight]);

	const hasOutcome = mainState.status === 'SUCCESS' || mainState.status === 'FAILURE';
	const assessing = mainState.status === 'PENDING';

	const topPaneContent = hasRecipesContent(mainState) ? <RecipesComponent /> : null;
	const bottomPaneContent = hasSuggestionsContent(mainState) ? <SuggestionsComponent /> : null;

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonButtons slot="start">
						<IonMenuButton />
					</IonButtons>
					{assessing || hasOutcome ? (
						<IonButtons slot="end">
							<IonButton onClick={() => setIsHelpModalOpen(true)}>
								<IonIcon slot="icon-only" icon={helpCircleOutline}></IonIcon>
							</IonButton>
						</IonButtons>
					) : null}
					<IonTitle>{t('recipe.title')}</IonTitle>
				</IonToolbar>
			</IonHeader>

			<IonContent fullscreen scrollY={false}>
				{/* Reminder, the inner, collapse=condense header is for iOS: https://ionicframework.com/docs/api/header#condensed-header */}
				<IonHeader collapse="condense">
					<IonToolbar>
						<IonTitle size="large">{t('recipe.title')}</IonTitle>
					</IonToolbar>
				</IonHeader>

				<div className="recipe-page__content">
					<UrlContainer
						onClick={() => setIsUrlModalOpen(true)}
						onReset={resetCallback}
						url={mainState.url}
						status={mainState.status}
					/>
					{!assessing && !hasOutcome ? (
						<>
							<HelpContentsComponent />
							<p className="ion-margin-horizontal ion-padding-vertical border-top-1px-lightmedium">
								{t('recipe.welcomeFooter')}
							</p>
						</>
					) : null}
					<SplitPane className="recipe-page__split" top={topPaneContent} bottom={bottomPaneContent} />
				</div>

				<UrlModal
					isOpen={isUrlModalOpen}
					setIsOpen={setIsUrlModalOpen}
					url={mainState.url}
					language={mainState.lang}
					setData={assessRecipeCallback}
				/>

				<HelpModal isOpen={isHelpModalOpen} setIsOpen={setIsHelpModalOpen} />
			</IonContent>
		</IonPage>
	);
};

export default RecipePage;
