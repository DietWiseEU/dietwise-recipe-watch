import { fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { describe, expect, it, vi } from 'vitest';
import {
	createMessageReceivedAction,
	createPrepareToAssessRecipeAction,
	createRecipeAssessmentFailedAction,
} from '@/recipe/actions';
import { mainStateAtom } from '@/recipe/atoms';
import { SUGGESTION, assess } from '@/recipe/testAssessment';
import AssessmentFailure from './AssessmentFailure';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

const URL = 'https://example.test/recipe';

function renderFailure(store: ReturnType<typeof createStore>, onTryAnotherAddress = vi.fn(), onRetry = vi.fn()) {
	render(
		<JotaiProvider store={store}>
			<AssessmentFailure onTryAnotherAddress={onTryAnotherAddress} onRetry={onRetry} />
		</JotaiProvider>,
	);
}

function storeWithServerErrors(...errors: string[]) {
	const store = createStore();
	store.set(mainStateAtom, createPrepareToAssessRecipeAction(URL, 'en'));
	store.set(mainStateAtom, createMessageReceivedAction({ type: 'ERROR', errors })!);
	return store;
}

function storeWithInterruption() {
	const store = createStore();
	store.set(mainStateAtom, createPrepareToAssessRecipeAction(URL, 'en'));
	store.set(mainStateAtom, createRecipeAssessmentFailedAction(new Error('Load failed')));
	return store;
}

describe('AssessmentFailure', () => {
	it('lists the errors the server reported', () => {
		renderFailure(storeWithServerErrors('No recipe found on that page', 'Try again later'));

		expect(screen.getByRole('heading').textContent).toBe('recipe.encounteredErrors');
		expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
			'No recipe found on that page',
			'Try again later',
		]);
	});

	it('tells the user the connection was interrupted', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		renderFailure(storeWithInterruption());

		expect(screen.getByText('recipe.assessmentInterrupted')).toBeTruthy();
		expect(warn).toHaveBeenCalledWith('The recipe assessment was interrupted', expect.any(Error));
		warn.mockRestore();
	});

	it('tells the user the connection was interrupted after the suggestions arrived', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = createStore();
		store.set(mainStateAtom, createPrepareToAssessRecipeAction(URL, 'en'));
		store.set(mainStateAtom, createMessageReceivedAction({ type: 'SUGGESTIONS', suggestions: [SUGGESTION] })!);
		store.set(mainStateAtom, createRecipeAssessmentFailedAction(new Error('Load failed')));
		renderFailure(store);

		expect(screen.getByText('recipe.assessmentInterrupted')).toBeTruthy();
		warn.mockRestore();
	});

	it('says nothing of the errors the server reported once there are suggestions', () => {
		const store = createStore();
		store.set(mainStateAtom, createPrepareToAssessRecipeAction(URL, 'en'));
		store.set(mainStateAtom, createMessageReceivedAction({ type: 'SUGGESTIONS', suggestions: [SUGGESTION] })!);
		store.set(mainStateAtom, createMessageReceivedAction({ type: 'ERROR', errors: ['Scoring failed'] })!);
		renderFailure(store);

		expect(screen.queryByText('Scoring failed')).toBeNull();
		expect(screen.queryByRole('heading')).toBeNull();
	});

	it('shows nothing when nothing went wrong', () => {
		const store = createStore();
		assess(store);
		renderFailure(store);

		expect(screen.queryByRole('heading')).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('offers another address', () => {
		const onTryAnotherAddress = vi.fn();
		const onRetry = vi.fn();
		renderFailure(storeWithServerErrors('No recipe found on that page'), onTryAnotherAddress, onRetry);

		fireEvent.click(screen.getByText('recipe.tryAnotherAddress'));

		expect(onTryAnotherAddress).toHaveBeenCalledTimes(1);
		expect(onRetry).not.toHaveBeenCalled();
	});

	it('retries when the button is pressed', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const onTryAnotherAddress = vi.fn();
		const onRetry = vi.fn();
		renderFailure(storeWithInterruption(), onTryAnotherAddress, onRetry);

		fireEvent.click(screen.getByText('recipe.retry'));

		expect(onRetry).toHaveBeenCalledTimes(1);
		expect(onTryAnotherAddress).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});
