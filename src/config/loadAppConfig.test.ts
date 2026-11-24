import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadAppConfig } from './loadAppConfig';

const ENV_AUTH_SERVER_HOST = 'https://auth.env.test/realms/dietwise';
const ENV_API_SERVER_HOST = 'https://api.env.test/api/v1';
const RUNTIME_API_SERVER_HOST = 'https://api.runtime.test/api/v1';

/** Serves the given object as the runtime config.json. */
function serveRuntimeConfig(config: Record<string, unknown>) {
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(config))));
}

describe('loadAppConfig', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('keeps the build-time value of a key missing from config.json', async () => {
		vi.stubEnv('VITE_AUTH_SERVER_HOST', ENV_AUTH_SERVER_HOST);
		vi.stubEnv('VITE_API_SERVER_HOST', ENV_API_SERVER_HOST);
		serveRuntimeConfig({ apiServerHost: RUNTIME_API_SERVER_HOST });

		const config = await loadAppConfig();

		expect(config.authServerHost).toBe(ENV_AUTH_SERVER_HOST);
		expect(config.apiServerHost).toBe(RUNTIME_API_SERVER_HOST);
	});

	it('falls back to the default of a key missing from both the build-time values and config.json', async () => {
		vi.stubEnv('VITE_AUTH_SERVER_HOST', undefined);
		vi.stubEnv('VITE_API_SERVER_HOST', ENV_API_SERVER_HOST);
		serveRuntimeConfig({});

		const config = await loadAppConfig();

		expect(config.authServerHost).toBe('http://localhost:8280/realms/dietwise');
		expect(config.apiServerHost).toBe(ENV_API_SERVER_HOST);
	});

	describe('logRating', () => {
		it('is enabled by config.json', async () => {
			serveRuntimeConfig({ logRating: true });

			const config = await loadAppConfig();

			expect(config.logRating).toBe(true);
		});

		it('is enabled by VITE_LOG_RATING', async () => {
			vi.stubEnv('VITE_LOG_RATING', 'true');
			serveRuntimeConfig({});

			const config = await loadAppConfig();

			expect(config.logRating).toBe(true);
		});

		it('is disabled by config.json even when VITE_LOG_RATING enables it', async () => {
			vi.stubEnv('VITE_LOG_RATING', 'true');
			serveRuntimeConfig({ logRating: false });

			const config = await loadAppConfig();

			expect(config.logRating).toBe(false);
		});

		it('is disabled when neither config.json nor VITE_LOG_RATING sets it', async () => {
			vi.stubEnv('VITE_LOG_RATING', undefined);
			serveRuntimeConfig({});

			const config = await loadAppConfig();

			expect(config.logRating).toBe(false);
		});
	});
});
