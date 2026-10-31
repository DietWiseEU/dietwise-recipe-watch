import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import el from '@/i18n/el.json';
import en from '@/i18n/en.json';
import lt from '@/i18n/lt.json';
import nl from '@/i18n/nl.json';
import HelpContentsComponent from './HelpContentsComponent';

const { requestedKeys } = vi.hoisted(() => ({ requestedKeys: [] as string[] }));

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			requestedKeys.push(key);
			return key;
		},
	}),
}));

describe('HelpContentsComponent', () => {
	it('opens with a title and an introduction', () => {
		const { container } = render(<HelpContentsComponent />);

		expect(container.querySelector('.help__title')?.textContent).toBe('recipe.help.title');
		expect(container.querySelector('.help__intro')?.textContent).toBe('recipe.help.intro');
	});

	it('keeps the steps exposed as a list where the markers are suppressed', () => {
		const { container } = render(<HelpContentsComponent />);

		// Safari drops the implicit list role from a list-style: none list, so it has to be stated.
		expect(container.querySelector('.help__steps')?.getAttribute('role')).toBe('list');
	});

	it('lays the help out as four numbered steps', () => {
		const { container } = render(<HelpContentsComponent />);

		const titles = [...container.querySelectorAll('.help__step .help__step-title')].map((e) => e.textContent);
		expect(titles).toEqual([
			'recipe.help.enterLinkTitle',
			'recipe.help.twoStepsTitle',
			'recipe.help.reviewSuggestionsTitle',
			'recipe.help.understandScoreTitle',
		]);
	});

	it('highlights the cost and control notes as callouts', () => {
		const { container } = render(<HelpContentsComponent />);

		const titles = [...container.querySelectorAll('.help__callout .help__callout-title')].map((e) => e.textContent);
		expect(titles).toEqual(['recipe.help.costTitle', 'recipe.help.inControlTitle']);
	});

	it('keeps the accept and reject buttons illustrated with their icons', () => {
		const { container } = render(<HelpContentsComponent />);

		expect(container.querySelectorAll('.sim-button-success ion-icon')).toHaveLength(1);
		expect(container.querySelectorAll('.sim-button-reject ion-icon')).toHaveLength(1);
	});

	it('only asks for strings that exist', () => {
		requestedKeys.length = 0;
		render(<HelpContentsComponent />);

		expect(requestedKeys.length).toBeGreaterThan(0);
		for (const key of requestedKeys) {
			expect(key).toMatch(/^recipe\.help\./);
			expect(en.recipe.help, key).toHaveProperty(key.replace('recipe.help.', ''));
		}
	});
});

describe('help translations', () => {
	it('defines the same keys in every language', () => {
		const expected = Object.keys(en.recipe.help).sort();

		for (const [language, translation] of Object.entries({ el, lt, nl })) {
			expect(Object.keys(translation.recipe.help).sort(), language).toEqual(expected);
		}
	});
});
