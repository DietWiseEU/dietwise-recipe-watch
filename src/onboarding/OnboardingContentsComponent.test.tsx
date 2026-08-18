import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import el from '@/i18n/el.json';
import en from '@/i18n/en.json';
import lt from '@/i18n/lt.json';
import nl from '@/i18n/nl.json';
import { authService } from '@/auth/authService';
import OnboardingContentsComponent from './OnboardingContentsComponent';

const { requestedKeys } = vi.hoisted(() => ({ requestedKeys: [] as string[] }));

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			requestedKeys.push(key);
			return key;
		},
	}),
}));

vi.mock('@/auth/authService', () => ({
	authService: { signIn: vi.fn() },
}));

interface RenderOptions {
	hasAccount?: boolean;
	screenIndex?: number;
}

function renderOnboarding({ hasAccount = true, screenIndex = 0 }: RenderOptions = {}) {
	const setScreenIndex = vi.fn();
	const onDone = vi.fn();
	const { container } = render(
		<OnboardingContentsComponent
			hasAccount={hasAccount}
			screenIndex={screenIndex}
			setScreenIndex={setScreenIndex}
			onDone={onDone}
		/>,
	);
	return { container, setScreenIndex, onDone };
}

function textOf(container: HTMLElement, selector: string) {
	return [...container.querySelectorAll(selector)].map((e) => e.textContent);
}

describe('OnboardingContentsComponent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('welcomes the user with the brand, the title and the introduction', () => {
		const { container } = renderOnboarding();

		expect(container.querySelector('.onboarding__brand img')).toBeTruthy();
		expect(container.querySelector('.onboarding__title')?.textContent).toBe('onboarding.welcome.title');
		expect(textOf(container, '.onboarding__text')).toEqual(['onboarding.welcome.text']);
		expect(container.querySelector('.onboarding__step-number')).toBeNull();
	});

	it('offers skip, next and the start action already on the first screen', () => {
		const { container } = renderOnboarding();

		expect(container.querySelector('.onboarding__skip')?.textContent).toBe('onboarding.skip');
		expect(container.querySelector('.onboarding__forward')?.textContent).toContain('onboarding.next');
		expect(container.querySelector('.onboarding__action')?.textContent).toBe('onboarding.welcome.start');
	});

	it('advances with next', () => {
		const { container, setScreenIndex } = renderOnboarding();

		fireEvent.click(container.querySelector('.onboarding__forward')!);

		expect(setScreenIndex).toHaveBeenCalledWith(1);
	});

	it('advances with the start action too', () => {
		const { container, setScreenIndex } = renderOnboarding();

		fireEvent.click(container.querySelector('.onboarding__action')!);

		expect(setScreenIndex).toHaveBeenCalledWith(1);
	});

	it('closes on skip', () => {
		const { container, onDone } = renderOnboarding();

		fireEvent.click(container.querySelector('.onboarding__skip')!);

		expect(onDone).toHaveBeenCalled();
	});

	it('numbers the three how-it-works screens', () => {
		const numbers = [0, 1, 2, 3].map(
			(screenIndex) =>
				renderOnboarding({ screenIndex }).container.querySelector('.onboarding__step-number')?.textContent ??
				null,
		);

		expect(numbers).toEqual([null, '1', '2', '3']);
	});

	it('illustrates every how-it-works screen with a single image', () => {
		for (const screenIndex of [0, 1, 2, 3]) {
			const { container } = renderOnboarding({ screenIndex });

			expect(container.querySelectorAll('.onboarding__image'), `screen ${screenIndex}`).toHaveLength(1);
		}
	});

	it('splits the impact screen into its score and cost explanations', () => {
		const { container } = renderOnboarding({ screenIndex: 3 });

		expect(container.querySelector('.onboarding__title')?.textContent).toBe('onboarding.impact.title');
		expect(textOf(container, '.onboarding__text')).toEqual(['onboarding.impact.text', 'onboarding.impact.cost']);
	});

	it('ends a signed-in tour on the impact screen', () => {
		const { container, onDone } = renderOnboarding({ screenIndex: 3 });

		expect(container.querySelectorAll('.onboarding__dot')).toHaveLength(4);
		expect(container.querySelector('.onboarding__forward')?.textContent).toContain('onboarding.getStarted');

		fireEvent.click(container.querySelector('.onboarding__forward')!);

		expect(onDone).toHaveBeenCalled();
	});

	it('invites visitors without an account to register on a final screen', () => {
		const { container } = renderOnboarding({ hasAccount: false, screenIndex: 4 });

		expect(container.querySelectorAll('.onboarding__dot')).toHaveLength(5);
		expect(container.querySelector('.onboarding__title')?.textContent).toBe('onboarding.registration.title');
		expect(textOf(container, '.onboarding__text')).toEqual(['onboarding.registration.text']);
		expect(container.querySelector('.onboarding__image')).toBeNull();
		expect(container.querySelector('.onboarding__action')?.textContent).toBe('home.loginRegister');
		expect(container.querySelector('.onboarding__forward')?.textContent).toContain('onboarding.getStarted');
	});

	it('starts the registration from the registration screen', () => {
		const { container } = renderOnboarding({ hasAccount: false, screenIndex: 4 });

		fireEvent.click(container.querySelector('.onboarding__action')!);

		expect(authService.signIn).toHaveBeenCalled();
	});

	it('keeps the impact screen in the middle of a visitor tour', () => {
		const { container } = renderOnboarding({ hasAccount: false, screenIndex: 3 });

		expect(container.querySelector('.onboarding__forward')?.textContent).toContain('onboarding.next');
	});

	it('marks the current screen in the dots', () => {
		const { container } = renderOnboarding({ screenIndex: 2 });

		const current = [...container.querySelectorAll('.onboarding__dot')].map(
			(dot) => dot.getAttribute('aria-current') === 'true',
		);
		expect(current).toEqual([false, false, true, false]);
	});

	it('jumps to a screen picked from the dots', () => {
		const { container, setScreenIndex } = renderOnboarding();

		fireEvent.click(container.querySelectorAll('.onboarding__dot')[2]);

		expect(setScreenIndex).toHaveBeenCalledWith(2);
	});

	it('shows the last screen when the index outruns the screens', () => {
		const { container } = renderOnboarding({ screenIndex: 9 });

		expect(container.querySelector('.onboarding__title')?.textContent).toBe('onboarding.impact.title');
	});

	it('only asks for strings that exist', () => {
		requestedKeys.length = 0;
		for (const screenIndex of [0, 1, 2, 3, 4]) {
			renderOnboarding({ hasAccount: false, screenIndex });
		}

		expect(requestedKeys.length).toBeGreaterThan(0);
		for (const key of requestedKeys) {
			const value = key.split('.').reduce<unknown>((node, part) => {
				expect(node, key).toBeTypeOf('object');
				return (node as Record<string, unknown>)[part];
			}, en);
			expect(value, key).toBeTypeOf('string');
		}
	});
});

describe('onboarding translations', () => {
	it('defines the same keys in every language', () => {
		const expected = Object.keys(en.onboarding).sort();

		for (const [language, translation] of Object.entries({ el, lt, nl })) {
			expect(Object.keys(translation.onboarding).sort(), language).toEqual(expected);
		}
	});

	it('defines the same screen keys in every language', () => {
		for (const screen of ['welcome', 'assess', 'choose', 'impact', 'registration'] as const) {
			const expected = Object.keys(en.onboarding[screen]).sort();

			for (const [language, translation] of Object.entries({ el, lt, nl })) {
				expect(Object.keys(translation.onboarding[screen]).sort(), `${language}.${screen}`).toEqual(expected);
			}
		}
	});
});
