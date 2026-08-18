import { useCallback, useEffect, useState } from 'react';
import {
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonMenuButton,
	IonPage,
	IonTitle,
	IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useAtomValue, useSetAtom } from 'jotai';
import { userAtom } from '@/auth/atoms';
import { authService } from '@/auth/authService';
import TermsModal from '@/home/TermsModal';
import { onboardingSeenAtom } from '@/onboarding/atoms';
import OnboardingModal from '@/onboarding/OnboardingModal';

const HomePage: React.FC = () => {
	const { t } = useTranslation();
	const user = useAtomValue(userAtom);
	const signIn = useCallback(() => authService.signIn(), []);
	const [isTermsOpen, setIsTermsOpen] = useState(false);
	const onboardingSeen = useAtomValue(onboardingSeenAtom);
	const setOnboardingSeen = useSetAtom(onboardingSeenAtom);
	// The onboarding introduces the app once; afterwards it is only shown on demand.
	const [isOnboardingOpen, setIsOnboardingOpen] = useState(!onboardingSeen);

	useEffect(() => {
		if (!onboardingSeen) {
			void setOnboardingSeen(true);
		}
	}, [onboardingSeen, setOnboardingSeen]);

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonButtons slot="start">
						<IonMenuButton />
					</IonButtons>
					<IonTitle>{t('home.title')}</IonTitle>
				</IonToolbar>
			</IonHeader>

			<IonContent fullscreen>
				{/* Reminder, the inner, collapse=condense header is for iOS: https://ionicframework.com/docs/api/header#condensed-header */}
				<IonHeader collapse="condense">
					<IonToolbar>
						<IonTitle size="large">{t('home.title')}</IonTitle>
					</IonToolbar>
				</IonHeader>
				<div className="help ion-padding-horizontal">
					<h1>{t('home.heading')}</h1>
					<p className="moto">{t('home.moto')}</p>
					<p>{t('home.paragraph1')}</p>
					{user ? (
						<p className="ion-text-center">
							<IonButton routerLink="/Recipe">{t('home.assessRecipe')}</IonButton>
						</p>
					) : (
						<>
							<p>{t('home.registration.start')}</p>
							<ul>
								<li>{t('home.registration.step1')}</li>
								<li>{t('home.registration.step2')}</li>
								<li>{t('home.registration.step3')}</li>
							</ul>
							<p className="ion-text-center">
								<IonButton onClick={signIn}>{t('home.loginRegister')}</IonButton>
							</p>
						</>
					)}
					<p className="ion-text-center">
						<IonButton fill="outline" onClick={() => setIsOnboardingOpen(true)}>
							{t('onboarding.showAgain')}
						</IonButton>
					</p>
					<p className="ion-text-center">
						<IonButton fill="clear" size="small" onClick={() => setIsTermsOpen(true)}>
							{t('terms.openButton')}
						</IonButton>
					</p>
				</div>

				<TermsModal isOpen={isTermsOpen} setIsOpen={setIsTermsOpen} />
				<OnboardingModal isOpen={isOnboardingOpen} setIsOpen={setIsOnboardingOpen} />
			</IonContent>
		</IonPage>
	);
};

export default HomePage;
