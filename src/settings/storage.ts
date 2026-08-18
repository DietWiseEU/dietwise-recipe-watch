import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Settings, DEFAULT_SETTINGS } from './model';

const SETTINGS_KEY = 'recipewatch.settings';

function mergeLoadedSettings(value: unknown): Settings {
	if (!value || typeof value !== 'object') {
		return DEFAULT_SETTINGS;
	}
	const { language, onboardingSeen } = value as { language?: unknown; onboardingSeen?: unknown };
	return {
		...DEFAULT_SETTINGS,
		language: typeof language === 'string' && language.length > 0 ? language : DEFAULT_SETTINGS.language,
		onboardingSeen: typeof onboardingSeen === 'boolean' ? onboardingSeen : DEFAULT_SETTINGS.onboardingSeen,
	};
}

export async function loadSettings(): Promise<Settings> {
	let result = DEFAULT_SETTINGS;
	try {
		const { value } = await SecureStoragePlugin.get({ key: SETTINGS_KEY });
		if (value) {
			result = mergeLoadedSettings(JSON.parse(value));
		}
	} catch (_e) {
		// fallback to default, already assigned
	}
	return result;
}

export async function saveSettings(settings: Settings): Promise<void> {
	return SecureStoragePlugin.set({ key: SETTINGS_KEY, value: JSON.stringify(settings) }).then(() => {});
}
