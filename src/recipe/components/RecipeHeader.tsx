import { IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { arrowUndo } from 'ionicons/icons';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { mainStateAtom } from '@/recipe/atoms';
import { MAX_RATING } from '@/recipe/reducers/calculateRating';
import brainIcon from '@/assets/images/brain.svg';
import jsonLdIcon from '@/assets/images/json-ld.svg';
import RatingComponent from './RatingComponent';
import './RecipeHeader.css';

export interface RecipeHeaderProps {
	onEditUrl: () => void;
	onReset: () => void;
}

/** What stays in view above the recipe: its name and address, the way to start over, the rating and the Intervention. */
const RecipeHeader: React.FC<RecipeHeaderProps> = (props) => {
	const { t } = useTranslation();
	const mainState = useAtomValue(mainStateAtom);
	const recipe = mainState.recipes?.[0];
	if (!recipe) {
		return null;
	}
	const detectionType = mainState.detectionTypes?.[0];
	const canReset = mainState.status === 'SUCCESS' || mainState.status === 'FAILURE';

	return (
		<header className="recipe-header">
			<div className="recipe-header__top">
				<div className="recipe-header__identity">
					<h2 className="recipe-header__title">
						{recipe.name ? recipe.name : t('recipe.anonymousRecipeTemplateTitle', { index: 1 })}
					</h2>
					<button type="button" className="recipe-header__url" onClick={props.onEditUrl}>
						{mainState.url}
					</button>
				</div>
				{detectionType ? (
					<IonIcon
						className="recipe-header__detection"
						icon={detectionType === 'JSONLD' ? jsonLdIcon : brainIcon}
						aria-hidden="true"
						color="medium"
					/>
				) : null}
				{mainState.status === 'PENDING' ? <IonSpinner className="recipe-header__progress" /> : null}
				{canReset ? (
					<IonButton
						className="recipe-header__reset"
						fill="clear"
						color="dark"
						aria-label={t('recipe.startOver')}
						onClick={props.onReset}
					>
						<IonIcon slot="icon-only" icon={arrowUndo} />
					</IonButton>
				) : null}
			</div>
			{mainState.rating ? (
				<div className="recipe-header__rating">
					<RatingComponent rating={mainState.rating} max={MAX_RATING} />
				</div>
			) : null}
			{mainState.intervention?.text ? (
				<div className="recipe-header__intervention" role="status">
					{mainState.intervention.text}
				</div>
			) : null}
		</header>
	);
};

export default RecipeHeader;
