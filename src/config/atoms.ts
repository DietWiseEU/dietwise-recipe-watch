import { atom } from 'jotai';
import type { AppConfig } from './model';

export const appConfigAtom = atom({} as AppConfig);

export const authServerHostAtom = atom((get) => get(appConfigAtom).authServerHost);

export const apiServerHostAtom = atom((get) => get(appConfigAtom).apiServerHost);

export const logRatingAtom = atom((get) => get(appConfigAtom).logRating);
