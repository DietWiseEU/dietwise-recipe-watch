import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { getValidAccessToken } from '@/auth/authService';
import { postSuggestionStatistics } from '@/recipe/api';
import {
	notifySuggestionStatistics,
	statisticsActionsForSuggestionTransition,
	waitForSuggestionStatisticsWithTimeout,
} from './suggestionsStatisticsUtils';

const ASSESSMENT_ID = '3e0c7a52-1b6d-4f8e-9a2c-5d4b3a2f1e0d';

vi.mock('@/auth/authService', () => ({
	getValidAccessToken: vi.fn(),
}));

vi.mock('@/recipe/api', async () => {
	const actual = await vi.importActual<typeof import('@/recipe/api')>('@/recipe/api');
	return {
		...actual,
		postSuggestionStatistics: vi.fn(),
	};
});

describe('statisticsActionsForSuggestionTransition', () => {
	beforeEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns no actions when status stays undecided', () => {
		expect(statisticsActionsForSuggestionTransition('UNDECIDED', 'UNDECIDED')).toEqual([]);
	});

	it('increases accepted when moving from undecided to accepted', () => {
		expect(statisticsActionsForSuggestionTransition('UNDECIDED', 'ACCEPTED')).toEqual(['increaseTimesAccepted']);
	});

	it('increases rejected when moving from undecided to rejected', () => {
		expect(statisticsActionsForSuggestionTransition('UNDECIDED', 'REJECTED')).toEqual(['increaseTimesRejected']);
	});

	it('decreases accepted when moving from accepted to undecided', () => {
		expect(statisticsActionsForSuggestionTransition('ACCEPTED', 'UNDECIDED')).toEqual(['decreaseTimesAccepted']);
	});

	it('decreases rejected when moving from rejected to undecided', () => {
		expect(statisticsActionsForSuggestionTransition('REJECTED', 'UNDECIDED')).toEqual(['decreaseTimesRejected']);
	});

	it('decreases rejected before increasing accepted when moving from rejected to accepted', () => {
		expect(statisticsActionsForSuggestionTransition('REJECTED', 'ACCEPTED')).toEqual([
			'decreaseTimesRejected',
			'increaseTimesAccepted',
		]);
	});

	it('decreases accepted before increasing rejected when moving from accepted to rejected', () => {
		expect(statisticsActionsForSuggestionTransition('ACCEPTED', 'REJECTED')).toEqual([
			'decreaseTimesAccepted',
			'increaseTimesRejected',
		]);
	});

	it('notifySuggestionStatistics skips auth and POST when transition emits no actions', async () => {
		await notifySuggestionStatistics('http://example.com', { suggestionId: 's-1' }, 'UNDECIDED', 'UNDECIDED');

		expect(getValidAccessToken).not.toHaveBeenCalled();
		expect(postSuggestionStatistics).not.toHaveBeenCalled();
	});

	it('notifySuggestionStatistics skips POST when access token is unavailable', async () => {
		vi.mocked(getValidAccessToken).mockResolvedValue(undefined);

		await notifySuggestionStatistics('http://example.com', { suggestionId: 's-1' }, 'UNDECIDED', 'ACCEPTED');

		expect(getValidAccessToken).toHaveBeenCalledOnce();
		expect(postSuggestionStatistics).not.toHaveBeenCalled();
	});

	it('notifySuggestionStatistics posts all actions in transition order', async () => {
		vi.mocked(getValidAccessToken).mockResolvedValue('token-123');
		const events: string[] = [];
		vi.mocked(postSuggestionStatistics).mockImplementation(async (_host, _token, action) => {
			events.push(action);
		});

		await notifySuggestionStatistics('http://example.com', { suggestionId: 's-1' }, 'REJECTED', 'ACCEPTED');

		expect(getValidAccessToken).toHaveBeenCalledOnce();
		expect(postSuggestionStatistics).toHaveBeenCalledTimes(2);
		expect(postSuggestionStatistics).toHaveBeenNthCalledWith(
			1,
			'http://example.com',
			'token-123',
			'decreaseTimesRejected',
			{ suggestionId: 's-1' },
		);
		expect(postSuggestionStatistics).toHaveBeenNthCalledWith(
			2,
			'http://example.com',
			'token-123',
			'increaseTimesAccepted',
			{ suggestionId: 's-1' },
		);
		expect(events).toEqual(['decreaseTimesRejected', 'increaseTimesAccepted']);
	});

	it('notifySuggestionStatistics posts the assessmentId with every action', async () => {
		vi.mocked(getValidAccessToken).mockResolvedValue('token-123');

		await notifySuggestionStatistics(
			'http://example.com',
			{ suggestionId: 's-1', assessmentId: ASSESSMENT_ID },
			'ACCEPTED',
			'REJECTED',
		);

		expect(postSuggestionStatistics).toHaveBeenCalledTimes(2);
		expect(postSuggestionStatistics).toHaveBeenNthCalledWith(
			1,
			'http://example.com',
			'token-123',
			'decreaseTimesAccepted',
			{ suggestionId: 's-1', assessmentId: ASSESSMENT_ID },
		);
		expect(postSuggestionStatistics).toHaveBeenNthCalledWith(
			2,
			'http://example.com',
			'token-123',
			'increaseTimesRejected',
			{ suggestionId: 's-1', assessmentId: ASSESSMENT_ID },
		);
	});

	it('waitForSuggestionStatisticsWithTimeout resolves when notification finishes before timeout', async () => {
		vi.useFakeTimers();
		vi.mocked(getValidAccessToken).mockResolvedValue('token-123');
		vi.mocked(postSuggestionStatistics).mockResolvedValue(undefined);

		const promise = waitForSuggestionStatisticsWithTimeout(
			'http://example.com',
			{ suggestionId: 's-1' },
			'UNDECIDED',
			'ACCEPTED',
		);
		await vi.runAllTimersAsync();

		await expect(promise).resolves.toBeUndefined();
	});

	it('waitForSuggestionStatisticsWithTimeout rejects when notification hangs past timeout', async () => {
		vi.useFakeTimers();
		vi.mocked(getValidAccessToken).mockResolvedValue('token-123');
		vi.mocked(postSuggestionStatistics).mockImplementation(
			() =>
				new Promise<void>(() => {
					// Intentionally unresolved to exercise timeout behavior.
				}),
		);

		const promise = waitForSuggestionStatisticsWithTimeout(
			'http://example.com',
			{ suggestionId: 's-1' },
			'UNDECIDED',
			'ACCEPTED',
		);
		const expectation = expect(promise).rejects.toThrow('Suggestion statistics timeout');
		await vi.advanceTimersByTimeAsync(8000);

		await expectation;
	});
});
