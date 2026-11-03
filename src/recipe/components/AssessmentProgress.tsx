import { IonIcon, IonSpinner } from '@ionic/react';
import { checkmark } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import './AssessmentProgress.css';

export interface AssessmentProgressProps {
	/** Whether the recipe is read from the page, so that its ingredients are being assessed. */
	recipeRead: boolean;
}

type StepState = 'done' | 'running' | 'waiting';

const Step: React.FC<{ state: StepState; text: string }> = ({ state, text }) => (
	<li className={`assessment-progress__step assessment-progress__step--${state}`}>
		{state === 'done' ? (
			<IonIcon className="assessment-progress__marker" icon={checkmark} aria-hidden="true" />
		) : state === 'running' ? (
			<IonSpinner className="assessment-progress__marker" name="crescent" />
		) : (
			<span className="assessment-progress__marker" aria-hidden="true" />
		)}
		<span>{text}</span>
	</li>
);

/** The two steps of assessing a recipe: reading it from the page, then assessing its ingredients. */
const AssessmentProgress: React.FC<AssessmentProgressProps> = ({ recipeRead }) => {
	const { t } = useTranslation();
	return (
		<ol className="assessment-progress" role="list" aria-live="polite">
			{recipeRead ? (
				<Step state="done" text={t('recipe.recipeRead')} />
			) : (
				<Step state="running" text={t('recipe.readingRecipe')} />
			)}
			<Step state={recipeRead ? 'running' : 'waiting'} text={t('recipe.assessingIngredients')} />
		</ol>
	);
};

export default AssessmentProgress;
