import { isPlatform } from '@ionic/react';
import { AuthActions, AuthService } from 'ionic-appauth';
import { CapacitorBrowser, CapacitorSecureStorage } from 'ionic-appauth/lib/capacitor';
import { RequestorImpl } from '@/services/RequestorImpl';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { MobilePreviewAwareBrowser } from '@/auth/mobilePreviewAuth';
import { LOG_SENSITIVE_DATA } from '@/common/logging';

const browser = isPlatform('capacitor') ? new CapacitorBrowser() : new MobilePreviewAwareBrowser();

export const authService = new AuthService(browser, new CapacitorSecureStorage(), new RequestorImpl());

let hasTokenInMemory = false;
let lastResumeRefreshAt = 0;
let resumeRefreshInFlight: Promise<void> | null = null;
const RESUME_REFRESH_MIN_INTERVAL_MS = 10 * 60 * 1000;
const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const webRedirectBase = window.location.origin + (basePath === '' ? '' : basePath);
const nativeRedirectScheme = 'eu.dietwise.recipewatch';

// Configure the service (snake_case keys!)
authService.authConfig = {
	client_id: 'recipewatch',
	server_host: '',
	redirect_url: isPlatform('capacitor')
		? `${nativeRedirectScheme}://authcallback`
		: `${webRedirectBase}/authcallback`,
	end_session_redirect_url: isPlatform('capacitor')
		? `${nativeRedirectScheme}://endsession`
		: `${webRedirectBase}/endsession`,
	scopes: 'openid profile email offline_access',
	pkce: true,
};

authService.events$.subscribe({
	next(action) {
		if (
			action.action === AuthActions.LoadTokenFromStorageSuccess ||
			action.action === AuthActions.RefreshSuccess ||
			action.action === AuthActions.SignInSuccess
		) {
			hasTokenInMemory = true;
		}
		if (
			action.action === AuthActions.SignOutSuccess ||
			action.action === AuthActions.RevokeTokensSuccess ||
			action.action === AuthActions.LoadTokenFromStorageFailed
		) {
			hasTokenInMemory = false;
		}
	},
});

if (isPlatform('capacitor')) {
	App.addListener('appUrlOpen', (data: URLOpenListenerEvent) => {
		if (data.url.indexOf(authService.authConfig.redirect_url) === 0) {
			authService.authorizationCallback(data.url);
		} else {
			authService.endSessionCallback();
		}
	});
	App.addListener('appStateChange', async ({ isActive }) => {
		if (!isActive) {
			return;
		}
		if (!hasTokenInMemory) {
			return;
		}
		const now = Date.now();
		if (now - lastResumeRefreshAt < RESUME_REFRESH_MIN_INTERVAL_MS) {
			return;
		}
		if (resumeRefreshInFlight) {
			await resumeRefreshInFlight;
			return;
		}
		try {
			resumeRefreshInFlight = authService.getValidToken(0).then(() => {
				lastResumeRefreshAt = Date.now();
			});
			await resumeRefreshInFlight;
		} catch (err) {
			if (LOG_SENSITIVE_DATA) {
				console.warn('Unable to refresh token on resume', err);
			}
		} finally {
			resumeRefreshInFlight = null;
		}
	});
}

export function configureServerHost(serverHost: string) {
	authService.authConfig.server_host = serverHost;
}

export async function getValidAccessToken(): Promise<string | undefined> {
	try {
		const tokenResponse = await authService.getValidToken(0);
		return tokenResponse?.accessToken;
	} catch (err) {
		// TODO Check HTTP response/whatever for expired refresh token and prompt to login again
		if (LOG_SENSITIVE_DATA) {
			console.error('Unable to obtain valid access token', err);
		}
		return undefined;
	}
}
