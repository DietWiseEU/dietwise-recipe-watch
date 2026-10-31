import { IonButton, IonIcon } from '@ionic/react';
import { sunny, sunnyOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import './CookingModeToggle.css';

interface CookingModeToggleProps {
	active: boolean;
	onToggle: () => void;
}

const CookingModeToggle: React.FC<CookingModeToggleProps> = ({ active, onToggle }) => {
	const { t } = useTranslation();
	return (
		<IonButton
			className="cooking-mode-toggle"
			color="primary"
			fill={active ? 'solid' : 'outline'}
			aria-label={t('recipe.keepScreenOn')}
			aria-pressed={active ? 'true' : 'false'}
			onClick={onToggle}
		>
			<IonIcon slot="start" icon={active ? sunny : sunnyOutline} />
			<span className="cooking-mode-toggle__label">{t('recipe.keepScreenOn')}</span>
		</IonButton>
	);
};

export default CookingModeToggle;
