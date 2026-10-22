import { describe, expect, it, vi } from 'vitest';
import { createInitialState, reducer } from './reducer';
import {
	createMessageReceivedAction,
	createPrepareToAssessRecipeAction,
	createRecipeAssessmentFailedAction,
	createRecipeAssessmentCompletedAction,
	createSuggestionStatusAction,
} from './actions';
import type { RecipeAndDetectionType, RecipeAssessmentMessage } from './model';
import type { MainAction } from './actions';
import type { Suggestion } from './model';
import { keyOfIngredientSuggestion } from './model';

const URL = 'https://example.com/recipe';
const ASSESSMENT_ID = '3e0c7a52-1b6d-4f8e-9a2c-5d4b3a2f1e0d';
const INTERVENTION = { id: 2, text: 'Healthiness guaranteed.' };
const INGREDIENT_ID = 'i1';
const SUGGESTION_KEY = keyOfIngredientSuggestion('s1', INGREDIENT_ID);

const pending = () => reducer(createInitialState(), createPrepareToAssessRecipeAction(URL, 'en'));

/** Every message these tests send is one the state machine acts on, unlike a keep-alive. */
const messageAction = (message: RecipeAssessmentMessage): MainAction => {
	const action = createMessageReceivedAction(message);
	if (!action) throw new Error('Expected an action for ' + message.type);
	return action;
};

const aRecipe: RecipeAndDetectionType = {
	recipe: { name: 'Fasolada', recipeIngredients: [], recipeInstructions: [] },
	detectionType: 'JSONLD',
};

function createSuggestion(id: string): Suggestion {
	return {
		id,
		alternative: `alt-${id}`,
		target: {
			type: 'INGREDIENT',
			ingredient: INGREDIENT_ID,
		},
		ruleId: `rule-${id}`,
		recommendation: `recommendation-${id}`,
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
		text: `text-${id}`,
	};
}

function pendingState() {
	return reducer(createInitialState(), createPrepareToAssessRecipeAction('https://example.test/recipe', 'en'));
}

function assessedState() {
	const withRecipe = reducer(
		pendingState(),
		createMessageReceivedAction({
			type: 'RECIPES',
			recipes: [
				{
					recipe: {
						name: 'omelet',
						recipeIngredients: [{ id: INGREDIENT_ID, nameInRecipe: 'eggs' }],
						recipeInstructions: [],
					},
					detectionType: 'JSONLD',
				},
			],
			pageText: 'omelet',
		})!,
	);
	const withSuggestions = reducer(
		withRecipe,
		createMessageReceivedAction({
			type: 'SUGGESTIONS',
			suggestions: [createSuggestion('s1')],
			assessmentId: ASSESSMENT_ID,
			intervention: INTERVENTION,
		})!,
	);
	return reducer(withSuggestions, createRecipeAssessmentCompletedAction());
}

describe('reducer', () => {
	it('reports a broken stream as an interruption rather than as a problem with the recipe', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const state = reducer(pending(), createRecipeAssessmentFailedAction(new Error('Load failed')));

		expect(state.status).toBe('FAILURE');
		expect(state.interrupted).toBe(true);
		expect(state.errors).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('interrupted'), expect.any(Error));
		warn.mockRestore();
	});

	it('keeps what arrived before the stream broke, so a retry is not the only way forward', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const withRecipe = reducer(
			pending(),
			messageAction({ type: 'RECIPES', recipes: [aRecipe], pageText: 'page text' }),
		);
		const state = reducer(withRecipe, createRecipeAssessmentFailedAction(new Error('Load failed')));

		expect(state.recipes?.[0].name).toBe('Fasolada');
		warn.mockRestore();
	});

	it('keeps the reported problems when the server is the one reporting the failure', () => {
		const state = reducer(pending(), messageAction({ type: 'ERROR', errors: ['No recipe found on that page'] }));

		expect(state.status).toBe('FAILURE');
		expect(state.errors).toEqual(['No recipe found on that page']);
		expect(state.interrupted).toBeFalsy();
	});

	it('clears the interruption once the assessment is started again', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const interrupted = reducer(pending(), createRecipeAssessmentFailedAction(new Error('Load failed')));
		warn.mockRestore();

		const retried = reducer(interrupted, createPrepareToAssessRecipeAction(URL, 'en'));

		expect(retried.status).toBe('PENDING');
		expect(retried.interrupted).toBeFalsy();
	});

	it('keeps the assessmentId and the Intervention of the SUGGESTIONS message', () => {
		const next = reducer(
			pendingState(),
			createMessageReceivedAction({
				type: 'SUGGESTIONS',
				suggestions: [createSuggestion('s1')],
				assessmentId: ASSESSMENT_ID,
				intervention: INTERVENTION,
			})!,
		);

		expect(next.assessmentId).toBe(ASSESSMENT_ID);
		expect(next.intervention).toEqual(INTERVENTION);
	});

	it('forgets the assessmentId and the Intervention when a new assessment starts', () => {
		const next = reducer(
			assessedState(),
			createPrepareToAssessRecipeAction('https://example.test/other-recipe', 'en'),
		);

		expect(next.assessmentId).toBeUndefined();
		expect(next.intervention).toBeUndefined();
	});

	it.each(['ACCEPTED', 'REJECTED'] as const)(
		'keeps the assessmentId and the Intervention when a Suggestion becomes %s and UNDECIDED again',
		(status) => {
			const decided = reducer(assessedState(), createSuggestionStatusAction(SUGGESTION_KEY, status));
			const undecided = reducer(decided, createSuggestionStatusAction(SUGGESTION_KEY, 'UNDECIDED'));

			expect(decided.suggestions?.[SUGGESTION_KEY].status).toBe(status);
			expect(decided.assessmentId).toBe(ASSESSMENT_ID);
			expect(decided.intervention).toEqual(INTERVENTION);
			expect(undecided.assessmentId).toBe(ASSESSMENT_ID);
			expect(undecided.intervention).toEqual(INTERVENTION);
		},
	);
});
