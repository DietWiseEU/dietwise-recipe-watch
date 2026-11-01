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
import { settingsAtom } from '@/settings/atoms';
import { DEFAULT_SETTINGS } from '@/settings/model';
import RecipesComponent from './RecipesComponent';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, options?: { count?: number }) =>
			options?.count === undefined ? key : `${key}:${options.count}`,
	}),
}));

vi.mock('@/auth/authService', () => ({
	getValidAccessToken: vi.fn().mockResolvedValue('token-123'),
}));

vi.mock('@/settings/storage', () => ({
	saveSettings: vi.fn(() => Promise.resolve()),
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

function assessWithSuggestions(store: ReturnType<typeof createStore>, suggestions: Suggestion[]) {
	store.set(mainStateAtom, createMessageReceivedAction({ type: 'SUGGESTIONS', suggestions })!);
	store.set(mainStateAtom, createRecipeAssessmentCompletedAction());
}

async function preferAutoAdvance(store: ReturnType<typeof createStore>, autoAdvance: boolean) {
	await store.set(settingsAtom, { ...DEFAULT_SETTINGS, autoAdvance });
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

	it('opens the first ingredient with suggestions and shows them under it', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		const texts = ['butter', 'Use olive oil instead of butter', 'Use sunflower oil instead of butter', 'sugar'];
		const positions = texts.map((text) => document.body.textContent!.indexOf(text));
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
		expect(document.body.textContent).not.toContain('Use honey instead of sugar');
	});

	it('shows how many alternatives each ingredient has', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		expect(screen.getByText('ingredient.alternatives:2')).toBeTruthy();
		expect(screen.getByText('ingredient.alternatives:1')).toBeTruthy();
	});

	it('opens one ingredient at a time', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		fireEvent.click(screen.getByText('ingredient.alternatives:1'));

		expect(document.body.textContent).toContain('Use honey instead of sugar');
		expect(document.body.textContent).not.toContain('Use olive oil instead of butter');
	});

	it('closes the open ingredient', () => {
		renderAssessed();

		fireEvent.click(screen.getByText('ingredient.alternatives:2'));

		expect(document.body.textContent).toContain('butter');
		expect(document.body.textContent).not.toContain('Use olive oil instead of butter');
	});

	it('shows no alternatives under an ingredient once one of them is accepted', () => {
		const store = createStore();
		assess(store);
		store.set(mainStateAtom, createSuggestionStatusAction(keyOfSuggestion(SUGGESTION), 'ACCEPTED'));
		renderRecipes(store);

		expect(document.body.textContent).toContain('olive oil');
		expect(document.body.textContent).not.toContain('Use sunflower oil instead of butter');
		expect(screen.queryByText(/^ingredient\.alternatives/)).toBeNull();
	});

	it('moves a rejected suggestion out of the list, from where it can be reconsidered', async () => {
		const store = renderAssessed();

		fireEvent.click(rejectButtons()[0]);
		await waitFor(() => expect(postedStatistics()).toHaveLength(1));

		expect(document.body.textContent).not.toContain('Use olive oil instead of butter');
		expect(screen.getByText('ingredient.alternatives:1')).toBeTruthy();

		fireEvent.click(screen.getByText('olive oil'));
		await waitFor(() => expect(postedStatistics()).toHaveLength(2));

		expect(store.get(mainStateAtom).suggestions?.[keyOfSuggestion(SUGGESTION)].status).toBe('UNDECIDED');
		expect(document.body.textContent).toContain('Use olive oil instead of butter');
		expect(screen.queryByText('olive oil')).toBeNull();
	});

	it('offers no alternatives for an ingredient once all of them are rejected', () => {
		const store = createStore();
		assess(store);
		store.set(mainStateAtom, createSuggestionStatusAction(keyOfSuggestion(SUGGESTION), 'REJECTED'));
		store.set(mainStateAtom, createSuggestionStatusAction(keyOfSuggestion(OTHER_SUGGESTION), 'REJECTED'));
		renderRecipes(store);

		expect(screen.queryByText(/^ingredient\.alternatives/)).toBeNull();
		expect(screen.getByText('olive oil')).toBeTruthy();
		expect(screen.getByText('sunflower oil')).toBeTruthy();
	});

	it('skips the open ingredient, leaving it undecided, and opens the next one with alternatives', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		fireEvent.click(screen.getByText('ingredient.skip'));

		expect(document.body.textContent).toContain('Use honey instead of sugar');
		expect(document.body.textContent).not.toContain('Use olive oil instead of butter');
		expect(screen.getAllByText('ingredient.skipped')).toHaveLength(1);
		expect(screen.getByText('ingredient.alternatives:2')).toBeTruthy();
		expect(store.get(mainStateAtom).suggestions?.[keyOfSuggestion(SUGGESTION)].status).toBe('UNDECIDED');
		expect(postedStatistics()).toEqual([]);
	});

	it('goes on from the last ingredient to the first one when skipping', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		fireEvent.click(screen.getByText('ingredient.alternatives:1'));
		fireEvent.click(screen.getByText('ingredient.skip'));

		expect(document.body.textContent).toContain('Use olive oil instead of butter');
		expect(document.body.textContent).not.toContain('Use honey instead of sugar');
	});

	it('opens no ingredient once every ingredient with alternatives is skipped', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		fireEvent.click(screen.getByText('ingredient.skip'));
		fireEvent.click(screen.getByText('ingredient.skip'));

		expect(document.body.textContent).not.toContain('Use olive oil instead of butter');
		expect(document.body.textContent).not.toContain('Use honey instead of sugar');
		expect(screen.getAllByText('ingredient.skipped')).toHaveLength(2);
	});

	it('passes over the ingredients that have an accepted alternative when skipping', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		store.set(mainStateAtom, createSuggestionStatusAction(keyOfSuggestion(SUGGESTION), 'ACCEPTED'));
		renderRecipes(store);

		fireEvent.click(screen.getByText('ingredient.alternatives:1'));
		fireEvent.click(screen.getByText('ingredient.skip'));

		expect(document.body.textContent).not.toContain('Use honey instead of sugar');
		expect(document.body.textContent).not.toContain('Use sunflower oil instead of butter');
	});

	it('reopens a skipped ingredient on tap, and no longer marks it skipped', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		fireEvent.click(screen.getByText('ingredient.skip'));
		fireEvent.click(screen.getByText('ingredient.alternatives:2'));

		expect(document.body.textContent).toContain('Use olive oil instead of butter');
		expect(document.body.textContent).not.toContain('Use honey instead of sugar');
		expect(screen.queryByText('ingredient.skipped')).toBeNull();
	});

	it('opens the next ingredient with alternatives once one is accepted, when the user wants that', async () => {
		const store = storeWithButterAndSugar();
		await preferAutoAdvance(store, true);
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		await acceptAndWaitForStatistics(0, 1);

		expect(document.body.textContent).toContain('Use honey instead of sugar');
		expect(document.body.textContent).not.toContain('Use sunflower oil instead of butter');
	});

	it('opens the next ingredient with alternatives once the last one is rejected, when the user wants that', async () => {
		const store = storeWithButterAndSugar();
		await preferAutoAdvance(store, true);
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		fireEvent.click(rejectButtons()[0]);
		await waitFor(() => expect(postedStatistics()).toHaveLength(1));

		expect(document.body.textContent).toContain('Use sunflower oil instead of butter');
		expect(document.body.textContent).not.toContain('Use honey instead of sugar');

		fireEvent.click(rejectButtons()[0]);
		await waitFor(() => expect(postedStatistics()).toHaveLength(2));

		expect(document.body.textContent).toContain('Use honey instead of sugar');
	});

	it('opens no other ingredient once an alternative is accepted, when the user does not want that', async () => {
		const store = storeWithButterAndSugar();
		await preferAutoAdvance(store, false);
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);

		await acceptAndWaitForStatistics(0, 1);

		expect(document.body.textContent).not.toContain('Use honey instead of sugar');
		expect(document.body.textContent).not.toContain('Use sunflower oil instead of butter');
	});

	it('says when every ingredient is reviewed, with how many alternatives were accepted and skipped', async () => {
		const store = storeWithButterAndSugar();
		await preferAutoAdvance(store, true);
		assessWithSuggestions(store, [SUGGESTION, SUGAR_SUGGESTION, OTHER_SUGGESTION]);
		renderRecipes(store);
		expect(screen.queryByText(/ingredient\.allReviewed/)).toBeNull();

		fireEvent.click(screen.getByText('ingredient.skip'));
		await acceptAndWaitForStatistics(0, 1);

		expect(document.body.textContent).not.toContain('Use sunflower oil instead of butter');
		expect(screen.getByRole('status').textContent).toBe(
			'ingredient.allReviewed · ingredient.acceptedCount:1 · ingredient.skippedCount:1',
		);
	});

	it('says when every ingredient is reviewed, leaving out the skipped ones when there are none', async () => {
		const store = createStore();
		await preferAutoAdvance(store, true);
		assess(store);
		renderRecipes(store);

		await acceptAndWaitForStatistics(0, 1);

		expect(screen.getByRole('status').textContent).toBe('ingredient.allReviewed · ingredient.acceptedCount:1');
	});

	it('says nothing of reviewing a recipe that has no alternatives', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, []);
		renderRecipes(store);

		expect(screen.queryByText(/ingredient\.allReviewed/)).toBeNull();
	});

	it('says which ingredients have no suggestions', () => {
		const store = storeWithButterAndSugar();
		assessWithSuggestions(store, [SUGGESTION]);
		renderRecipes(store);

		expect(screen.getAllByText('ingredient.noSuggestions')).toHaveLength(1);
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

function rejectButtons() {
	return document.querySelectorAll('ion-button[color="medium"][slot="end"]');
}

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
