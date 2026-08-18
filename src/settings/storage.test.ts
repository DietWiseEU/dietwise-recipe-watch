import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { DEFAULT_SETTINGS } from './model';
import { loadSettings, saveSettings } from './storage';

vi.mock('capacitor-secure-storage-plugin', () => ({
	SecureStoragePlugin: {
		get: vi.fn(),
		set: vi.fn(() => Promise.resolve({ value: true })),
	},
}));

const get = vi.mocked(SecureStoragePlugin.get);
const set = vi.mocked(SecureStoragePlugin.set);

function stored(value: unknown) {
	get.mockResolvedValue({ value: JSON.stringify(value) });
}

describe('settings storage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('falls back to the defaults when nothing was ever stored', async () => {
		get.mockRejectedValue(new Error('no value'));

		await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
	});

	it('keeps the stored language', async () => {
		stored({ language: 'el', onboardingSeen: true });

		await expect(loadSettings()).resolves.toMatchObject({ language: 'el' });
	});

	it('shows the onboarding to users whose settings predate it', async () => {
		stored({ language: 'el' });

		await expect(loadSettings()).resolves.toMatchObject({ onboardingSeen: false });
	});

	it('remembers that the onboarding was already seen', async () => {
		stored({ language: 'en', onboardingSeen: true });

		await expect(loadSettings()).resolves.toMatchObject({ onboardingSeen: true });
	});

	it('ignores an onboarding flag that is not a boolean', async () => {
		stored({ language: 'en', onboardingSeen: 'yes' });

		await expect(loadSettings()).resolves.toMatchObject({ onboardingSeen: false });
	});

	it('writes the whole settings object under one key', async () => {
		await saveSettings({ language: 'nl', onboardingSeen: true });

		expect(set).toHaveBeenCalledWith({
			key: 'recipewatch.settings',
			value: JSON.stringify({ language: 'nl', onboardingSeen: true }),
		});
	});
});
