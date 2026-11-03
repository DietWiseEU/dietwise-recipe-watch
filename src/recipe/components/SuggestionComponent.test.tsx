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

const DETAILED_SUGGESTION: Suggestion = {
	...SUGGESTION,
	equivalence: '80 g of oil for 100 g of butter',
	techniqueNotes: 'Melt it first',
};

function renderSuggestion(suggestion: Suggestion = SUGGESTION, variant?: 'list' | 'compare') {
	const onAction = vi.fn();
	const onInfoClicked = vi.fn();
	render(
		<SuggestionComponent
			suggestion={suggestion}
			variant={variant}
			onAction={onAction}
			onInfoClicked={onInfoClicked}
		/>,
	);
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

	it('leaves out the equivalence and the notes in the list of alternatives', () => {
		renderSuggestion(DETAILED_SUGGESTION);

		expect(document.body.textContent).not.toContain('80 g of oil for 100 g of butter');
		expect(document.body.textContent).not.toContain('Melt it first');
	});

	it('shows the equivalence and the notes when comparing alternatives', () => {
		renderSuggestion(DETAILED_SUGGESTION, 'compare');

		expect(screen.getByText('80 g of oil for 100 g of butter')).toBeTruthy();
		expect(document.body.textContent).toContain('ingredient.techniqueNotes Melt it first');
	});

	it('rejects the alternative with an icon when comparing alternatives', () => {
		const { onAction } = renderSuggestion(SUGGESTION, 'compare');

		const reject = button('ingredient.reject');
		fireEvent.click(reject);

		expect(reject.textContent).toBe('');
		expect(onAction).toHaveBeenCalledWith('REJECTED');
	});
});
