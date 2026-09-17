import type { Atom } from 'jotai';
import { atomWithObservable } from 'jotai/utils';
import { catchError, filter, from, map, switchMap, BehaviorSubject } from 'rxjs';
import { AuthActions } from 'ionic-appauth';
import type { TokenResponse } from '@openid/appauth';
import { authService } from '@/auth/authService';
import type { User } from './model';
import { LOG_SENSITIVE_DATA } from '@/common/logging';

// Just for debugging, maybe remove for production
authService.events$.subscribe({
	next(action) {
		if (LOG_SENSITIVE_DATA) {
			console.log('AUTH EVENT', action);
		}
	},
	error(err) {
		if (LOG_SENSITIVE_DATA) {
			console.error('AUTH ERROR', err);
		}
	},
});

const tokenEventsSubject = new BehaviorSubject<TokenResponse | undefined>(undefined);
authService.events$
	.pipe(
		filter(
			(event) =>
				event.action === AuthActions.LoadTokenFromStorageSuccess ||
				event.action === AuthActions.RefreshSuccess ||
				event.action === AuthActions.SignInSuccess,
		),
		map((event) => event.tokenResponse),
	)
	.subscribe(tokenEventsSubject);

export const accessTokenAtom = atomWithObservable(() =>
	tokenEventsSubject.pipe(map((tokenResponse) => tokenResponse?.accessToken)),
);

export const refreshTokenAtom = atomWithObservable(() =>
	tokenEventsSubject.pipe(map((tokenResponse) => tokenResponse?.refreshToken)),
);

authService.events$
	.pipe(
		filter(
			(action) =>
				action.action === AuthActions.LoadTokenFromStorageSuccess ||
				action.action === AuthActions.SignInSuccess,
		),
		switchMap(() => from(authService.getValidToken(0))),
		switchMap(() => from(authService.loadUserInfo())),
		map(() => ['SUCCESS', null]),
		catchError((err) => ['FAILURE', err]),
	)
	.subscribe({
		next([outcome, err]) {
			if (err && LOG_SENSITIVE_DATA) {
				// The err signals a system error; if the app simply fails to load user info,
				// e.g. due to token expired, we succeed above, and we only get the relevant
				// message in the authService.events$ stream.
				console.log('Load user info after loading the token from storage: ', outcome, err);
			}
		},
	});

export const userAtom: Atom<User> = atomWithObservable(() => authService.user$);
