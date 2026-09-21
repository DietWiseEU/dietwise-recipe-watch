import { describe, expect, it, vi } from 'vitest';
import { createInitialState, reducer } from './reducer';
import {
	createMessageReceivedAction,
	createPrepareToAssessRecipeAction,
	createRecipeAssessmentFailedAction,
} from './actions';
import type { RecipeAndDetectionType } from './model';

const URL = 'https://example.com/recipe';

const pending = () => reducer(createInitialState(), createPrepareToAssessRecipeAction(URL, 'en'));

const aRecipe: RecipeAndDetectionType = {
	recipe: { name: 'Fasolada', recipeIngredients: [], recipeInstructions: [] },
	detectionType: 'JSONLD',
};

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
			createMessageReceivedAction({ type: 'RECIPES', recipes: [aRecipe], pageText: 'page text' }),
		);
		const state = reducer(withRecipe, createRecipeAssessmentFailedAction(new Error('Load failed')));

		expect(state.recipes?.[0].name).toBe('Fasolada');
		warn.mockRestore();
	});

	it('keeps the reported problems when the server is the one reporting the failure', () => {
		const state = reducer(
			pending(),
			createMessageReceivedAction({ type: 'ERROR', errors: ['No recipe found on that page'] }),
		);

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
});
