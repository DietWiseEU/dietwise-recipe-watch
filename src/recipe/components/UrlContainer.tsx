import { IonButton, IonIcon } from '@ionic/react';
import { alertCircleOutline, arrowUndo, linkOutline, sparklesOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import type { MainDataStatus } from '@/recipe/model';
import AssessmentProgress from './AssessmentProgress';
import './UrlContainer.css';

export interface UrlContainerProps {
	onClick: () => void;
	onReset: () => void;
	url: string | undefined;
	status: MainDataStatus;
	/** Whether the assessment went wrong. */
	failed: boolean;
}

const UrlContainer: React.FC<UrlContainerProps> = (props) => {
	const { t } = useTranslation();
	const showReset = props.status === 'SUCCESS' || props.status === 'FAILURE';
	const statusIcon = props.failed ? alertCircleOutline : props.status === 'PENDING' ? sparklesOutline : undefined;
	const hasUrl = typeof props.url === 'string';

	return (
		<>
			{hasUrl ? (
				<p className="url-container ion-display-flex ion-align-items-center">
					{statusIcon ? (
						<IonIcon className="url-container__status" icon={statusIcon} aria-hidden="true" />
					) : null}
					<button
						type="button"
						className="url-container__url ion-text-nowrap overflow-hidden text-overflow-ellipsis"
						onClick={props.onClick}
					>
						{props.url}
					</button>
					{showReset ? (
						<IonButton
							className="url-container__reset"
							fill="clear"
							aria-label={t('recipe.startOver')}
							onClick={props.onReset}
						>
							<IonIcon slot="icon-only" icon={arrowUndo} />
						</IonButton>
					) : null}
				</p>
			) : (
				<button
					type="button"
					className="url-container url-container--empty ion-display-flex ion-align-items-center"
					onClick={props.onClick}
				>
					<IonIcon className="url-container__status" icon={linkOutline} aria-hidden="true" />
					<span className="enter-url-label">{t('recipe.enterUrl')}</span>
				</button>
			)}
			{props.status === 'PENDING' ? (
				<div className="url-container__progress">
					<AssessmentProgress recipeRead={false} />
				</div>
			) : null}
		</>
	);
};

export default UrlContainer;
