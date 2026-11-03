import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UrlContainer from './UrlContainer';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

describe('UrlContainer', () => {
	it('resets without opening the url modal when the reset button is clicked', () => {
		const onClick = vi.fn();
		const onReset = vi.fn();
		const { container } = render(
			<UrlContainer onClick={onClick} onReset={onReset} url="https://example.com" status="SUCCESS" />,
		);

		const resetButton = container.querySelector('ion-button');
		expect(resetButton).toBeTruthy();
		fireEvent.click(resetButton as Element);

		expect(onReset).toHaveBeenCalledTimes(1);
		expect(onClick).not.toHaveBeenCalled();
	});

	it('opens the url modal when the container itself is clicked', () => {
		const onClick = vi.fn();
		render(<UrlContainer onClick={onClick} onReset={vi.fn()} url="https://example.com" status="SUCCESS" />);

		fireEvent.click(screen.getByText('https://example.com'));

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('shows a spinner and no reset button while assessing', () => {
		const { container } = render(
			<UrlContainer onClick={vi.fn()} onReset={vi.fn()} url="https://example.com" status="PENDING" />,
		);

		expect(container.querySelector('ion-spinner')).toBeTruthy();
		expect(container.querySelector('ion-button')).toBeNull();
	});

	it('shows that the recipe is being read while assessing', () => {
		render(<UrlContainer onClick={vi.fn()} onReset={vi.fn()} url="https://example.com" status="PENDING" />);

		expect(screen.getByText('recipe.readingRecipe')).toBeTruthy();
		expect(screen.getByText('recipe.assessingIngredients')).toBeTruthy();
	});

	it('shows no progress once the assessment is complete', () => {
		render(<UrlContainer onClick={vi.fn()} onReset={vi.fn()} url="https://example.com" status="FAILURE" />);

		expect(screen.queryByText('recipe.readingRecipe')).toBeNull();
	});

	it('shows no status icon once the assessment is complete', () => {
		const { container } = render(
			<UrlContainer onClick={vi.fn()} onReset={vi.fn()} url="https://example.com" status="FAILURE" />,
		);

		expect(container.querySelector('ion-icon:not([slot="icon-only"])')).toBeNull();
	});

	it('names the reset button for screen readers', () => {
		const { container } = render(
			<UrlContainer onClick={vi.fn()} onReset={vi.fn()} url="https://example.com" status="SUCCESS" />,
		);

		expect(container.querySelector('ion-button')?.getAttribute('aria-label')).toBe('recipe.startOver');
	});

	it('does not render a reset button before an assessment starts', () => {
		const { container } = render(
			<UrlContainer onClick={vi.fn()} onReset={vi.fn()} url={undefined} status="INITIAL" />,
		);

		expect(container.querySelector('ion-button')).toBeNull();
	});

	it('does not render a reset button while selecting among multiple recipes', () => {
		const { container } = render(
			<UrlContainer onClick={vi.fn()} onReset={vi.fn()} url="https://example.com" status="SELECT_RECIPE" />,
		);

		expect(container.querySelector('ion-button')).toBeNull();
	});
});
