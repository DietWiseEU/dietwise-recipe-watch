import { atom, WritableAtom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';
import { createInitialState, reducer } from './reducer';
import { MainData } from './model';
import { MainAction } from './actions';
import { settingsAtom } from '@/settings/atoms';

export const mainStateAtom: WritableAtom<MainData, [MainAction], void> = atomWithReducer(createInitialState(), reducer);

export const suggestionInFlightAtom = atom<Record<string, boolean>>({});

// The suggestions that cooking mode was turned on for. Each assessment produces a fresh suggestionKeys array that
// accepting or rejecting leaves untouched, so cooking mode stays on while the user decides on the suggestions and goes
// off when another assessment brings new ones, or when the page is reset.
const cookingModeSuggestionKeysAtom = atom<string[] | undefined>(undefined);

export const cookingModeAtom = atom(
	(get) => {
		const suggestionKeys = get(mainStateAtom).suggestionKeys;
		return suggestionKeys !== undefined && get(cookingModeSuggestionKeysAtom) === suggestionKeys;
	},
	(get, set, on: boolean) => {
		set(cookingModeSuggestionKeysAtom, on ? get(mainStateAtom).suggestionKeys : undefined);
	},
);

/** Whether accepting an alternative, or rejecting the last one, opens the next ingredient; kept in the settings. */
export const autoAdvanceAtom = atom(
	(get) => get(settingsAtom).autoAdvance,
	async (get, set, autoAdvance: boolean) => {
		await set(settingsAtom, { ...get(settingsAtom), autoAdvance });
	},
);
