import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Ingredient, MainData, Rating, ScoringData, Suggestion, SuggestionState } from '@/recipe/model';
import { useLogRating } from './useLogRating';

const RATING_LABEL = 'Recipe rating:';
const INGREDIENTS_LABEL = 'Rating components per ingredient:';
const SUGGESTIONS_LABEL = 'Rating components per suggestion:';

/** Scores 50 + 13 = 63 out of 100. */
const RATING: Rating = {
	encouragedPresent: [{ componentName: 'vegetables', points: 13 }],
	limitedPresent: [],
};

/** Scores 50 - 25 = 25 out of 100. */
const OTHER_RATING: Rating = {
	encouragedPresent: [],
	limitedPresent: [{ componentName: 'sodium', points: 25 }],
};

const BUTTER: Ingredient = { id: 'i1', nameInRecipe: '200g butter' };
const SALT: Ingredient = { id: 'i2', nameInRecipe: '1 tsp salt' };

const SCORING: ScoringData = {
	totalNumberOfRecomendations: 2,
	recommendationWeights: {
		saturatedFat: { typeOfRecommendation: 'LIMITED', weight: 1 },
		sodium: { typeOfRecommendation: 'LIMITED', weight: 1 },
	},
	recommendationsPerIngredient: {
		i1: ['saturatedFat'],
		i2: ['sodium'],
	},
};

function suggestionState(id: string, ingredientId: string, alternative: string, components: string[]): SuggestionState {
	const suggestion: Suggestion = {
		id,
		alternative,
		target: { type: 'INGREDIENT', ingredient: ingredientId },
		ruleId: `rule-${id}`,
		recommendation: `recommendation-${id}`,
		alternativeComponentNames: components,
		totalSuggestionStats: { timesSuggested: 1, timesAccepted: 0, timesRejected: 0 },
		userSuggestionStats: { timesSuggested: 1, timesAccepted: 0, timesRejected: 0 },
		text: `text-${id}`,
	};
	return { suggestion, extra: undefined, status: 'UNDECIDED' };
}

const OLIVE_OIL = suggestionState('s1', 'i1', 'olive oil', ['unsaturatedFat']);
const HERBS = suggestionState('s2', 'i2', 'herbs', ['vegetables']);

function mainData(state: Partial<MainData>): MainData {
	return {
		status: 'SUCCESS',
		emptySuggestionsFromServer: false,
		lang: 'en',
		...state,
	};
}

function withRecipe(ingredients: Ingredient[], state: Partial<MainData>): MainData {
	return mainData({
		recipes: [{ name: 'A recipe', recipeIngredients: ingredients, recipeInstructions: [] }],
		...state,
	});
}

function withSuggestions(suggestions: SuggestionState[], state: Partial<MainData> = {}): MainData {
	return withRecipe([BUTTER, SALT], {
		suggestionKeys: suggestions.map((s) => s.suggestion.id),
		suggestions: Object.fromEntries(suggestions.map((s) => [s.suggestion.id, s])),
		...state,
	});
}

function spyOnConsole() {
	return vi.spyOn(console, 'log').mockImplementation(() => {});
}

function loggedWith(log: ReturnType<typeof spyOnConsole>, label: string) {
	return log.mock.calls.filter((call) => call[0] === label || String(call[0]).startsWith(label));
}

function renderUseLogRating(state: MainData, wrapper?: React.FC<{ children: React.ReactNode }>) {
	return renderHook(({ state }: { state: MainData }) => useLogRating(state), {
		initialProps: { state },
		wrapper,
	});
}

describe('useLogRating', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('the score', () => {
		it('logs nothing as long as there is no rating', () => {
			const log = spyOnConsole();
			renderUseLogRating(mainData({}));
			expect(loggedWith(log, RATING_LABEL)).toHaveLength(0);
		});

		it('logs the score and the contributions of the first rating', () => {
			const log = spyOnConsole();
			renderUseLogRating(mainData({ rating: RATING }));
			expect(log).toHaveBeenCalledWith(`${RATING_LABEL} 63/100`, RATING);
		});

		it('logs every new rating', () => {
			const log = spyOnConsole();
			const { rerender } = renderUseLogRating(mainData({}));
			rerender({ state: mainData({ rating: RATING }) });
			rerender({ state: mainData({ rating: OTHER_RATING }) });
			expect(loggedWith(log, RATING_LABEL)).toHaveLength(2);
			expect(log).toHaveBeenLastCalledWith(`${RATING_LABEL} 25/100`, OTHER_RATING);
		});

		it('logs an unchanged rating only once', () => {
			const log = spyOnConsole();
			const state = mainData({ rating: RATING });
			const { rerender } = renderUseLogRating(state);
			rerender({ state: { ...state } });
			expect(loggedWith(log, RATING_LABEL)).toHaveLength(1);
		});

		it('logs once under the double rendering of StrictMode', () => {
			const log = spyOnConsole();
			renderUseLogRating(mainData({ rating: RATING }), StrictMode);
			expect(loggedWith(log, RATING_LABEL)).toHaveLength(1);
		});
	});

	describe('the components of each ingredient', () => {
		it('logs them under the text of the ingredient', () => {
			const log = spyOnConsole();
			renderUseLogRating(withRecipe([BUTTER, SALT], { scoringData: SCORING }));
			expect(log).toHaveBeenCalledWith(INGREDIENTS_LABEL, {
				'200g butter': ['saturatedFat'],
				'1 tsp salt': ['sodium'],
			});
		});

		it('falls back to the id of an ingredient that is not in the recipe', () => {
			const log = spyOnConsole();
			renderUseLogRating(withRecipe([BUTTER], { scoringData: SCORING }));
			expect(log).toHaveBeenCalledWith(INGREDIENTS_LABEL, {
				'200g butter': ['saturatedFat'],
				i2: ['sodium'],
			});
		});

		it('keeps both ingredients that carry the same text', () => {
			const log = spyOnConsole();
			const moreSalt: Ingredient = { id: 'i2', nameInRecipe: BUTTER.nameInRecipe };
			renderUseLogRating(withRecipe([BUTTER, moreSalt], { scoringData: SCORING }));
			expect(log).toHaveBeenCalledWith(INGREDIENTS_LABEL, {
				'200g butter': ['saturatedFat'],
				'200g butter (i2)': ['sodium'],
			});
		});

		it('logs them once, not on every recalculation', () => {
			const log = spyOnConsole();
			const state = withRecipe([BUTTER, SALT], { scoringData: SCORING, rating: RATING });
			const { rerender } = renderUseLogRating(state);
			rerender({ state: { ...state, rating: OTHER_RATING } });
			expect(loggedWith(log, INGREDIENTS_LABEL)).toHaveLength(1);
		});
	});

	describe('the components of each suggestion', () => {
		it('logs them under the name of the alternative', () => {
			const log = spyOnConsole();
			renderUseLogRating(withSuggestions([OLIVE_OIL, HERBS]));
			expect(log).toHaveBeenCalledWith(SUGGESTIONS_LABEL, {
				'olive oil': ['unsaturatedFat'],
				herbs: ['vegetables'],
			});
		});

		it('keeps both suggestions that propose the same alternative', () => {
			const log = spyOnConsole();
			const otherOil = suggestionState('s3', 'i2', OLIVE_OIL.suggestion.alternative, ['unsaturatedFat']);
			renderUseLogRating(withSuggestions([OLIVE_OIL, otherOil]));
			expect(log).toHaveBeenCalledWith(SUGGESTIONS_LABEL, {
				'olive oil': ['unsaturatedFat'],
				'olive oil (s3)': ['unsaturatedFat'],
			});
		});

		it('logs them once, not every time a suggestion is accepted', () => {
			const log = spyOnConsole();
			const state = withSuggestions([OLIVE_OIL, HERBS], { rating: RATING });
			const { rerender } = renderUseLogRating(state);
			const accepted: SuggestionState = { ...OLIVE_OIL, status: 'ACCEPTED' };
			rerender({
				state: {
					...state,
					rating: OTHER_RATING,
					suggestions: { ...state.suggestions, [OLIVE_OIL.suggestion.id]: accepted },
				},
			});
			expect(loggedWith(log, SUGGESTIONS_LABEL)).toHaveLength(1);
		});
	});
});
