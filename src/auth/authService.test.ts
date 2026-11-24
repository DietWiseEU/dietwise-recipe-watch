import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CapacitorBrowser } from 'ionic-appauth/lib/capacitor';
import { restartApp } from '@/common/restartApp';
import { authService } from './authService';

vi.mock('@ionic/react', async (importOriginal) => ({
	...(await importOriginal<typeof import('@ionic/react')>()),
	isPlatform: (platform: string) => platform === 'capacitor',
}));

vi.mock('@/common/restartApp', () => ({ restartApp: vi.fn() }));

beforeEach(() => {
	// On a device this closes the in-app browser that showed the identity server; the web build of the Capacitor
	// plugin rejects closing a browser it never opened.
	vi.spyOn(CapacitorBrowser.prototype, 'closeWindow').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.mocked(restartApp).mockClear();
});

it('restarts the native app once the sign-out completes, to forget everything of the signed-out user', async () => {
	authService.endSessionCallback();

	await vi.waitFor(() => expect(restartApp).toHaveBeenCalledTimes(1));
});
