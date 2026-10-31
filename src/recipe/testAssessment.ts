import type { createStore } from 'jotai';
import {
	createMessageReceivedAction,
	createPrepareToAssessRecipeAction,
	createRecipeAssessmentCompletedAction,
} from '@/recipe/actions';
import { mainStateAtom } from '@/recipe/atoms';
import type { Intervention, Suggestion } from '@/recipe/model';

/** Test data: the assessment of a recipe with one ingredient, butter, that two suggestions replace. */

export const ASSESSMENT_ID = '3e0c7a52-1b6d-4f8e-9a2c-5d4b3a2f1e0d';

export const SUGGESTION: Suggestion = {
	id: 's1',
	alternative: 'olive oil',
	target: {
		type: 'INGREDIENT',
		ingredient: 'i1',
	},
	ruleId: 'rule-s1',
	recommendation: 'recommendation-s1',
	alternativeComponentNames: [],
	totalSuggestionStats: {
		timesSuggested: 1,
		timesAccepted: 0,
		timesRejected: 0,
	},
	userSuggestionStats: {
		timesSuggested: 1,
		timesAccepted: 0,
		timesRejected: 0,
	},
	text: 'Use olive oil instead of butter',
};

export const OTHER_SUGGESTION: Suggestion = {
	...SUGGESTION,
	id: 's2',
	alternative: 'sunflower oil',
	ruleId: 'rule-s2',
	recommendation: 'recommendation-s2',
	text: 'Use sunflower oil instead of butter',
};

/** Runs a complete assessment through the store; the server sends the assessmentId only with an Intervention. */
export function assess(store: ReturnType<typeof createStore>, intervention?: Intervention) {
	store.set(mainStateAtom, createPrepareToAssessRecipeAction('https://example.test/recipe', 'en'));
	store.set(
		mainStateAtom,
		createMessageReceivedAction({
			type: 'RECIPES',
			recipes: [
				{
					recipe: {
						name: 'omelet',
						recipeIngredients: [{ id: 'i1', nameInRecipe: 'butter' }],
						recipeInstructions: [],
					},
					detectionType: 'JSONLD',
				},
			],
			pageText: 'omelet',
		})!,
	);
	store.set(
		mainStateAtom,
		createMessageReceivedAction({
			type: 'SUGGESTIONS',
			suggestions: [SUGGESTION, OTHER_SUGGESTION],
			...(intervention ? { assessmentId: ASSESSMENT_ID, intervention } : {}),
		})!,
	);
	store.set(mainStateAtom, createRecipeAssessmentCompletedAction());
}
