import { IonButton, IonIcon } from '@ionic/react';
import { alertCircle } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import './InterruptedNotice.css';

interface InterruptedNoticeProps {
	onRetry: () => void;
}

const InterruptedNotice: React.FC<InterruptedNoticeProps> = ({ onRetry }) => {
	const { t } = useTranslation();
	return (
		<div className="interrupted-notice ion-margin-horizontal" role="alert">
			<IonIcon icon={alertCircle} color="danger" size="large" />
			<span className="interrupted-notice__message">{t('recipe.assessmentInterrupted')}</span>
			<IonButton size="small" onClick={onRetry}>
				{t('recipe.retry')}
			</IonButton>
		</div>
	);
};

export default InterruptedNotice;
