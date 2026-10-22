import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { describe, expect, it, vi } from 'vitest';
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
			suggestions: [SUGGESTION],
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
});

function cookingModeButton() {
	const button = screen.getByText('recipe.keepScreenOn').closest('ion-button');
	if (!button) throw new Error('No cooking mode button');
	return button;
}
