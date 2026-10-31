import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CookingModeToggle from './CookingModeToggle';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

const findButton = () => screen.getByText('recipe.keepScreenOn').closest('ion-button');

describe('CookingModeToggle', () => {
	it('renders the label outlined when inactive', () => {
		render(<CookingModeToggle active={false} onToggle={vi.fn()} />);

		const button = findButton();
		expect(button).toBeTruthy();
		expect(button?.getAttribute('fill')).toBe('outline');
		expect(button?.getAttribute('aria-pressed')).toBe('false');
	});

	it('renders solid when active', () => {
		render(<CookingModeToggle active={true} onToggle={vi.fn()} />);

		const button = findButton();
		expect(button?.getAttribute('fill')).toBe('solid');
		expect(button?.getAttribute('aria-pressed')).toBe('true');
	});

	it('names the button for assistive technology even when the label is hidden', () => {
		render(<CookingModeToggle active={false} onToggle={vi.fn()} />);

		expect(findButton()?.getAttribute('aria-label')).toBe('recipe.keepScreenOn');
	});

	it('invokes onToggle when pressed', () => {
		const onToggle = vi.fn();
		render(<CookingModeToggle active={false} onToggle={onToggle} />);

		fireEvent.click(screen.getByText('recipe.keepScreenOn'));

		expect(onToggle).toHaveBeenCalledTimes(1);
	});
});
