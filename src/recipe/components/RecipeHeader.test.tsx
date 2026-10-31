import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { describe, expect, it, vi } from 'vitest';
import {
	createMessageReceivedAction,
	createPrepareToAssessRecipeAction,
	createSuggestionStatusAction,
} from '@/recipe/actions';
import { mainStateAtom } from '@/recipe/atoms';
import type { Intervention } from '@/recipe/model';
import { keyOfSuggestion } from '@/recipe/model';
import { SUGGESTION, assess } from '@/recipe/testAssessment';
import RecipeHeader from './RecipeHeader';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, options?: { index?: number }) => (options?.index ? `${key} ${options.index}` : key),
	}),
}));

const INTERVENTION_TEXT = 'Your future self will thank you for this simple swap - why not start now?';
const OTHER_INTERVENTION_TEXT = 'Healthiness guaranteed.';
const SUGGESTION_KEY = keyOfSuggestion(SUGGESTION);

function renderHeader(store: ReturnType<typeof createStore>, onEditUrl = vi.fn(), onReset = vi.fn()) {
	render(
		<JotaiProvider store={store}>
			<RecipeHeader onEditUrl={onEditUrl} onReset={onReset} />
		</JotaiProvider>,
	);
	return store;
}

function renderAssessed(intervention?: Intervention) {
	const store = createStore();
	assess(store, intervention);
	return renderHeader(store);
}

/** An assessment that has extracted the recipe and is still waiting for the suggestions. */
function storeWithExtractedRecipe(name?: string) {
	const store = createStore();
	store.set(mainStateAtom, createPrepareToAssessRecipeAction('https://example.test/recipe', 'en'));
	store.set(
		mainStateAtom,
		createMessageReceivedAction({
			type: 'RECIPES',
			recipes: [
				{
					recipe: { name, recipeIngredients: [{ id: 'i1', nameInRecipe: 'butter' }], recipeInstructions: [] },
					detectionType: 'JSONLD',
				},
			],
			pageText: 'omelet',
		})!,
	);
	return store;
}

describe('RecipeHeader', () => {
	it('shows the name of the recipe and its address', () => {
		renderAssessed();

		expect(screen.getByRole('heading').textContent).toBe('omelet');
		expect(screen.getByText('https://example.test/recipe')).toBeTruthy();
	});

	it('names a recipe without a name by its number', () => {
		renderHeader(storeWithExtractedRecipe());

		expect(screen.getByRole('heading').textContent).toBe('recipe.anonymousRecipeTemplateTitle 1');
	});

	it('opens the address for editing when the address is tapped', () => {
		const onEditUrl = vi.fn();
		const store = createStore();
		assess(store);
		renderHeader(store, onEditUrl);

		fireEvent.click(screen.getByText('https://example.test/recipe'));

		expect(onEditUrl).toHaveBeenCalledTimes(1);
	});

	it('starts over from the reset button once the assessment is complete', () => {
		const onReset = vi.fn();
		const store = createStore();
		assess(store);
		renderHeader(store, vi.fn(), onReset);

		fireEvent.click(document.querySelector('ion-button[aria-label="recipe.startOver"]')!);

		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it('shows a spinner and no reset button while assessing', () => {
		renderHeader(storeWithExtractedRecipe('omelet'));

		expect(document.querySelector('ion-spinner')).toBeTruthy();
		expect(document.querySelector('ion-button')).toBeNull();
	});

	it('shows the rating of the recipe once it is scored', () => {
		const store = storeWithExtractedRecipe('omelet');
		store.set(
			mainStateAtom,
			createMessageReceivedAction({
				type: 'SCORING',
				scoringData: {
					totalNumberOfRecomendations: 0,
					recommendationWeights: {},
					recommendationsPerIngredient: {},
				},
			})!,
		);
		renderHeader(store);

		expect(screen.getByRole('button', { name: 'recipe.rating.score' })).toBeTruthy();
	});

	it('shows the text of the Intervention the server assigned', () => {
		renderAssessed({ id: 1, text: INTERVENTION_TEXT });

		expect(screen.getByRole('status').textContent).toBe(INTERVENTION_TEXT);
	});

	it('shows no banner when the server assigned no Intervention', () => {
		renderAssessed();

		expect(screen.queryByRole('status')).toBeNull();
	});

	it('shows no banner for the "no Intervention" arm', () => {
		renderAssessed({ id: 0, text: null });

		expect(screen.queryByRole('status')).toBeNull();
	});

	it('shows the new Intervention when a new assessment completes', () => {
		const store = renderAssessed({ id: 1, text: INTERVENTION_TEXT });

		act(() => assess(store, { id: 2, text: OTHER_INTERVENTION_TEXT }));

		expect(screen.getByRole('status').textContent).toBe(OTHER_INTERVENTION_TEXT);
	});

	it('keeps the Intervention when a Suggestion is accepted', () => {
		const store = renderAssessed({ id: 1, text: INTERVENTION_TEXT });

		act(() => store.set(mainStateAtom, createSuggestionStatusAction(SUGGESTION_KEY, 'ACCEPTED')));

		expect(store.get(mainStateAtom).suggestions?.[SUGGESTION_KEY].status).toBe('ACCEPTED');
		expect(screen.getByRole('status').textContent).toBe(INTERVENTION_TEXT);
	});
});
