import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Suggestion } from '@/recipe/model';
import { SUGGESTION } from '@/recipe/testAssessment';
import SuggestionComponent from './SuggestionComponent';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const CURRENT_MONTH = new Date().getMonth() + 1;
const NEXT_MONTH = (CURRENT_MONTH % 12) + 1;

function renderSuggestion(suggestion: Suggestion = SUGGESTION) {
	const onAction = vi.fn();
	const onInfoClicked = vi.fn();
	render(<SuggestionComponent suggestion={suggestion} onAction={onAction} onInfoClicked={onInfoClicked} />);
	return { onAction, onInfoClicked };
}

function button(name: string) {
	const found = [...document.querySelectorAll('ion-button')].find(
		(candidate) => candidate.textContent === name || candidate.getAttribute('aria-label') === name,
	);
	if (!found) {
		throw new Error(`No button named ${name}`);
	}
	return found;
}

describe('SuggestionComponent', () => {
	it('names the alternative, which says all under its ingredient', () => {
		renderSuggestion();

		expect(screen.getByRole('heading', { name: 'olive oil' })).toBeTruthy();
		expect(document.body.textContent).not.toContain('Use olive oil instead of butter');
	});

	it('shows the cost of the alternative', () => {
		renderSuggestion({ ...SUGGESTION, cost: 'HI' });

		expect(screen.getByText('€€€')).toBeTruthy();
	});

	it('warns when the alternative may be out of season', () => {
		renderSuggestion({ ...SUGGESTION, seasonality: { monthFrom: NEXT_MONTH, monthTo: NEXT_MONTH } });

		expect(screen.getByText('recipe.seasonalityWarning')).toBeTruthy();
	});

	it('does not warn when the alternative is in season', () => {
		renderSuggestion({ ...SUGGESTION, seasonality: { monthFrom: CURRENT_MONTH, monthTo: CURRENT_MONTH } });

		expect(screen.queryByText('recipe.seasonalityWarning')).toBeNull();
	});

	it('accepts the alternative', () => {
		const { onAction } = renderSuggestion();

		fireEvent.click(button('ingredient.accept'));

		expect(onAction).toHaveBeenCalledWith('ACCEPTED');
	});

	it('rejects the alternative', () => {
		const { onAction } = renderSuggestion();

		fireEvent.click(button('ingredient.reject'));

		expect(onAction).toHaveBeenCalledWith('REJECTED');
	});

	it('explains the alternative under its name', () => {
		const { onInfoClicked } = renderSuggestion();

		fireEvent.click(button('ingredient.moreInfo'));

		expect(onInfoClicked).toHaveBeenCalledWith('olive oil', expect.stringContaining('recommendation-s1'));
	});
});
