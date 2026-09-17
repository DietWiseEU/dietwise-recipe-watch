import { t } from 'i18next';
import type { StatisticsParam } from './model';

export type StatisticsAction =
	'increaseTimesAccepted' | 'decreaseTimesAccepted' | 'increaseTimesRejected' | 'decreaseTimesRejected';

export async function postSuggestionStatistics(
	apiServerHost: string,
	accessToken: string,
	statisticsAction: StatisticsAction,
	statisticsParam: StatisticsParam,
): Promise<void> {
	let response: Response;
	try {
		response = await fetch(apiServerHost + '/statistics/' + statisticsAction, {
			method: 'POST',
			body: JSON.stringify(statisticsParam),
			headers: {
				Accepts: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		});
	} catch (e) {
		console.error(`Error posting suggestion statistics for ${statisticsAction}`, e);
		throw new Error(t('error.networkOrSystem'), { cause: e });
	}

	if (response.status === 204 || response.status === 200) {
		return;
	}
	if (response.status === 401) {
		console.error(`Unauthenticated to post suggestion statistics for ${statisticsAction}`);
		throw new Error(t('error.401'));
	}
	console.error(`HTTP error ${response.status} to post suggestion statistics for ${statisticsAction}`);
	throw new Error(t('error.unknown'));
}
