import assessImage from '@/assets/images/onboarding/assess.png';
import chooseImage from '@/assets/images/onboarding/choose.png';
import impactImage from '@/assets/images/onboarding/impact.png';
import welcomeImage from '@/assets/images/onboarding/welcome.png';

/** What the button below the screen text does; the nav bar at the bottom is always there. */
export type OnboardingActionKind = 'next' | 'register';

export interface OnboardingAction {
	kind: OnboardingActionKind;
	labelKey: string;
}

export interface OnboardingScreen {
	/** Names the translations of the screen, under `onboarding.<id>`. */
	id: string;
	/** Position in the "how it works" sequence, for the screens that are part of it. */
	step?: number;
	image?: string;
	/** Paragraph translations, as keys under `onboarding.<id>`. */
	texts: string[];
	showsBrand?: boolean;
	action?: OnboardingAction;
	/** Screens the users who already have an account have no use for. */
	forVisitorsOnly?: boolean;
}

const SCREENS: OnboardingScreen[] = [
	{
		id: 'welcome',
		image: welcomeImage,
		texts: ['text'],
		showsBrand: true,
		action: { kind: 'next', labelKey: 'onboarding.welcome.start' },
	},
	{ id: 'assess', step: 1, image: assessImage, texts: ['text'] },
	{ id: 'choose', step: 2, image: chooseImage, texts: ['text'] },
	{ id: 'impact', step: 3, image: impactImage, texts: ['text', 'cost'] },
	{
		id: 'registration',
		texts: ['text'],
		action: { kind: 'register', labelKey: 'home.loginRegister' },
		forVisitorsOnly: true,
	},
];

export function onboardingScreens(hasAccount: boolean): OnboardingScreen[] {
	return SCREENS.filter((screen) => !(screen.forVisitorsOnly && hasAccount));
}
