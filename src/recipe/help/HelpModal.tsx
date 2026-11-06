import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import HelpContentsComponent from './HelpContentsComponent';
import { useTranslation } from 'react-i18next';

export interface HelpModalProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

const HelpModal: React.FC<HelpModalProps> = (props) => {
	const { t } = useTranslation();

	return (
		<IonModal isOpen={props.isOpen} onDidDismiss={() => props.setIsOpen(false)}>
			<IonHeader>
				<IonToolbar>
					<IonTitle>{t('recipe.helpTitle')}</IonTitle>
					<IonButtons slot="end">
						<IonButton onClick={() => props.setIsOpen(false)}>{t('general.OK')}</IonButton>
					</IonButtons>
				</IonToolbar>
			</IonHeader>
			<IonContent className="ion-padding-vertical">
				<HelpContentsComponent />
			</IonContent>
		</IonModal>
	);
};

export default HelpModal;
