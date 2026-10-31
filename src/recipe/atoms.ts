import { atom, WritableAtom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';
import { createInitialState, reducer } from './reducer';
import { MainData } from './model';
import { MainAction } from './actions';

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
