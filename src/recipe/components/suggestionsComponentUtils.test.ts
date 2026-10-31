import { describe, expect, it } from 'vitest';
import type { Suggestion } from '@/recipe/model';
import {
	formatStats,
	isMonthWithinRange,
	isOutsideSeasonalityRange,
	recommendationForDisplay,
} from './suggestionsComponentUtils';

const baseSuggestion: Suggestion = {
	id: 's-1',
	target: { type: 'RECIPE', recipeName: 'Soup' },
	ruleId: 'rule-1',
	recommendation: 'Use seasonal vegetables',
	alternative: 'Seasonal vegetables',
	alternativeComponentNames: [],
	totalSuggestionStats: {
		timesSuggested: 10,
		timesAccepted: 4,
		timesRejected: 1,
	},
	userSuggestionStats: {
		timesSuggested: 3,
		timesAccepted: 1,
		timesRejected: 0,
	},
	text: 'Use seasonal vegetables instead.',
};

describe('suggestionsComponentUtils', () => {
	it('formats stats unchanged when no local decision is applied', () => {
		expect(formatStats(baseSuggestion.totalSuggestionStats, undefined)).toBe('4/1/10');
	});

	it('increments accepted stats for a newly accepted suggestion', () => {
		expect(formatStats(baseSuggestion.totalSuggestionStats, 'ACCEPTED')).toBe('5/1/10');
	});

	it('increments rejected stats for a newly rejected suggestion', () => {
		expect(formatStats(baseSuggestion.totalSuggestionStats, 'REJECTED')).toBe('4/2/10');
	});

	it('does not overcount stats when all suggestions already have outcomes', () => {
		expect(formatStats({ timesSuggested: 5, timesAccepted: 3, timesRejected: 2 }, 'ACCEPTED')).toBe('3/2/5');
		expect(formatStats({ timesSuggested: 5, timesAccepted: 3, timesRejected: 2 }, 'REJECTED')).toBe('3/2/5');
	});

	it('includes the start and end month in a non wrapping range', () => {
		expect(isMonthWithinRange(3, 3, 6)).toBe(true);
		expect(isMonthWithinRange(6, 3, 6)).toBe(true);
		expect(isMonthWithinRange(2, 3, 6)).toBe(false);
		expect(isMonthWithinRange(7, 3, 6)).toBe(false);
	});

	it('supports ranges that wrap across the end of the year', () => {
		expect(isMonthWithinRange(11, 11, 2)).toBe(true);
		expect(isMonthWithinRange(1, 11, 2)).toBe(true);
		expect(isMonthWithinRange(2, 11, 2)).toBe(true);
		expect(isMonthWithinRange(6, 11, 2)).toBe(false);
	});

	it('does not show a seasonality warning when seasonality is missing', () => {
		expect(isOutsideSeasonalityRange(baseSuggestion, 5)).toBe(false);
	});

	it('shows a seasonality warning when the current month is outside the configured range', () => {
		const suggestion = {
			...baseSuggestion,
			seasonality: {
				monthFrom: 4,
				monthTo: 8,
			},
		};

		expect(isOutsideSeasonalityRange(suggestion, 3)).toBe(true);
		expect(isOutsideSeasonalityRange(suggestion, 4)).toBe(false);
		expect(isOutsideSeasonalityRange(suggestion, 8)).toBe(false);
		expect(isOutsideSeasonalityRange(suggestion, 9)).toBe(true);
	});

	it('prefers the human-friendly display for the recommendation', () => {
		expect(
			recommendationForDisplay({ ...baseSuggestion, humanFriendlyRecommendationDisplay: 'Eat less red meat' }),
		).toBe('Eat less red meat');
	});

	it('falls back to the recommendation when no human-friendly display is present', () => {
		expect(recommendationForDisplay(baseSuggestion)).toBe('Use seasonal vegetables');
	});

	it('handles wrap around seasonality ranges', () => {
		const suggestion = {
			...baseSuggestion,
			seasonality: {
				monthFrom: 11,
				monthTo: 2,
			},
		};

		expect(isOutsideSeasonalityRange(suggestion, 11)).toBe(false);
		expect(isOutsideSeasonalityRange(suggestion, 12)).toBe(false);
		expect(isOutsideSeasonalityRange(suggestion, 2)).toBe(false);
		expect(isOutsideSeasonalityRange(suggestion, 5)).toBe(true);
	});
});
