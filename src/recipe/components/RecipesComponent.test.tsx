import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createMessageReceivedAction,
	createPrepareToAssessRecipeAction,
	createRecipeAssessmentCompletedAction,
	createSuggestionStatusAction,
} from '@/recipe/actions';
import { mainStateAtom } from '@/recipe/atoms';
import type { Intervention, Suggestion } from '@/recipe/model';
import { keyOfSuggestion } from '@/recipe/model';
import { ASSESSMENT_ID, OTHER_SUGGESTION, SUGGESTION, assess } from '@/recipe/testAssessment';
import RecipesComponent from './RecipesComponent';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

vi.mock('@/auth/authService', () => ({
	getValidAccessToken: vi.fn().mockResolvedValue('token-123'),
}));

const INTERVENTION_TEXT = 'Healthiness guaranteed.';

const SUGAR_SUGGESTION: Suggestion = {
	...SUGGESTION,
	id: 's3',
	alternative: 'honey',
	target: { type: 'INGREDIENT', ingredient: 'i2' },
	ruleId: 'rule-s3',
	recommendation: 'recommendation-s3',
	text: 'Use honey instead of sugar',
};

class MockResizeObserver {
	observe() {}
	disconnect() {}
}

function renderRecipes(store: ReturnType<typeof createStore>) {
	render(
		<JotaiProvider store={store}>
			<RecipesComponent />
		</JotaiProvider>,
	);
	return store;
}

function renderAssessed(intervention?: Intervention) {
	const store = createStore();
	assess(store, intervention);
	return renderRecipes(store);
}

/** An assessment that has extracted a recipe with butter and sugar. */
function storeWithButterAndSugar() {
	const store = createStore();
	store.set(mainStateAtom, createPrepareToAssessRecipeAction('https://example.test/recipe', 'en'));
	store.set(
		mainStateAtom,
		createMessageReceivedAction({
			type: 'RECIPES',
			recipes: [
				{
					recipe: {
						name: 'cake',
						recipeIngredients: [
							{ id: 'i1', nameInRecipe: 'butter' },
							{ id: 'i2', nameInRecipe: 'sugar' },
						],
						recipeInstructions: [],
					},
					detectionType: 'JSONLD',
				},
			],
			pageText: 'cake',
		})!,
	);
	return store;
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

	it('shows each suggestion under the ingredient it replaces', () => {
		const store = storeWithButterAndSugar();
		store.set(
			mainStateAtom,
			createMessageReceivedAction({
				type: 'SUGGESTIONS',
				suggestions: [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION],
			})!,
		);
		store.set(mainStateAtom, createRecipeAssessmentCompletedAction());
		renderRecipes(store);

		const texts = [
			'butter',
			'Use olive oil instead of butter',
			'Use sunflower oil instead of butter',
			'sugar',
			'Use honey instead of sugar',
		];
		const positions = texts.map((text) => document.body.textContent!.indexOf(text));
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
	});

	it('sends the assessmentId with the statistics of accepting a Suggestion in place of another', async () => {
		renderAssessed({ id: 1, text: INTERVENTION_TEXT });

		await acceptAndWaitForStatistics(0, 1);
		await acceptAndWaitForStatistics(1, 3);

		expect(postedStatistics()).toEqual([
			['increaseTimesAccepted', { suggestionId: 's1', assessmentId: ASSESSMENT_ID }],
			['decreaseTimesAccepted', { suggestionId: 's1', assessmentId: ASSESSMENT_ID }],
			['increaseTimesAccepted', { suggestionId: 's2', assessmentId: ASSESSMENT_ID }],
		]);
	});

	it('sends no assessmentId with the statistics when the server assigned no Intervention', async () => {
		renderAssessed();

		await acceptAndWaitForStatistics(0, 1);

		expect(postedStatistics()).toEqual([['increaseTimesAccepted', { suggestionId: 's1' }]]);
	});

	it('sends the assessmentId with the statistics of undoing an accepted Suggestion', async () => {
		const store = createStore();
		assess(store, { id: 1, text: INTERVENTION_TEXT });
		store.set(mainStateAtom, createSuggestionStatusAction(keyOfSuggestion(SUGGESTION), 'ACCEPTED'));
		renderRecipes(store);

		const undoButton = document.querySelector('ion-button[color="dark"]');
		if (!undoButton) throw new Error('No undo button');
		fireEvent.click(undoButton);

		await waitFor(() => expect(postedStatistics()).toHaveLength(1));
		expect(postedStatistics()).toEqual([
			['decreaseTimesAccepted', { suggestionId: 's1', assessmentId: ASSESSMENT_ID }],
		]);
		expect(store.get(mainStateAtom).suggestions?.[keyOfSuggestion(SUGGESTION)].status).toBe('UNDECIDED');
	});

	it('shows the errors of the server below the recipe when it has no suggestions', () => {
		const store = storeWithButterAndSugar();
		store.set(mainStateAtom, createMessageReceivedAction({ type: 'ERROR', errors: ['No ingredients matched'] })!);
		renderRecipes(store);

		expect(screen.getByText('sugar')).toBeTruthy();
		expect(screen.getByText('No ingredients matched')).toBeTruthy();
	});

	it('says so below the recipe when the server has no suggestions for it', () => {
		const store = storeWithButterAndSugar();
		store.set(mainStateAtom, createMessageReceivedAction({ type: 'SUGGESTIONS', suggestions: [] })!);
		store.set(mainStateAtom, createRecipeAssessmentCompletedAction());
		renderRecipes(store);

		expect(screen.getByText('sugar')).toBeTruthy();
		expect(screen.getByText('recipe.emptySuggestionsFromServer')).toBeTruthy();
	});

	it('shows the errors when no recipe was found', () => {
		const store = createStore();
		store.set(mainStateAtom, createPrepareToAssessRecipeAction('https://example.test/recipe', 'en'));
		store.set(
			mainStateAtom,
			createMessageReceivedAction({ type: 'ERROR', errors: ['No recipe found on that page'] })!,
		);
		renderRecipes(store);

		expect(screen.getByText('recipe.encounteredErrors')).toBeTruthy();
		expect(screen.getByText('No recipe found on that page')).toBeTruthy();
	});
});

async function acceptAndWaitForStatistics(suggestionIndex: number, expectedTotalStatistics: number) {
	fireEvent.click(document.querySelectorAll('ion-button[color="success"]')[suggestionIndex]);
	await waitFor(() => expect(postedStatistics()).toHaveLength(expectedTotalStatistics));
}

function postedStatistics() {
	return vi
		.mocked(fetch)
		.mock.calls.filter(([url]) => String(url).includes('/statistics/'))
		.map(([url, init]) => [
			String(url).substring(String(url).lastIndexOf('/') + 1),
			JSON.parse(init?.body as string),
		]);
}
