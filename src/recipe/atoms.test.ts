import { createStore } from 'jotai';
import { describe, expect, it, vi } from 'vitest';
import { createResetMainPageAction, createSuggestionStatusAction } from '@/recipe/actions';
import { autoAdvanceAtom, cookingModeAtom, mainStateAtom } from '@/recipe/atoms';
import { keyOfSuggestion } from '@/recipe/model';
import { SUGGESTION, assess } from '@/recipe/testAssessment';
import { settingsAtom } from '@/settings/atoms';
import { saveSettings } from '@/settings/storage';

vi.mock('@/settings/storage', () => ({
	saveSettings: vi.fn(() => Promise.resolve()),
}));

function assessedStoreInCookingMode() {
	const store = createStore();
	assess(store);
	store.set(cookingModeAtom, true);
	return store;
}

describe('cookingModeAtom', () => {
	it('is off before any assessment', () => {
		expect(createStore().get(cookingModeAtom)).toBe(false);
	});

	it('cannot be turned on while there are no suggestions', () => {
		const store = createStore();

		store.set(cookingModeAtom, true);

		expect(store.get(cookingModeAtom)).toBe(false);
	});

	it('turns on and off for the suggestions of an assessment', () => {
		const store = assessedStoreInCookingMode();
		expect(store.get(cookingModeAtom)).toBe(true);

		store.set(cookingModeAtom, false);

		expect(store.get(cookingModeAtom)).toBe(false);
	});

	it('stays on when a suggestion is accepted', () => {
		const store = assessedStoreInCookingMode();

		store.set(mainStateAtom, createSuggestionStatusAction(keyOfSuggestion(SUGGESTION), 'ACCEPTED'));

		expect(store.get(cookingModeAtom)).toBe(true);
	});

	it('turns off when another assessment brings new suggestions', () => {
		const store = assessedStoreInCookingMode();

		assess(store);

		expect(store.get(cookingModeAtom)).toBe(false);
	});

	it('turns off when the page is reset', () => {
		const store = assessedStoreInCookingMode();

		store.set(mainStateAtom, createResetMainPageAction());

		expect(store.get(cookingModeAtom)).toBe(false);
	});
});

describe('autoAdvanceAtom', () => {
	it('reads the preference out of the settings', async () => {
		const store = createStore();
		await store.set(settingsAtom, { language: 'en', onboardingSeen: true, autoAdvance: false });

		expect(store.get(autoAdvanceAtom)).toBe(false);
	});

	it('saves the preference without losing the other settings', async () => {
		const store = createStore();
		await store.set(settingsAtom, { language: 'el', onboardingSeen: true, autoAdvance: true });
		vi.mocked(saveSettings).mockClear();

		await store.set(autoAdvanceAtom, false);

		expect(store.get(autoAdvanceAtom)).toBe(false);
		expect(saveSettings).toHaveBeenCalledWith({ language: 'el', onboardingSeen: true, autoAdvance: false });
	});
});
