import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { useKeepScreenAwake } from './useKeepScreenAwake';

vi.mock('@capacitor-community/keep-awake', () => ({
	KeepAwake: {
		keepAwake: vi.fn(),
		allowSleep: vi.fn(),
	},
}));

const Consumer: React.FC<{ active: boolean }> = ({ active }) => {
	useKeepScreenAwake(active);
	return null;
};

/** The order of keepAwake/allowSleep calls, which is what decides the final state of the flag. */
const callSequence = (): string[] =>
	[
		...vi.mocked(KeepAwake.keepAwake).mock.invocationCallOrder.map((order) => ({ order, name: 'keepAwake' })),
		...vi.mocked(KeepAwake.allowSleep).mock.invocationCallOrder.map((order) => ({ order, name: 'allowSleep' })),
	]
		.sort((a, b) => a.order - b.order)
		.map((call) => call.name);

describe('useKeepScreenAwake', () => {
	beforeEach(() => {
		vi.mocked(KeepAwake.keepAwake).mockClear();
		vi.mocked(KeepAwake.allowSleep).mockClear();
		vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
	});

	it('does not touch the screen flag off a device', () => {
		vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

		render(<Consumer active={true} />);

		expect(KeepAwake.keepAwake).not.toHaveBeenCalled();
	});

	it('leaves the screen awake when one consumer takes over from another', () => {
		const { rerender } = render(
			<>
				<Consumer active={false} />
				<Consumer active={true} />
			</>,
		);

		expect(callSequence()).toEqual(['keepAwake']);

		// The handover the recipe page makes: the suggestions pane drops its cooking-mode hold in the
		// same commit that the page starts holding the screen for a new assessment.
		rerender(
			<>
				<Consumer active={true} />
				<Consumer active={false} />
			</>,
		);

		expect(callSequence().at(-1)).toBe('keepAwake');
	});

	it('leaves the screen awake when a holding consumer unmounts as another takes over', () => {
		const { rerender } = render(
			<>
				<Consumer active={false} />
				<Consumer active={true} />
			</>,
		);

		rerender(
			<>
				<Consumer active={true} />
			</>,
		);

		expect(callSequence().at(-1)).toBe('keepAwake');
	});
});
