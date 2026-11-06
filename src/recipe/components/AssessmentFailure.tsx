import { IonButton } from '@ionic/react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { mainStateAtom } from '@/recipe/atoms';
import { hasFailed, serverErrorsOf } from './recipesComponentUtils';
import './AssessmentFailure.css';

export interface AssessmentFailureProps {
	onTryAnotherAddress: () => void;
	onRetry: () => void;
}

/**
 * What went wrong with the assessment, the server's errors or a broken connection, and the two ways forward: another
 * address, or the same one again.
 */
const AssessmentFailure: React.FC<AssessmentFailureProps> = (props) => {
	const { t } = useTranslation();
	const mainState = useAtomValue(mainStateAtom);
	if (!hasFailed(mainState)) {
		return null;
	}
	const serverErrors = serverErrorsOf(mainState);

	return (
		<section className="assessment-failure" role="alert">
			<h2>{t('recipe.encounteredErrors')}</h2>
			<ul>
				{serverErrors.map((error, index) => (
					// eslint-disable-next-line @eslint-react/no-array-index-key -- the error list is static and never reordered
					<li key={index}>{error}</li>
				))}
				{mainState.interrupted ? <li>{t('recipe.assessmentInterrupted')}</li> : null}
			</ul>
			<div className="assessment-failure__actions">
				<IonButton className="assessment-failure__another" shape="round" onClick={props.onTryAnotherAddress}>
					{t('recipe.tryAnotherAddress')}
				</IonButton>
				<IonButton className="assessment-failure__retry" shape="round" fill="outline" onClick={props.onRetry}>
					{t('recipe.retry')}
				</IonButton>
			</div>
		</section>
	);
};

export default AssessmentFailure;
