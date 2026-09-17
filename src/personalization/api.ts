import { t } from 'i18next';
import type { PersonalInfo } from './model';

export async function fetchPersonalInfo(
	apiServerHost: string,
	accessToken: string,
	signal?: AbortSignal,
): Promise<PersonalInfo> {
	let response: Response;
	try {
		response = await fetch(apiServerHost + '/personal-info', {
			signal,
			headers: {
				Accepts: 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		});
	} catch (e) {
		console.error('Error fetching personal info', e);
		throw new Error(t('error.networkOrSystem'), { cause: e });
	}

	if (response.status === 204) return {};
	if (response.status === 200) {
		try {
			const personalInfo = (await response.json()) as PersonalInfo;
			return personalInfo;
		} catch (e) {
			console.error('Error parsing personal info', e);
			throw new Error(t('error.networkOrSystem'), { cause: e });
		}
	}
	if (response.status === 401) {
		console.error('Unauthenticated to fetch personal info');
		throw new Error(t('error.401'));
	}
	console.error(`HTTP error ${response.status} to fetch personal info`);
	throw new Error(t('error.unknown'));
}

export async function savePersonalInfo(apiServerHost: string, accessToken: string, value: PersonalInfo): Promise<void> {
	let response: Response;
	try {
		response = await fetch(apiServerHost + '/personal-info', {
			method: 'POST',
			body: JSON.stringify(value),
			headers: {
				Accepts: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		});
	} catch (e) {
		console.error('Error saving personal info', e);
		throw new Error(t('error.networkOrSystem'), { cause: e });
	}

	if (response.status === 204 || response.status === 200) {
		return;
	}
	if (response.status === 401) {
		console.error('Unauthenticated to save personal info');
		throw new Error(t('error.401'));
	}
	console.error(`HTTP error ${response.status} to save personal info`);
	throw new Error(t('error.unknown'));
}
