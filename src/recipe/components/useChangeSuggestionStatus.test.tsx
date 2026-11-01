import { act, renderHook } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mainStateAtom } from '@/recipe/atoms';
import { keyOfSuggestion } from '@/recipe/model';
import { ASSESSMENT_ID, OTHER_SUGGESTION, SUGGESTION, assess } from '@/recipe/testAssessment';
import { useChangeSuggestionStatus } from './useChangeSuggestionStatus';

vi.mock('@/auth/authService', () => ({
	getValidAccessToken: vi.fn().mockResolvedValue('token-123'),
}));

function renderChangeSuggestionStatus() {
	const store = createStore();
	assess(store, { id: 1, text: 'Healthiness guaranteed.' });
	const wrapper = ({ children }: { children: ReactNode }) => <JotaiProvider store={store}>{children}</JotaiProvider>;
	const { result } = renderHook(() => useChangeSuggestionStatus(), { wrapper });
	return { store, result };
}

describe('useChangeSuggestionStatus', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(() => Promise.resolve(new Response(null, { status: 204 }))),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('takes back the Suggestion accepted before for the same ingredient, and says so to the server', async () => {
		const { store, result } = renderChangeSuggestionStatus();

		await act(() => result.current.changeSuggestionStatus(keyOfSuggestion(SUGGESTION), 'ACCEPTED'));
		await act(() => result.current.changeSuggestionStatus(keyOfSuggestion(OTHER_SUGGESTION), 'ACCEPTED'));

		const suggestions = store.get(mainStateAtom).suggestions!;
		expect(suggestions[keyOfSuggestion(SUGGESTION)].status).toBe('UNDECIDED');
		expect(suggestions[keyOfSuggestion(OTHER_SUGGESTION)].status).toBe('ACCEPTED');
		expect(postedStatistics()).toEqual([
			['increaseTimesAccepted', { suggestionId: 's1', assessmentId: ASSESSMENT_ID }],
			['decreaseTimesAccepted', { suggestionId: 's1', assessmentId: ASSESSMENT_ID }],
			['increaseTimesAccepted', { suggestionId: 's2', assessmentId: ASSESSMENT_ID }],
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
