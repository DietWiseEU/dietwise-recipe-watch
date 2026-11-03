import { fireEvent, render, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createMessageReceivedAction,
	createPrepareToAssessRecipeAction,
	createRecipeAssessmentCompletedAction,
	createSuggestionStatusAction,
} from '@/recipe/actions';
import { mainStateAtom } from '@/recipe/atoms';
import type { Suggestion } from '@/recipe/model';
import { keyOfSuggestion } from '@/recipe/model';
import RecipesComponent from './RecipesComponent';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

vi.mock('@/auth/authService', () => ({
	getValidAccessToken: vi.fn().mockResolvedValue('token-123'),
}));

const ASSESSMENT_ID = '3e0c7a52-1b6d-4f8e-9a2c-5d4b3a2f1e0d';

const SUGGESTION: Suggestion = {
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
		timesAccepted: 1,
		timesRejected: 0,
	},
	userSuggestionStats: {
		timesSuggested: 1,
		timesAccepted: 1,
		timesRejected: 0,
	},
	text: 'Use olive oil instead of butter',
};

class MockResizeObserver {
	observe() {}
	disconnect() {}
}

describe('RecipesComponent', () => {
	beforeEach(() => {
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(() => Promise.resolve(new Response(null, { status: 204 }))),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('sends the assessmentId with the statistics of undoing an accepted Suggestion', async () => {
		const store = createStore();
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
				suggestions: [SUGGESTION],
				assessmentId: ASSESSMENT_ID,
				intervention: { id: 1, text: 'Healthiness guaranteed.' },
			})!,
		);
		store.set(mainStateAtom, createRecipeAssessmentCompletedAction());
		store.set(mainStateAtom, createSuggestionStatusAction(keyOfSuggestion(SUGGESTION), 'ACCEPTED'));
		render(
			<JotaiProvider store={store}>
				<RecipesComponent />
			</JotaiProvider>,
		);

		const undoButton = document.querySelector('ion-button[color="dark"]');
		if (!undoButton) throw new Error('No undo button');
		fireEvent.click(undoButton);

		await waitFor(() => expect(postedStatistics()).toHaveLength(1));
		expect(postedStatistics()).toEqual([
			['decreaseTimesAccepted', { suggestionId: 's1', assessmentId: ASSESSMENT_ID }],
		]);
	});
});

function postedStatistics() {
	return vi
		.mocked(fetch)
		.mock.calls.filter(([url]) => String(url).includes('/statistics/'))
		.map(([url, init]) => [
			String(url).substring(String(url).lastIndexOf('/') + 1),
			JSON.parse(init?.body as string),
		]);
}
