import type { Cost, Suggestion, SuggestionStats, SuggestionStatus } from '@/recipe/model';

export function isOutsideSeasonalityRange(suggestion: Suggestion, currentMonth = new Date().getMonth() + 1): boolean {
	const seasonality = suggestion.seasonality;
	if (!seasonality) {
		return false;
	}

	return !isMonthWithinRange(currentMonth, seasonality.monthFrom, seasonality.monthTo);
}

export function isMonthWithinRange(month: number, monthFrom: number, monthTo: number): boolean {
	if (monthFrom <= monthTo) {
		return month >= monthFrom && month <= monthTo;
	}
	return isMonthWithinRange(month, monthFrom, 12) || isMonthWithinRange(month, 1, monthTo);
}

export function formatStats(stats: SuggestionStats, status: SuggestionStatus | undefined): string {
	const timesAccepted =
		status === 'ACCEPTED' && stats.timesAccepted + stats.timesRejected < stats.timesSuggested
			? stats.timesAccepted + 1
			: stats.timesAccepted;
	const timesRejected =
		status === 'REJECTED' && stats.timesAccepted + stats.timesRejected < stats.timesSuggested
			? stats.timesRejected + 1
			: stats.timesRejected;
	return `${timesAccepted}/${timesRejected}/${stats.timesSuggested}`;
}

export function recommendationForDisplay(suggestion: Suggestion): string {
	return suggestion.humanFriendlyRecommendationDisplay ?? suggestion.recommendation;
}

export function makeCostString(cost?: Cost) {
	switch (cost) {
		case 'HI':
			return '€€€';
		case 'LO':
			return '€';
		default:
			return '€€';
	}
}
