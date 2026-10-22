import { getValidAccessToken } from '@/auth/authService';
import { postSuggestionStatistics } from '@/recipe/api';
import type { StatisticsParam, SuggestionStatus } from '@/recipe/model';
import type { StatisticsAction } from '@/recipe/api';

const SUGGESTION_STATISTICS_TIMEOUT_MS = 8000;

export function statisticsActionsForSuggestionTransition(
	currentStatus: SuggestionStatus,
	nextStatus: SuggestionStatus,
): StatisticsAction[] {
	const statisticsActions: StatisticsAction[] = [];

	if (currentStatus === 'ACCEPTED' && nextStatus !== 'ACCEPTED') {
		statisticsActions.push('decreaseTimesAccepted');
	}
	if (currentStatus === 'REJECTED' && nextStatus !== 'REJECTED') {
		statisticsActions.push('decreaseTimesRejected');
	}
	if (currentStatus !== 'ACCEPTED' && nextStatus === 'ACCEPTED') {
		statisticsActions.push('increaseTimesAccepted');
	}
	if (currentStatus !== 'REJECTED' && nextStatus === 'REJECTED') {
		statisticsActions.push('increaseTimesRejected');
	}

	return statisticsActions;
}

export async function notifySuggestionStatistics(
	apiServerHost: string,
	statisticsParam: StatisticsParam,
	currentStatus: SuggestionStatus,
	nextStatus: SuggestionStatus,
) {
	const statisticsActions = statisticsActionsForSuggestionTransition(currentStatus, nextStatus);
	if (!statisticsActions.length) {
		return;
	}

	const accessToken = await getValidAccessToken();
	if (!accessToken) {
		return;
	}

	for (const statisticsAction of statisticsActions) {
		await postSuggestionStatistics(apiServerHost, accessToken, statisticsAction, statisticsParam);
	}
}

export async function waitForSuggestionStatisticsWithTimeout(
	apiServerHost: string,
	statisticsParam: StatisticsParam,
	currentStatus: SuggestionStatus,
	nextStatus: SuggestionStatus,
) {
	await Promise.race([
		notifySuggestionStatistics(apiServerHost, statisticsParam, currentStatus, nextStatus),
		new Promise<void>((_, reject) => {
			window.setTimeout(
				() => reject(new Error('Suggestion statistics timeout')),
				SUGGESTION_STATISTICS_TIMEOUT_MS,
			);
		}),
	]);
}
