import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Ingredient } from '@/recipe/model';
import { OTHER_SUGGESTION, SUGGESTION } from '@/recipe/testAssessment';
import CompareSheet from './CompareSheet';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

/** Like the real modal, it keeps its content in the page while it closes. */
vi.mock('@ionic/react', async () => {
	const actual = await vi.importActual<typeof import('@ionic/react')>('@ionic/react');
	return {
		...actual,
		IonModal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (
			<div data-testid="ion-modal" data-open={isOpen}>
				{children}
			</div>
		),
	};
});

const BUTTER: Ingredient = { id: 'i1', nameInRecipe: 'butter' };

const onAction = vi.fn();
const onSkip = vi.fn();

function sheet(ingredient: Ingredient | undefined, suggestions = [SUGGESTION, OTHER_SUGGESTION]) {
	return (
		<CompareSheet
			ingredient={ingredient}
			undecidedSuggestions={suggestions.map((suggestion) => ({ suggestion, status: 'UNDECIDED' as const }))}
			isSuggestionInFlight={() => false}
			onAction={onAction}
			onInfoClicked={vi.fn()}
			onLeaveUndecided={vi.fn()}
			onSkip={onSkip}
		/>
	);
}

function buttonsLabelled(label: string) {
	return [...document.querySelectorAll('ion-button')].filter(
		(button) => button.textContent === label || button.getAttribute('aria-label') === label,
	);
}

function alternativesShown() {
	return screen.queryAllByRole('heading', { level: 4 }).map((heading) => heading.textContent);
}

describe('CompareSheet', () => {
	it('keeps showing the alternatives it compared while it closes', () => {
		const { rerender } = render(sheet(BUTTER));

		rerender(sheet(undefined, [SUGGESTION]));

		expect(screen.getByTestId('ion-modal').dataset.open).toBe('false');
		expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('butter');
		expect(alternativesShown()).toEqual(['olive oil', 'sunflower oil']);
	});

	it('decides nothing on a tap while it closes', () => {
		const { rerender } = render(sheet(BUTTER));
		rerender(sheet(undefined));

		fireEvent.click(buttonsLabelled('ingredient.accept')[0]);
		fireEvent.click(buttonsLabelled('ingredient.reject')[0]);
		fireEvent.click(buttonsLabelled('ingredient.skip')[0]);

		expect(onAction).not.toHaveBeenCalled();
		expect(onSkip).not.toHaveBeenCalled();
	});

	it('shows the alternatives that remain while it is open', () => {
		const { rerender } = render(sheet(BUTTER));

		rerender(sheet(BUTTER, [OTHER_SUGGESTION]));

		expect(alternativesShown()).toEqual(['sunflower oil']);
	});
});
