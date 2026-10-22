import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import SuggestionsComponent from './SuggestionsComponent';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

vi.mock('@/auth/authService', () => ({
	getValidAccessToken: vi.fn().mockResolvedValue('token-123'),
}));

const ASSESSMENT_ID = '3e0c7a52-1b6d-4f8e-9a2c-5d4b3a2f1e0d';
const INTERVENTION_TEXT = 'Your future self will thank you for this simple swap - why not start now?';
const OTHER_INTERVENTION_TEXT = 'Healthiness guaranteed.';

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
const SUGGESTION_KEY = keyOfSuggestion(SUGGESTION);
const OTHER_SUGGESTION: Suggestion = {
	...SUGGESTION,
	id: 's2',
	alternative: 'sunflower oil',
	ruleId: 'rule-s2',
	recommendation: 'recommendation-s2',
	text: 'Use sunflower oil instead of butter',
};

function assess(store: ReturnType<typeof createStore>, intervention?: Intervention) {
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
		}),
	);
	store.set(
		mainStateAtom,
		createMessageReceivedAction({
			type: 'SUGGESTIONS',
			suggestions: [SUGGESTION, OTHER_SUGGESTION],
			...(intervention ? { assessmentId: ASSESSMENT_ID, intervention } : {}),
		}),
	);
	store.set(mainStateAtom, createRecipeAssessmentCompletedAction());
}

function renderAssessed(intervention?: Intervention) {
	const store = createStore();
	assess(store, intervention);
	render(
		<JotaiProvider store={store}>
			<SuggestionsComponent />
		</JotaiProvider>,
	);
	return store;
}

describe('SuggestionsComponent', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(() => Promise.resolve(new Response(null, { status: 204 }))),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows the text of the Intervention the server assigned', () => {
		renderAssessed({ id: 1, text: INTERVENTION_TEXT });

		expect(screen.getByRole('status').textContent).toBe(INTERVENTION_TEXT);
	});

	it('shows no banner when the server assigned no Intervention', () => {
		renderAssessed();

		expect(screen.getByText('recipe.titleOfSuggestions')).toBeTruthy();
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('shows no banner for the "no Intervention" arm', () => {
		renderAssessed({ id: 0, text: null });

		expect(screen.getByText('recipe.titleOfSuggestions')).toBeTruthy();
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('leaves cooking mode and shows the new Intervention when a new assessment completes', () => {
		const store = renderAssessed({ id: 1, text: INTERVENTION_TEXT });
		fireEvent.click(cookingModeButton());
		expect(cookingModeButton().getAttribute('aria-pressed')).toBe('true');

		act(() => assess(store, { id: 2, text: OTHER_INTERVENTION_TEXT }));

		expect(cookingModeButton().getAttribute('aria-pressed')).toBe('false');
		expect(screen.getByRole('status').textContent).toBe(OTHER_INTERVENTION_TEXT);
	});

	it('keeps cooking mode and the Intervention when a Suggestion is accepted', () => {
		const store = renderAssessed({ id: 1, text: INTERVENTION_TEXT });
		fireEvent.click(cookingModeButton());

		act(() => store.set(mainStateAtom, createSuggestionStatusAction(SUGGESTION_KEY, 'ACCEPTED')));

		expect(store.get(mainStateAtom).suggestions?.[SUGGESTION_KEY].status).toBe('ACCEPTED');
		expect(cookingModeButton().getAttribute('aria-pressed')).toBe('true');
		expect(screen.getByRole('status').textContent).toBe(INTERVENTION_TEXT);
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

function cookingModeButton() {
	const button = screen.getByText('recipe.keepScreenOn').closest('ion-button');
	if (!button) throw new Error('No cooking mode button');
	return button;
}
