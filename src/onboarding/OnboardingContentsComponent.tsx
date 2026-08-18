import { IonButton, IonIcon } from '@ionic/react';
import { chevronForward } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { authService } from '@/auth/authService';
import brandIcon from '@/assets/images/DietWise_icon_LightGreen.svg';
import { onboardingScreens } from './model';
import './OnboardingContentsComponent.css';

/** Names the dialog around the contents after the title of the screen on show. */
export const ONBOARDING_TITLE_ID = 'onboarding-title';

export interface OnboardingContentsProps {
	hasAccount: boolean;
	screenIndex: number;
	setScreenIndex: (screenIndex: number) => void;
	onDone: () => void;
}

const OnboardingContentsComponent: React.FC<OnboardingContentsProps> = ({
	hasAccount,
	screenIndex,
	setScreenIndex,
	onDone,
}) => {
	const { t } = useTranslation();
	const screens = onboardingScreens(hasAccount);
	const index = Math.min(Math.max(screenIndex, 0), screens.length - 1);
	const screen = screens[index];
	const isLast = index === screens.length - 1;
	const goToNext = () => setScreenIndex(index + 1);
	const runAction = () => {
		if (screen.action?.kind === 'register') {
			authService.signIn();
		} else {
			goToNext();
		}
	};

	return (
		<div className="onboarding">
			<div className="onboarding__screen">
				{screen.showsBrand && (
					<div className="onboarding__brand">
						<img className="onboarding__logo" src={brandIcon} alt="" />
						<span className="onboarding__brand-name">MyRecipeWatch</span>
					</div>
				)}
				{screen.step !== undefined && (
					<span className="onboarding__step-number" aria-hidden="true">
						{screen.step}
					</span>
				)}
				<h1 className="onboarding__title" id={ONBOARDING_TITLE_ID}>
					{t(`onboarding.${screen.id}.title`)}
				</h1>
				{screen.texts.map((text) => (
					<p className="onboarding__text" key={text}>
						{t(`onboarding.${screen.id}.${text}`)}
					</p>
				))}
				{screen.image && (
					<div className="onboarding__figure">
						<img className="onboarding__image" src={screen.image} alt="" />
					</div>
				)}
				{screen.action && (
					<IonButton className="onboarding__action" expand="block" onClick={runAction}>
						{t(screen.action.labelKey)}
					</IonButton>
				)}
			</div>

			<nav className="onboarding__nav">
				<IonButton className="onboarding__skip" fill="clear" size="small" onClick={onDone}>
					{t('onboarding.skip')}
				</IonButton>
				<div className="onboarding__dots">
					{screens.map((dotScreen, dotIndex) => (
						<button
							type="button"
							key={dotScreen.id}
							className="onboarding__dot"
							aria-current={dotIndex === index ? 'true' : undefined}
							aria-label={t('onboarding.goToScreen', { number: dotIndex + 1 })}
							onClick={() => setScreenIndex(dotIndex)}
						/>
					))}
				</div>
				<IonButton
					className="onboarding__forward"
					fill="clear"
					size="small"
					onClick={isLast ? onDone : goToNext}
				>
					{isLast ? t('onboarding.getStarted') : t('onboarding.next')}
					{!isLast && <IonIcon slot="end" icon={chevronForward} aria-hidden="true" />}
				</IonButton>
			</nav>
		</div>
	);
};

export default OnboardingContentsComponent;
