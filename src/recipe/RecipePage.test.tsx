import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { assessRecipe } from '@/recipe/assessRecipe';
import {
	createPrepareToAssessRecipeAction,
	createRecipeAssessmentCompletedAction,
	createRecipeAssessmentFailedAction,
} from '@/recipe/actions';
import { cookingModeAtom, mainStateAtom } from '@/recipe/atoms';
import { SUGGESTION, assess } from '@/recipe/testAssessment';
import RecipePage from './RecipePage';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: 'nl' },
	}),
	Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
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

vi.mock('@/auth/authService', () => ({
	getValidAccessToken: vi.fn().mockResolvedValue('token-123'),
}));

// The rating log is a development aid that prints to the console; it has no bearing on the page.
vi.mock('@/recipe/useLogRating', () => ({
	useLogRating: () => {},
}));

const URL = 'https://example.com/recipe';

function renderPage(store = createStore()) {
	render(
		<JotaiProvider store={store}>
			<RecipePage />
		</JotaiProvider>,
	);
	return store;
}

function toolbarCookingModeButton() {
	return document.querySelector('ion-header:not([collapse]) ion-toolbar ion-button.cooking-mode-toggle');
}

/** Once ion-button has loaded, it moves its aria-* attributes onto the native button inside it and keeps them in sync. */
function cookingModePressed() {
	const button = toolbarCookingModeButton();
	return (
		button?.getAttribute('aria-pressed') ??
		button?.shadowRoot?.querySelector('button')?.getAttribute('aria-pressed')
	);
}

function toastMessages() {
	return [...document.querySelectorAll('ion-toast')].map((toast) => (toast as HTMLIonToastElement).message);
}

describe('RecipePage', () => {
	beforeEach(() => {
		vi.mocked(KeepAwake.keepAwake).mockClear();
		vi.mocked(KeepAwake.allowSleep).mockClear();
		vi.mocked(assessRecipe).mockClear();
		vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		// Ionic presents toasts outside the rendered container, where cleanup does not reach
		document.querySelectorAll('ion-toast').forEach((toast) => toast.remove());
	});

	it('holds the screen awake for as long as the assessment is pending', () => {
		const store = renderPage();

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

		renderPage(store);

		expect(screen.getByText('recipe.assessmentInterrupted')).toBeTruthy();

		await act(async () => {
			fireEvent.click(screen.getByText('recipe.retry'));
		});

		expect(assessRecipe).toHaveBeenCalledWith(
			undefined,
			URL,
			'el',
			'nl',
			expect.any(Function),
			expect.any(Function),
			expect.any(Function),
		);
		expect(store.get(mainStateAtom).status).toBe('PENDING');
		warn.mockRestore();
	});

	it('is unmoved by a keep-alive arriving while the assessment runs', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = createStore();
		store.set(mainStateAtom, createPrepareToAssessRecipeAction(URL, 'en'));
		store.set(mainStateAtom, createRecipeAssessmentFailedAction(new Error('Load failed')));

		renderPage(store);
		await act(async () => {
			fireEvent.click(screen.getByText('recipe.retry'));
		});

		const onMessage = vi.mocked(assessRecipe).mock.calls[0][4];
		act(() => onMessage?.({ type: 'KEEP_ALIVE' }));

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

		renderPage(store);

		expect(screen.queryByText('recipe.assessmentInterrupted')).toBeNull();
	});

	it('shows the app icon beside the title in the toolbar', () => {
		renderPage();

		const title = document.querySelector('ion-header:not([collapse]) ion-title');
		expect(title?.textContent).toBe('recipe.title');
		expect(title?.querySelector('img')?.getAttribute('alt')).toBe('');
	});

	it('shows the recipe in a header in place of the address bar once it is known', () => {
		const store = createStore();
		assess(store);
		renderPage(store);

		expect(document.querySelector('.url-container')).toBeNull();
		expect(screen.getAllByText('omelet')).toHaveLength(1);
		expect(screen.getByText('https://example.test/recipe')).toBeTruthy();
	});

	it('shows the suggestions in one scrolling list with the ingredients', async () => {
		const store = createStore();
		assess(store);
		renderPage(store);

		const ingredient = screen.getByText('butter');
		const suggestion = await screen.findByRole('heading', { name: SUGGESTION.alternative });
		expect(document.querySelector('.split-pane')).toBeNull();
		expect(ingredient.closest('.recipe-page__scroll')).toBe(suggestion.closest('.recipe-page__scroll'));
		expect(ingredient.closest('.recipe-page__scroll')).not.toBeNull();
	});

	it('offers no cooking mode before there are suggestions', () => {
		renderPage();

		expect(toolbarCookingModeButton()).toBeNull();
	});

	it('offers cooking mode in the toolbar once there are suggestions', () => {
		const store = createStore();
		assess(store);
		renderPage(store);

		const button = toolbarCookingModeButton();
		expect(button?.textContent).toBe('recipe.keepScreenOn');
		expect(screen.getAllByText('recipe.keepScreenOn')).toHaveLength(1);
	});

	it('turns cooking mode on and off from the toolbar', async () => {
		const store = createStore();
		assess(store);
		renderPage(store);

		fireEvent.click(toolbarCookingModeButton()!);
		expect(store.get(cookingModeAtom)).toBe(true);
		await waitFor(() => expect(cookingModePressed()).toBe('true'));

		fireEvent.click(toolbarCookingModeButton()!);
		expect(store.get(cookingModeAtom)).toBe(false);
		await waitFor(() => expect(cookingModePressed()).toBe('false'));
	});

	it('confirms each change of cooking mode with a toast', async () => {
		const store = createStore();
		assess(store);
		renderPage(store);

		fireEvent.click(toolbarCookingModeButton()!);
		await waitFor(() => expect(toastMessages()).toEqual(['recipe.screenStaysOn']));

		fireEvent.click(toolbarCookingModeButton()!);
		// The second toast replaces the first while it is still showing
		await waitFor(() => expect(toastMessages().at(-1)).toBe('recipe.screenMaySleep'));
	});

	it('shows cooking mode off after another assessment', async () => {
		const store = createStore();
		assess(store);
		renderPage(store);
		fireEvent.click(toolbarCookingModeButton()!);
		await waitFor(() => expect(cookingModePressed()).toBe('true'));

		act(() => assess(store));

		await waitFor(() => expect(cookingModePressed()).toBe('false'));
	});
});
