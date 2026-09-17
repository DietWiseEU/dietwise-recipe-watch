import { StrictMode } from 'react';
import { setupIonicReact } from '@ionic/react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { appConfigAtom } from '@/config/atoms';
import { loadAppConfig } from '@/config/loadAppConfig';
import { loadSettings } from '@/settings/storage';
import { configureI18n } from './i18n';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { settingsAtom } from '@/settings/atoms';
import { authService, configureServerHost as configureAuthServerHost } from '@/auth/authService';
import { LOG_SENSITIVE_DATA } from '@/common/logging';

async function bootstrap() {
	// innerHTMLTemplatesEnabled: true to display rich text in the info alerts of the suggestions
	setupIonicReact({ innerHTMLTemplatesEnabled: true });
	// configure the application before launching the UI
	const [initialSettings, initialAppConfig] = await Promise.all([loadSettings(), loadAppConfig()]);
	configureAuthServerHost(initialAppConfig.authServerHost);
	const [_t, _l] = await Promise.all([
		configureI18n(initialSettings.language), // returns t, if we ever want to use it here
		authService.init().catch((reason) => {
			if (LOG_SENSITIVE_DATA) {
				console.log('authService initialization failed', reason);
			}
			throw reason;
		}),
	]);
	try {
		await authService.loadTokenFromStorage();
		try {
			// Ensure we have a fresh access token before attempting to load user info.
			await authService.getValidToken(0);
			await authService.loadUserInfo();
		} catch (reason) {
			if (LOG_SENSITIVE_DATA) {
				console.warn('Unable to refresh token or load user info on startup', reason);
			}
		}
	} catch (reason) {
		if (LOG_SENSITIVE_DATA) {
			console.warn('Load token from storage failed', reason);
		}
	}
	const jotaiStore = createStore();
	jotaiStore.set(appConfigAtom, initialAppConfig);
	jotaiStore.set(settingsAtom, initialSettings);
	// launch the UI, remember to keep the JotaiProvider outside of React.StrictMode
	const container = document.getElementById('root');
	const root = createRoot(container!);
	root.render(
		<JotaiProvider store={jotaiStore}>
			<StrictMode>
				<App />
			</StrictMode>
		</JotaiProvider>,
	);
}

bootstrap();
