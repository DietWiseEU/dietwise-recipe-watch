import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InterruptedNotice from './InterruptedNotice';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

describe('InterruptedNotice', () => {
	it('tells the user the connection was interrupted', () => {
		render(<InterruptedNotice onRetry={vi.fn()} />);

		expect(screen.getByText('recipe.assessmentInterrupted')).toBeTruthy();
	});

	it('retries when the button is pressed', () => {
		const onRetry = vi.fn();
		render(<InterruptedNotice onRetry={onRetry} />);

		fireEvent.click(screen.getByText('recipe.retry'));

		expect(onRetry).toHaveBeenCalledTimes(1);
	});
});
