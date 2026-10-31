import { IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { arrowUndo } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import type { MainDataStatus } from '@/recipe/model';
import './UrlContainer.css';

export interface UrlContainerProps {
	onClick: () => void;
	onReset: () => void;
	url: string | undefined;
	status: MainDataStatus;
}

const UrlContainer: React.FC<UrlContainerProps> = (props) => {
	const { t } = useTranslation();
	const showReset = props.status === 'SUCCESS' || props.status === 'FAILURE';

	return (
		<p className="url-container ion-display-flex ion-align-items-center" onClick={props.onClick}>
			{typeof props.url === 'string' ? (
				<>
					{props.status === 'PENDING' ? <IonSpinner className="min-width-64px" /> : null}
					<span className="url-container__url ion-text-nowrap overflow-hidden text-overflow-ellipsis">
						{props.url}
					</span>
					{showReset ? (
						<IonButton
							className="url-container__reset"
							fill="clear"
							aria-label={t('recipe.startOver')}
							onClick={(e) => {
								e.stopPropagation();
								props.onReset();
							}}
						>
							<IonIcon slot="icon-only" icon={arrowUndo} />
						</IonButton>
					) : null}
				</>
			) : (
				<span className="enter-url-label">{t('recipe.enterUrl')}</span>
			)}
		</p>
	);
};

export default UrlContainer;
