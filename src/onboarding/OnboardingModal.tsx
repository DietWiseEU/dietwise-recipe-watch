import { useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/auth/atoms';
import OnboardingContentsComponent, { ONBOARDING_TITLE_ID } from './OnboardingContentsComponent';

export interface OnboardingModalProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, setIsOpen }) => {
	const user = useAtomValue(userAtom);
	const [screenIndex, setScreenIndex] = useState(0);

	return (
		<IonModal
			aria-labelledby={ONBOARDING_TITLE_ID}
			isOpen={isOpen}
			onDidDismiss={() => {
				setIsOpen(false);
				setScreenIndex(0);
			}}
		>
			<IonContent>
				<OnboardingContentsComponent
					hasAccount={!!user}
					screenIndex={screenIndex}
					setScreenIndex={setScreenIndex}
					onDone={() => setIsOpen(false)}
				/>
			</IonContent>
		</IonModal>
	);
};

export default OnboardingModal;
