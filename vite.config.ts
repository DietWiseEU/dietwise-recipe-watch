import { defineConfig, loadEnv } from 'vite';
import eslintPlugin from '@nabla/vite-plugin-eslint';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { configDefaults } from 'vitest/config';

function readAppVersion(): string {
	try {
		const packageJsonPath = path.resolve(process.cwd(), 'package.json');
		const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: unknown };
		return typeof packageJson.version === 'string' ? packageJson.version : '0.0.0';
	} catch (_e) {
		return '0.0.0';
	}
}

function readGitHash(env: Record<string, string>): string {
	if (env.VITE_GIT_HASH) {
		return env.VITE_GIT_HASH;
	}
	try {
		return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch (_e) {
		return 'unknown';
	}
}

/**
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const appVersion = readAppVersion();
	const gitHash = readGitHash(env);
	const includeMobilePreview = env.VITE_INCLUDE_MOBILE_PREVIEW === 'true';
	const basePath = (env.VITE_BASE_PATH || '/').replace(/\/?$/, '/');
	const input = {
		main: path.resolve(process.cwd(), 'index.html'),
		...(includeMobilePreview
			? {
					mobilePreview: path.resolve(process.cwd(), 'mobile-preview.html'),
				}
			: {}),
	};

	return {
		base: basePath,
		// The ESLint plugin leaves behind a worker thread that keeps the process alive, so it is
		// left out of test runs; `npm run lint` lints the whole project anyway.
		plugins: [react(), ...(mode === 'test' ? [] : [eslintPlugin()])],
		define: {
			__APP_VERSION__: JSON.stringify(appVersion),
			__APP_GIT_HASH__: JSON.stringify(gitHash),
		},
		resolve: {
			tsconfigPaths: true,
			alias: {
				'@': path.resolve('./src'),
			},
		},
		build: {
			// Set to {} to enable a watched build workflow, null to disable (default).
			watch: env.VITE_WATCH ? {} : null,
			rollupOptions: {
				input,
			},
		},
		test: {
			environment: 'jsdom', // Required for DOM-based tests
			globals: true, // So we can use describe/it/expect directly
			setupFiles: './src/setupTests.ts',
			exclude: [...configDefaults.exclude],
			coverage: {
				provider: 'v8',
				reporter: ['text', 'html'],
			},
		},
	};
});
