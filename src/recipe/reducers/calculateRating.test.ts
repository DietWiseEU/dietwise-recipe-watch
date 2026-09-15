import { describe, expect, it } from 'vitest';
import { BASE, MAX_RATING, calculateRating, ratingScore } from './calculateRating';
import type { MainData, Rating, ScoringData, SuggestionState } from '@/recipe/model';

/**
 * Four components split evenly between the two types, so each side's weights sum to 4 and the points
 * of a component are easy to read off: 50 * weight / 4.
 */
const WEIGHTS: ScoringData['recommendationWeights'] = {
	vegetables: { typeOfRecommendation: 'ENCOURAGED', weight: 1 },
	fiber: { typeOfRecommendation: 'ENCOURAGED', weight: 3 },
	redMeat: { typeOfRecommendation: 'LIMITED', weight: 2 },
	sodium: { typeOfRecommendation: 'LIMITED', weight: 2 },
};

function stateWithScoring(scoringData: ScoringData): MainData {
	return {
		status: 'SUCCESS',
		emptySuggestionsFromServer: false,
		lang: 'en',
		scoringData,
	};
}

function stateWithComponents(recommendationsPerIngredient: ScoringData['recommendationsPerIngredient']): MainData {
	return stateWithScoring({
		totalNumberOfRecomendations: Object.keys(WEIGHTS).length,
		recommendationWeights: WEIGHTS,
		recommendationsPerIngredient,
	});
}

function suggestionState(id: string, ingredientId: string, alternativeComponentNames: string[]): SuggestionState {
	return {
		status: 'ACCEPTED',
		suggestion: {
			id,
			alternative: `alt-${id}`,
			target: { type: 'INGREDIENT', ingredient: ingredientId },
			ruleId: `rule-${id}`,
			recommendation: `recommendation-${id}`,
			alternativeComponentNames,
			totalSuggestionStats: { timesSuggested: 1, timesAccepted: 0, timesRejected: 0 },
			userSuggestionStats: { timesSuggested: 1, timesAccepted: 0, timesRejected: 0 },
			text: `text-${id}`,
		},
	};
}

describe('calculateRating', () => {
	it('returns undefined when there is no scoring data', () => {
		const state: MainData = { status: 'PENDING', emptySuggestionsFromServer: false, lang: 'en' };
		expect(calculateRating(state)).toBeUndefined();
	});

	it('splits the present components by type and gives each its share of BASE', () => {
		const rating = calculateRating(stateWithComponents({ i1: ['redMeat'], i2: ['vegetables'] }));

		// vegetables: 50 * 1/4, redMeat: 50 * 2/4; fiber and sodium are absent.
		expect(rating).toEqual({
			encouragedPresent: [{ componentName: 'vegetables', points: 12.5 }],
			limitedPresent: [{ componentName: 'redMeat', points: 25 }],
		});
	});

	it('counts a component once however many ingredients carry it', () => {
		const rating = calculateRating(stateWithComponents({ i1: ['fiber'], i2: ['fiber'] }));

		expect(rating).toEqual({
			encouragedPresent: [{ componentName: 'fiber', points: 37.5 }],
			limitedPresent: [],
		});
	});

	it('scores the components of the alternative once its suggestion is accepted', () => {
		const state: MainData = {
			...stateWithComponents({ i1: ['redMeat'] }),
			suggestions: { s1: suggestionState('s1', 'i1', ['fiber']) },
			ingredientState: { i1: 's1' },
		};

		// The replaced ingredient no longer contributes redMeat, the alternative contributes fiber.
		expect(calculateRating(state)).toEqual({
			encouragedPresent: [{ componentName: 'fiber', points: 37.5 }],
			limitedPresent: [],
		});
	});

	it('gives a side no points when none of its components carries weight', () => {
		const rating = calculateRating(
			stateWithScoring({
				totalNumberOfRecomendations: 2,
				recommendationWeights: {
					vegetables: { typeOfRecommendation: 'ENCOURAGED', weight: 0 },
					sodium: { typeOfRecommendation: 'LIMITED', weight: 2 },
				},
				recommendationsPerIngredient: { i1: ['vegetables'] },
			}),
		);

		expect(rating).toEqual({
			encouragedPresent: [{ componentName: 'vegetables', points: 0 }],
			limitedPresent: [],
		});
	});
});

describe('ratingScore', () => {
	function rating(encouraged: number[], limited: number[]): Rating {
		return {
			encouragedPresent: encouraged.map((points, i) => ({ componentName: `e${i}`, points })),
			limitedPresent: limited.map((points, i) => ({ componentName: `l${i}`, points })),
		};
	}

	it('is BASE when the recipe contains no weighted component', () => {
		expect(ratingScore(rating([], []))).toBe(BASE);
	});

	it('reaches the maximum when every encouraged component is present and no limited one is', () => {
		expect(ratingScore(rating([12.5, 37.5], []))).toBe(MAX_RATING);
	});

	it('bottoms out at zero when every limited component is present and no encouraged one is', () => {
		expect(ratingScore(rating([], [25, 25]))).toBe(0);
	});

	it('adds the encouraged points and subtracts the limited ones, rounded to an integer', () => {
		// 50 + 12.5 - 25 = 37.5
		expect(ratingScore(rating([12.5], [25]))).toBe(38);
	});
});
