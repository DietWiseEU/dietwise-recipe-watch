import { Capacitor } from '@capacitor/core';
import { AppConfig, FALLBACK_APP_CONFIG } from './model';

function nonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const result = value.trim();
	return result.length > 0 ? result : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

/** An env value is a string; only `true` turns a flag on, anything else leaves it to the default. */
function enabledFlag(value: unknown): true | undefined {
	return value === 'true' ? true : undefined;
}

function readEnvConfig(): Partial<AppConfig> {
	return {
		authServerHost: nonEmptyString(import.meta.env.VITE_AUTH_SERVER_HOST),
		apiServerHost: nonEmptyString(import.meta.env.VITE_API_SERVER_HOST),
		logRating: enabledFlag(import.meta.env.VITE_LOG_RATING),
	};
}

async function readRuntimeConfig(): Promise<Partial<AppConfig>> {
	const basePath = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
	const configUrl = `${basePath}config.json`;
	try {
		const response = await fetch(configUrl, { cache: 'no-store' });
		if (!response.ok) {
			return {};
		}
		const json = (await response.json()) as Record<string, unknown>;
		return {
			authServerHost: nonEmptyString(json.authServerHost),
			apiServerHost: nonEmptyString(json.apiServerHost),
			logRating: booleanValue(json.logRating),
		};
	} catch (_e) {
		return {};
	}
}

/** The keys of a config source that carry a value; a key it leaves out keeps the value of an earlier source. */
function presentValues(config: Partial<AppConfig>): Partial<AppConfig> {
	return Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined));
}

export async function loadAppConfig(): Promise<AppConfig> {
	const runtimeConfig = Capacitor.isNativePlatform() ? {} : await readRuntimeConfig();
	return Object.assign({}, FALLBACK_APP_CONFIG, presentValues(readEnvConfig()), presentValues(runtimeConfig));
}
