import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { csvFromTranslations, translationsFromCsv } from './i18n-csv.mjs';

const TEMPLATE = {
	ingredient: {
		alternatives_one: '{{count}} alternative',
		alternatives_other: '{{count}} alternatives',
		noSuggestions: 'no suggestions',
	},
};

const LITHUANIAN = {
	ingredient: {
		alternatives_one: '{{count}} alternatyva',
		alternatives_few: '{{count}} alternatyvos',
		alternatives_other: '{{count}} alternatyvų',
		noSuggestions: 'pasiūlymų nėra',
	},
};

function readLanguage(language) {
	return JSON.parse(readFileSync(`src/i18n/${language}.json`, 'utf8'));
}

describe('csvFromTranslations', () => {
	it('has one row per plural form of the language, with the English text of the closest English form', () => {
		expect(csvFromTranslations({ template: TEMPLATE, localized: LITHUANIAN, language: 'lt' }).csv).toBe(
			[
				'code,english,localized,note',
				'ingredient.alternatives_one,{{count}} alternative,{{count}} alternatyva,"plural form for count 1, 21, 31, 41, …"',
				'ingredient.alternatives_few,{{count}} alternatives,{{count}} alternatyvos,"plural form for count 2–9, 22–29, 32–39, 42–49, …"',
				'ingredient.alternatives_other,{{count}} alternatives,{{count}} alternatyvų,"plural form for count 0, 10–20, 30, 40, …"',
				'ingredient.noSuggestions,no suggestions,pasiūlymų nėra,',
				'',
			].join('\n'),
		);
	});

	it('has the English plural forms for a language that has the same forms', () => {
		expect(csvFromTranslations({ template: TEMPLATE, language: 'el' }).csv).toBe(
			[
				'code,english,localized,note',
				'ingredient.alternatives_one,{{count}} alternative,,plural form for count 1',
				'ingredient.alternatives_other,{{count}} alternatives,,"plural form for count 0, 2 and above"',
				'ingredient.noSuggestions,no suggestions,,',
				'',
			].join('\n'),
		);
	});

	it('refuses a translation that lacks a plural form of its language', () => {
		const { alternatives_few: _few, ...ingredient } = LITHUANIAN.ingredient;

		expect(() => csvFromTranslations({ template: TEMPLATE, localized: { ingredient }, language: 'lt' })).toThrow(
			'missing keys: ingredient.alternatives_few',
		);
	});

	it('refuses a translation with a plural form that no whole count uses', () => {
		const localized = { ingredient: { ...LITHUANIAN.ingredient, alternatives_many: '{{count}} alternatyvos' } };

		expect(() => csvFromTranslations({ template: TEMPLATE, localized, language: 'lt' })).toThrow(
			'extra keys: ingredient.alternatives_many',
		);
	});

	it('needs the language', () => {
		expect(() => csvFromTranslations({ template: TEMPLATE })).toThrow('Missing --language.');
	});

	it('refuses a language it has no plural rules for', () => {
		expect(() => csvFromTranslations({ template: TEMPLATE, language: 'qq' })).toThrow('Unknown language "qq".');
	});
});

describe('translationsFromCsv', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reads every plural form of the language, in the place of the English ones', () => {
		const { csv } = csvFromTranslations({ template: TEMPLATE, localized: LITHUANIAN, language: 'lt' });

		const { translations } = translationsFromCsv({ template: TEMPLATE, csv, language: 'lt' });

		expect(JSON.stringify(translations)).toBe(JSON.stringify(LITHUANIAN));
	});

	it('skips a plural form the language does not use, and says so', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const csv =
			csvFromTranslations({ template: TEMPLATE, localized: LITHUANIAN, language: 'lt' }).csv +
			'ingredient.alternatives_many,{{count}} alternatives,{{count}} alternatyvos\n';

		const { translations } = translationsFromCsv({ template: TEMPLATE, csv, language: 'lt' });

		expect(JSON.stringify(translations)).toBe(JSON.stringify(LITHUANIAN));
		expect(warn.mock.calls).toEqual([
			['Unknown keys in CSV (not present in template, skipped):'],
			['ingredient.alternatives_many'],
		]);
	});

	it('refuses a CSV whose English text is not the one of the closest English plural form', () => {
		const csv = csvFromTranslations({ template: TEMPLATE, localized: LITHUANIAN, language: 'lt' }).csv.replace(
			'alternatives_few,{{count}} alternatives',
			'alternatives_few,{{count}} alternative',
		);

		expect(() => translationsFromCsv({ template: TEMPLATE, csv, language: 'lt' })).toThrow(
			'mismatched English text for "ingredient.alternatives_few"',
		);
	});

	it('needs the language', () => {
		expect(() => translationsFromCsv({ template: TEMPLATE, csv: 'code,english,localized\n' })).toThrow(
			'Missing --language.',
		);
	});

	it.each(['el', 'lt', 'nl'])('gives back the %s translation it exported', (language) => {
		const template = readLanguage('en');
		const localized = readLanguage(language);
		const { csv } = csvFromTranslations({ template, localized, language });

		const { translations } = translationsFromCsv({ template, csv, language });

		expect(JSON.stringify(translations, null, '\t')).toBe(JSON.stringify(localized, null, '\t'));
	});
});
