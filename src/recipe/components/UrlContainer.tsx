import { IonButton, IonIcon } from '@ionic/react';
import { alertCircleOutline, arrowUndo, sparklesOutline } from 'ionicons/icons';
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

	return (
		<>
			<p className="url-container ion-display-flex ion-align-items-center" onClick={props.onClick}>
				{typeof props.url === 'string' ? (
					<>
						{statusIcon ? (
							<IonIcon className="url-container__status" icon={statusIcon} aria-hidden="true" />
						) : null}
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
			{props.status === 'PENDING' ? (
				<div className="url-container__progress">
					<AssessmentProgress recipeRead={false} />
				</div>
			) : null}
		</>
	);
};

export default UrlContainer;
