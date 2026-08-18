import { atom } from 'jotai';
import { settingsAtom } from '@/settings/atoms';

export const onboardingSeenAtom = atom(
	(get) => get(settingsAtom).onboardingSeen,
	async (get, set, onboardingSeen: boolean) => {
		await set(settingsAtom, { ...get(settingsAtom), onboardingSeen });
	},
);
