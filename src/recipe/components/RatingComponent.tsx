import { useState } from 'react';
import {
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonItem,
	IonLabel,
	IonList,
	IonListHeader,
	IonModal,
	IonNote,
	IonTitle,
	IonToolbar,
} from '@ionic/react';
import { TbInfoSquareRounded } from 'react-icons/tb';
import { useTranslation } from 'react-i18next';
import type { Rating, RatingContribution } from '@/recipe/model';
import { BASE, ratingScore } from '@/recipe/reducers/calculateRating';
import './RatingComponent.css';

export interface RatingComponentProps {
	rating: Rating | undefined;
	max: number;
}

/** How far from the neutral BASE the score has to be before the bar changes colour. */
const BAND_WIDTH = 10;

function bandOf(score: number): string {
	if (score < BASE - BAND_WIDTH) return 'poor';
	if (score < BASE + BAND_WIDTH) return 'fair';
	return 'good';
}

const RatingComponent: React.FC<RatingComponentProps> = (props: RatingComponentProps) => {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const rating = props.rating;
	const score = rating ? ratingScore(rating) : 0;
	const filled = props.max === 0 ? 0 : (score / props.max) * 100;
	const encouragedPresent = rating?.encouragedPresent ?? [];
	const limitedPresent = rating?.limitedPresent ?? [];
	const bothPresent = encouragedPresent.length > 0 && limitedPresent.length > 0;

	const openDetails = () => {
		if (rating) setIsOpen(true);
	};

	const renderComponents = (contributions: RatingContribution[], sign: string) =>
		contributions.length ? (
			contributions.map((contribution) => (
				<IonItem key={contribution.componentName}>
					<IonLabel className="rating-score__component">{contribution.componentName}</IonLabel>
					<IonNote slot="end">
						{sign}
						{Math.round(contribution.points)}
					</IonNote>
				</IonItem>
			))
		) : (
			<IonItem>
				<IonLabel color="medium">{t('recipe.rating.none')}</IonLabel>
			</IonItem>
		);

	return (
		<>
			<div
				className="rating-score"
				role="button"
				tabIndex={0}
				aria-label={t('recipe.rating.score', { score, max: props.max })}
				onClick={openDetails}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						openDetails();
					}
				}}
			>
				<div className="rating-score__track">
					<div
						className={`rating-score__fill rating-score__fill--${bandOf(score)}`}
						style={{ width: `${filled}%` }}
					/>
				</div>
				<span className="rating-score__value">{score}</span>
				<TbInfoSquareRounded className="rating-score__info" aria-hidden="true" />
			</div>
			<IonModal isOpen={isOpen} onDidDismiss={() => setIsOpen(false)}>
				<IonHeader>
					<IonToolbar>
						<IonTitle>{t('recipe.rating.detailsTitle')}</IonTitle>
						<IonButtons slot="end">
							<IonButton onClick={() => setIsOpen(false)}>{t('general.OK')}</IonButton>
						</IonButtons>
					</IonToolbar>
				</IonHeader>
				<IonContent>
					<IonList>
						<IonListHeader>{t('recipe.rating.encouragedPresent')}</IonListHeader>
						{renderComponents(encouragedPresent, '+')}
						<IonListHeader className={bothPresent ? 'rating-score__section-gap' : undefined}>
							{t('recipe.rating.limitedPresent')}
						</IonListHeader>
						{renderComponents(limitedPresent, '−')}
					</IonList>
				</IonContent>
			</IonModal>
		</>
	);
};

export default RatingComponent;
