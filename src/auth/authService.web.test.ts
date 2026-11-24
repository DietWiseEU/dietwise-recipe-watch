import { expect, it, vi } from 'vitest';
import { AuthActions } from 'ionic-appauth';
import { filter, firstValueFrom } from 'rxjs';
import { restartApp } from '@/common/restartApp';
import { authService } from './authService';

vi.mock('@/common/restartApp', () => ({ restartApp: vi.fn() }));

it('leaves the web app to load afresh on its own after the sign-out, as it returns from the identity server', async () => {
	const signedOut = firstValueFrom(
		authService.events$.pipe(filter((action) => action.action === AuthActions.SignOutSuccess)),
	);

	authService.endSessionCallback();
	await signedOut;

	expect(restartApp).not.toHaveBeenCalled();
});
