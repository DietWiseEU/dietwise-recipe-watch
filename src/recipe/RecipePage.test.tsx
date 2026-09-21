import { render, screen, fireEvent } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { assessRecipe } from '@/recipe/assessRecipe';
import {
	createPrepareToAssessRecipeAction,
	createRecipeAssessmentCompletedAction,
	createRecipeAssessmentFailedAction,
} from '@/recipe/actions';
import { mainStateAtom } from '@/recipe/atoms';
import RecipePage from './RecipePage';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

vi.mock('@capacitor-community/keep-awake', () => ({
	KeepAwake: {
		keepAwake: vi.fn(),
		allowSleep: vi.fn(),
	},
}));

vi.mock('@/recipe/assessRecipe', () => ({
	assessRecipe: vi.fn(() => Promise.resolve(() => {})),
}));

const URL = 'https://example.com/recipe';

// jsdom has no ResizeObserver; the split pane only needs it to exist, none of these tests
// assert on the layout it drives.
class SilentResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

describe('RecipePage', () => {
	beforeEach(() => {
		vi.stubGlobal('ResizeObserver', SilentResizeObserver);
		vi.mocked(KeepAwake.keepAwake).mockClear();
		vi.mocked(KeepAwake.allowSleep).mockClear();
		vi.mocked(assessRecipe).mockClear();
		vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
	});

	it('holds the screen awake for as long as the assessment is pending', () => {
		const store = createStore();
		render(
			<JotaiProvider store={store}>
				<RecipePage />
			</JotaiProvider>,
		);

		expect(KeepAwake.keepAwake).not.toHaveBeenCalled();

		act(() => store.set(mainStateAtom, createPrepareToAssessRecipeAction(URL, 'en')));

		expect(KeepAwake.keepAwake).toHaveBeenCalledTimes(1);
		expect(KeepAwake.allowSleep).not.toHaveBeenCalled();

		act(() => store.set(mainStateAtom, createRecipeAssessmentCompletedAction()));

		expect(KeepAwake.allowSleep).toHaveBeenCalledTimes(1);
	});

	it('offers to assess the same address again after the connection is interrupted', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = createStore();
		store.set(mainStateAtom, createPrepareToAssessRecipeAction(URL, 'el'));
		store.set(mainStateAtom, createRecipeAssessmentFailedAction(new Error('Load failed')));

		render(
			<JotaiProvider store={store}>
				<RecipePage />
			</JotaiProvider>,
		);

		expect(screen.getByText('recipe.assessmentInterrupted')).toBeTruthy();

		await act(async () => {
			fireEvent.click(screen.getByText('recipe.retry'));
		});

		expect(assessRecipe).toHaveBeenCalledWith(
			undefined,
			URL,
			'el',
			expect.any(Function),
			expect.any(Function),
			expect.any(Function),
		);
		expect(store.get(mainStateAtom).status).toBe('PENDING');
		warn.mockRestore();
	});

	it('leaves a failure reported by the server alone', () => {
		const store = createStore();
		store.set(mainStateAtom, createPrepareToAssessRecipeAction(URL, 'en'));
		store.set(mainStateAtom, {
			type: 'RecipeAssessmentErrorMessageReceivedAction',
			message: { type: 'ERROR', errors: ['No recipe found on that page'] },
		});

		render(
			<JotaiProvider store={store}>
				<RecipePage />
			</JotaiProvider>,
		);

		expect(screen.queryByText('recipe.assessmentInterrupted')).toBeNull();
	});
});
