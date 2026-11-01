#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TEMPLATE = 'src/i18n/en.json';
/** The plural forms i18next knows, as the suffixes of plural keys, in CLDR order. */
const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];
/** Counts 0 to this reach every plural form a whole count has in the app's languages. */
const LARGEST_SAMPLE_COUNT = 1000;
/** How many runs of counts a plural form's note lists before it trails off. */
const NOTE_RUNS = 4;

function main() {
	const [command, ...args] = process.argv.slice(2);

	if (!command || command === '--help' || command === '-h') {
		printHelp();
		process.exit(command ? 0 : 1);
	}

	const options = parseArgs(args);

	switch (command) {
		case 'export':
			exportCsv(options);
			break;
		case 'import':
			importCsv(options);
			break;
		default:
			fail(`Unknown command "${command}".`);
	}
}

function exportCsv(options) {
	const templatePath = resolvePath(options.template ?? DEFAULT_TEMPLATE);
	const outputPath = resolveRequiredPath(options.output, 'Missing --output for export.');
	const sourcePath = options.source ? resolvePath(options.source) : null;

	const { csv, count } = csvFromTranslations({
		template: readJson(templatePath),
		localized: sourcePath ? readJson(sourcePath) : null,
		language: options.language,
	});

	writeText(outputPath, csv);
	console.log(`Wrote ${count} translations to ${outputPath}`);
}

export function csvFromTranslations({ template, localized, language }) {
	const pluralForms = pluralFormsOf(language);
	const templateEntries = flattenTranslations(withPluralForms(template, pluralForms));
	const localizedEntries = localized ? flattenTranslations(localized) : new Map();

	if (localized) {
		assertSameKeys(templateEntries, localizedEntries, 'localized JSON');
	}

	const rows = [['code', 'english', 'localized', 'note']];

	for (const [code, english] of templateEntries.entries()) {
		rows.push([code, english, localizedEntries.get(code) ?? '', noteOf(code, templateEntries, pluralForms)]);
	}

	return { csv: rows.map(toCsvLine).join('\n') + '\n', count: rows.length - 1 };
}

function importCsv(options) {
	const templatePath = resolvePath(options.template ?? DEFAULT_TEMPLATE);
	const inputPath = resolveRequiredPath(options.input, 'Missing --input for import.');
	const outputPath = resolveRequiredPath(options.output, 'Missing --output for import.');

	const { translations, count } = translationsFromCsv({
		template: readJson(templatePath),
		csv: readText(inputPath),
		language: options.language,
	});

	writeText(outputPath, `${JSON.stringify(translations, null, '\t')}\n`);
	console.log(`Wrote ${count} translations to ${outputPath}`);
}

export function translationsFromCsv({ template, csv, language }) {
	const languageTemplate = withPluralForms(template, pluralFormsOf(language));
	const templateEntries = flattenTranslations(languageTemplate);
	const csvRows = parseCsv(csv);

	if (csvRows.length === 0) {
		fail('CSV input is empty.');
	}

	const header = csvRows[0];
	if (header.length < 3 || header[0] !== 'code' || header[1] !== 'english' || header[2] !== 'localized') {
		fail('CSV header must be exactly: code,english,localized');
	}

	const localizedEntries = new Map();
	const unknownCodes = [];

	for (let index = 1; index < csvRows.length; index += 1) {
		const row = csvRows[index];
		if (row.length === 1 && row[0] === '') {
			continue;
		}

		if (row.length < 3) {
			fail(`CSV row ${index + 1} must contain at least 3 columns.`);
		}

		const [code, english, localized] = row;

		if (!templateEntries.has(code)) {
			unknownCodes.push(code);
			continue;
		}

		const expectedEnglish = templateEntries.get(code);
		if (english !== expectedEnglish) {
			fail(
				`CSV row ${index + 1} has mismatched English text for "${code}". Expected "${expectedEnglish}" but got "${english}".`,
			);
		}

		if (localizedEntries.has(code)) {
			fail(`CSV row ${index + 1} duplicates code "${code}".`);
		}

		localizedEntries.set(code, localized ?? '');
	}

	const missingCodes = [];
	for (const key of templateEntries.keys()) {
		if (!localizedEntries.has(key)) {
			missingCodes.push(key);
		}
	}

	if (unknownCodes.length > 0) {
		console.warn(`Unknown keys in CSV (not present in template, skipped):`);
		for (const code of unknownCodes) {
			console.warn(code);
		}
	}

	if (missingCodes.length > 0) {
		console.warn(`Missing keys (in template but not in CSV, written as empty):`);
		for (const code of missingCodes) {
			console.warn(code);
		}
	}

	return { translations: buildFromTemplate(languageTemplate, [], localizedEntries), count: localizedEntries.size };
}

/**
 * The plural forms that whole counts use in the language, each with a note for translators on the counts that use it.
 */
function pluralFormsOf(language) {
	if (!language) {
		fail('Missing --language.');
	}
	if (Intl.PluralRules.supportedLocalesOf(language).length === 0) {
		fail(`Unknown language "${language}".`);
	}

	const rules = new Intl.PluralRules(language);
	const countsOfForm = new Map();
	for (let count = 0; count <= LARGEST_SAMPLE_COUNT; count += 1) {
		const form = rules.select(count);
		countsOfForm.set(form, [...(countsOfForm.get(form) ?? []), count]);
	}

	return new Map(
		PLURAL_FORMS.filter((form) => countsOfForm.has(form)).map((form) => [
			form,
			`plural form for count ${describeCounts(countsOfForm.get(form))}`,
		]),
	);
}

/** Describes ascending counts as runs, e.g. "2–9, 22–29, …" or "0, 2 and above". */
function describeCounts(counts) {
	const runs = [];
	for (const count of counts) {
		const lastRun = runs.at(-1);
		if (lastRun && lastRun.last === count - 1) {
			lastRun.last = count;
		} else {
			runs.push({ first: count, last: count });
		}
	}

	const described = runs.slice(0, NOTE_RUNS).map(({ first, last }) => {
		if (last === LARGEST_SAMPLE_COUNT) {
			return `${first} and above`;
		}
		return first === last ? `${first}` : `${first}–${last}`;
	});
	return runs.length > NOTE_RUNS ? `${described.join(', ')}, …` : described.join(', ');
}

/** The plural form and the key without it, if the key is one form of a plural, i.e. it has an "other" sibling. */
function pluralKeyOf(key, hasSibling) {
	const separator = key.lastIndexOf('_');
	const base = key.slice(0, separator);
	const form = key.slice(separator + 1);
	return separator > 0 && PLURAL_FORMS.includes(form) && hasSibling(`${base}_other`) ? { base, form } : null;
}

/**
 * The template with each plural replaced by the plural forms of the language. A form English lacks gets the English
 * text of "other".
 */
function withPluralForms(templateNode, pluralForms) {
	if (typeof templateNode === 'string' || !templateNode || typeof templateNode !== 'object') {
		return templateNode;
	}

	const result = {};
	for (const [key, child] of Object.entries(templateNode)) {
		const pluralKey = pluralKeyOf(key, (sibling) => Object.hasOwn(templateNode, sibling));
		if (!pluralKey) {
			result[key] = withPluralForms(child, pluralForms);
			continue;
		}
		// The first English form of the plural puts all the forms of the language in its place.
		if (Object.hasOwn(result, `${pluralKey.base}_other`)) {
			continue;
		}
		for (const form of pluralForms.keys()) {
			result[`${pluralKey.base}_${form}`] =
				templateNode[`${pluralKey.base}_${form}`] ?? templateNode[`${pluralKey.base}_other`];
		}
	}
	return result;
}

function noteOf(code, entries, pluralForms) {
	const prefix = code.slice(0, code.lastIndexOf('.') + 1);
	const pluralKey = pluralKeyOf(code.slice(prefix.length), (sibling) => entries.has(`${prefix}${sibling}`));
	return pluralKey ? pluralForms.get(pluralKey.form) : '';
}

function flattenTranslations(value, prefix = '', entries = new Map()) {
	if (typeof value === 'string') {
		if (!prefix) {
			fail('Template root cannot be a string.');
		}

		entries.set(prefix, value);
		return entries;
	}

	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		fail(`Expected nested translation object at "${prefix || '<root>'}".`);
	}

	for (const [key, child] of Object.entries(value)) {
		const childPrefix = prefix ? `${prefix}.${key}` : key;
		flattenTranslations(child, childPrefix, entries);
	}

	return entries;
}

function buildFromTemplate(templateNode, pathParts, localizedEntries) {
	if (typeof templateNode === 'string') {
		const code = pathParts.join('.');
		return localizedEntries.get(code) ?? '';
	}

	if (!templateNode || typeof templateNode !== 'object' || Array.isArray(templateNode)) {
		fail(`Expected nested translation object at "${pathParts.join('.') || '<root>'}".`);
	}

	const result = {};
	for (const [key, child] of Object.entries(templateNode)) {
		result[key] = buildFromTemplate(child, [...pathParts, key], localizedEntries);
	}

	return result;
}

function assertSameKeys(expectedEntries, actualEntries, label) {
	const missing = [];
	const extra = [];

	for (const key of expectedEntries.keys()) {
		if (!actualEntries.has(key)) {
			missing.push(key);
		}
	}

	for (const key of actualEntries.keys()) {
		if (!expectedEntries.has(key)) {
			extra.push(key);
		}
	}

	if (missing.length > 0 || extra.length > 0) {
		const details = [];
		if (missing.length > 0) {
			details.push(`missing keys: ${missing.join(', ')}`);
		}
		if (extra.length > 0) {
			details.push(`extra keys: ${extra.join(', ')}`);
		}
		fail(`${label} keys do not match template (${details.join('; ')}).`);
	}
}

function parseArgs(args) {
	const options = {};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (!arg.startsWith('--')) {
			fail(`Unexpected argument "${arg}".`);
		}

		const name = arg.slice(2);
		const value = args[index + 1];
		if (!value || value.startsWith('--')) {
			fail(`Missing value for --${name}.`);
		}

		options[name] = value;
		index += 1;
	}

	return options;
}

function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let index = 0;

	while (index < text.length) {
		const char = text[index];

		if (char === '"') {
			index += 1;
			while (index < text.length) {
				const quotedChar = text[index];
				if (quotedChar === '"') {
					if (text[index + 1] === '"') {
						field += '"';
						index += 2;
						continue;
					}
					index += 1;
					break;
				}
				field += quotedChar;
				index += 1;
			}
			continue;
		}

		if (char === ',') {
			row.push(field);
			field = '';
			index += 1;
			continue;
		}

		if (char === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
			index += 1;
			continue;
		}

		if (char === '\r') {
			index += 1;
			continue;
		}

		field += char;
		index += 1;
	}

	if (field !== '' || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows;
}

function toCsvLine(fields) {
	return fields.map(escapeCsvField).join(',');
}

function escapeCsvField(value) {
	const stringValue = String(value);
	if (/[",\n\r]/.test(stringValue)) {
		return `"${stringValue.replaceAll('"', '""')}"`;
	}
	return stringValue;
}

function resolvePath(filePath) {
	return path.resolve(process.cwd(), filePath);
}

function resolveRequiredPath(filePath, message) {
	if (!filePath) {
		fail(message);
	}
	return resolvePath(filePath);
}

function readJson(filePath) {
	return JSON.parse(readText(filePath));
}

function readText(filePath) {
	try {
		return fs.readFileSync(filePath, 'utf8');
	} catch (error) {
		fail(`Failed to read ${filePath}: ${error.message}`);
	}
}

function writeText(filePath, content) {
	try {
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, content, 'utf8');
	} catch (error) {
		fail(`Failed to write ${filePath}: ${error.message}`);
	}
}

function printHelp() {
	console.log(`Usage:
  node scripts/i18n-csv.mjs export --language <code> --output <file.csv> [--template src/i18n/en.json] [--source <localized.json>]
  node scripts/i18n-csv.mjs import --language <code> --input <file.csv> --output <localized.json> [--template src/i18n/en.json]

--language is the code of the language translated into, e.g. el, lt or nl. Each plural string gets a row for every
plural form a whole count uses in that language, which may be more forms than English has: Lithuanian has
<key>_one, <key>_few and <key>_other. A form English lacks shows the English plural ("other") text. The "note" column
says which counts use each plural form; import ignores it.

Examples:
  npm run i18n:csv:export -- --language el --output translations/el.csv --source src/i18n/el.json
  npm run i18n:csv:export -- --language nl --output translations/nl.csv
  npm run i18n:csv:import -- --language nl --input translations/nl.csv --output src/i18n/nl.json`);
}

function fail(message) {
	throw new Error(message);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		main();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}
