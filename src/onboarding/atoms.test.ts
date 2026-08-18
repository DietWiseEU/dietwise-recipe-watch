import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createStore } from 'jotai';
import { settingsAtom } from '@/settings/atoms';
import { saveSettings } from '@/settings/storage';
import { onboardingSeenAtom } from './atoms';

vi.mock('@/settings/storage', () => ({
	saveSettings: vi.fn(() => Promise.resolve()),
}));

describe('onboardingSeenAtom', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the flag out of the settings', async () => {
		const store = createStore();
		await store.set(settingsAtom, { language: 'en', onboardingSeen: true });

		expect(store.get(onboardingSeenAtom)).toBe(true);
	});

	it('persists the flag without losing the other settings', async () => {
		const store = createStore();
		await store.set(settingsAtom, { language: 'el', onboardingSeen: false });
		vi.mocked(saveSettings).mockClear();

		await store.set(onboardingSeenAtom, true);

		expect(store.get(onboardingSeenAtom)).toBe(true);
		expect(saveSettings).toHaveBeenCalledWith({ language: 'el', onboardingSeen: true });
	});
});
