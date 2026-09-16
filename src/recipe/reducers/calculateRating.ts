import { MainData, Rating, RatingContribution, ScoringData, TypeOfRecommendation } from '@/recipe/model';
// import { keyOfIngredientSuggestion } from '@/recipe/model';

/** The score of a recipe that carries no weighted component, and the most either type can move it by. */
export const BASE = 50;

/** The score of a recipe carrying every ENCOURAGED component and no LIMITED one. */
export const MAX_RATING = 2 * BASE;

type PresenceMap = { [key: string]: boolean };

type WeightTotals = { [K in TypeOfRecommendation]: number };

export function calculateRating(state: MainData): Rating | undefined {
	if (!state.scoringData) return undefined;
	const weights = state.scoringData.recommendationWeights;
	const presenceMap: PresenceMap = Object.keys(weights).reduce((aggr, cur) => ({ ...aggr, [cur]: false }), {});
	for (const ingredientId in state.scoringData.recommendationsPerIngredient) {
		let recommendations = state.scoringData.recommendationsPerIngredient[ingredientId];
		if (state.ingredientState?.[ingredientId]) {
			// the ingredient is replaced, calculate the contribution of its replacement
			const suggestionKey = state.ingredientState?.[ingredientId];
			const acceptedSuggestion = state?.suggestions?.[suggestionKey];
			const maybeRecommendations = acceptedSuggestion?.suggestion.alternativeComponentNames;
			if (maybeRecommendations) recommendations = acceptedSuggestion?.suggestion.alternativeComponentNames;
		}
		for (let i = 0; i < recommendations.length; i++) {
			presenceMap[recommendations[i]] = true;
		}
	}
	const totals = sumWeightsPerType(weights);
	const encouragedPresent: RatingContribution[] = [];
	const limitedPresent: RatingContribution[] = [];
	for (const componentName in weights) {
		if (!presenceMap[componentName]) continue;
		const { typeOfRecommendation, weight } = weights[componentName];
		const total = totals[typeOfRecommendation];
		const contribution: RatingContribution = {
			componentName,
			points: total === 0 ? 0 : (BASE * weight) / total,
		};
		if (typeOfRecommendation === 'LIMITED') {
			limitedPresent.push(contribution);
		} else {
			encouragedPresent.push(contribution);
		}
	}
	return { encouragedPresent, limitedPresent };
}

/**
 * The recipe's score: {@link BASE}, raised by every ENCOURAGED component it carries and lowered by every
 * LIMITED one, as an integer between 0 and {@link MAX_RATING}.
 */
export function ratingScore(rating: Rating): number {
	return Math.round(BASE + sumPoints(rating.encouragedPresent) - sumPoints(rating.limitedPresent));
}

/** The weights of all the components of each type, the denominator of a component's share of {@link BASE}. */
function sumWeightsPerType(weights: ScoringData['recommendationWeights']): WeightTotals {
	const totals: WeightTotals = { ENCOURAGED: 0, LIMITED: 0 };
	for (const componentName in weights) {
		const { typeOfRecommendation, weight } = weights[componentName];
		totals[typeOfRecommendation] += weight;
	}
	return totals;
}

function sumPoints(contributions: RatingContribution[]): number {
	return contributions.reduce((total, contribution) => total + contribution.points, 0);
}
