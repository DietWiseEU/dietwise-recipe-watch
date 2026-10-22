import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assessRecipe } from './assessRecipe';

vi.mock('@/auth/authService', () => ({
	getValidAccessToken: vi.fn().mockResolvedValue('token-123'),
}));

const apiServerHost = 'http://example.com';

describe('assessRecipe', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('sends the language of the user interface along with the recipe language', async () => {
		await assessRecipe(apiServerHost, 'https://example.test/recipe', 'nl', 'el');

		await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
		const [url, init] = vi.mocked(fetch).mock.calls[0];
		expect(url).toBe(apiServerHost + '/recipe/assess/url');
		expect(JSON.parse(init?.body as string)).toEqual({
			url: 'https://example.test/recipe',
			lang: 'nl',
			uiLang: 'el',
		});
	});
});
