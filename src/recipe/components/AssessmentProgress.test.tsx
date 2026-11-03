import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AssessmentProgress from './AssessmentProgress';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

/** The steps of the assessment, each with what it shows of its progress. */
function steps() {
	return screen.getAllByRole('listitem').map((step) => ({
		text: step.textContent,
		state: step.querySelector('ion-spinner') ? 'running' : step.querySelector('ion-icon') ? 'done' : 'waiting',
	}));
}

describe('AssessmentProgress', () => {
	it('reads the recipe first, with the assessment of its ingredients still to come', () => {
		render(<AssessmentProgress recipeRead={false} />);

		expect(steps()).toEqual([
			{ text: 'recipe.readingRecipe', state: 'running' },
			{ text: 'recipe.assessingIngredients', state: 'waiting' },
		]);
	});

	it('assesses the ingredients once the recipe is read', () => {
		render(<AssessmentProgress recipeRead={true} />);

		expect(steps()).toEqual([
			{ text: 'recipe.recipeRead', state: 'done' },
			{ text: 'recipe.assessingIngredients', state: 'running' },
		]);
	});
});
