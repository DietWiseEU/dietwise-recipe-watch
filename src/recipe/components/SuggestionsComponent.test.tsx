import { fireEvent, render, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Intervention } from '@/recipe/model';
import { ASSESSMENT_ID, assess } from '@/recipe/testAssessment';
import SuggestionsComponent from './SuggestionsComponent';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

vi.mock('@/auth/authService', () => ({
	getValidAccessToken: vi.fn().mockResolvedValue('token-123'),
}));

const INTERVENTION_TEXT = 'Your future self will thank you for this simple swap - why not start now?';

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
