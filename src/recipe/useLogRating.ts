import { useEffect, useRef } from 'react';
import type { MainData, Recipe, ScoringData } from '@/recipe/model';
import { MAX_RATING, ratingScore } from '@/recipe/reducers/calculateRating';

const LOG_RATING = import.meta.env.DEV;

/** The components a named ingredient or alternative carries into the rating. */
type ComponentsByName = { [name: string]: string[] };

/** A named contributor to the rating and the components it carries. */
interface NamedContribution {
	name: string;
	id: string;
	components: string[];
}

/**
 * Prints the rating and the data it is made of to the console: the score as soon as it is calculated and
 * every time it is recalculated, the components of the ingredients and of the suggested alternatives once
 * per assessment. A development aid; the effects fold to nothing and print nothing in production builds.
 */
export function useLogRating(state: MainData): void {
	useLogWhenNew(state.rating, (rating) => console.log(`Recipe rating: ${ratingScore(rating)}/${MAX_RATING}`, rating));
	useLogWhenNew(state.scoringData, (scoringData) =>
		console.log('Rating components per ingredient:', componentsPerIngredient(scoringData, state.recipes)),
	);
	useLogWhenNew(state.suggestionKeys, () =>
		console.log('Rating components per suggestion:', componentsPerSuggestion(state.suggestions)),
	);
}

/** Logs every value that has not been logged before; StrictMode runs the effect twice per mount. */
function useLogWhenNew<T>(value: T | undefined, log: (value: T) => void): void {
	const loggedValueRef = useRef<T | undefined>(undefined);

	useEffect(() => {
		if (!LOG_RATING || value === undefined || value === loggedValueRef.current) return;
		loggedValueRef.current = value;
		log(value);
	}, [value, log]);
}

function componentsPerIngredient(scoringData: ScoringData, recipes: Recipe[] | undefined): ComponentsByName {
	const names = new Map(recipes?.flatMap((r) => r.recipeIngredients).map((i) => [i.id, i.nameInRecipe]));
	return byName(
		Object.entries(scoringData.recommendationsPerIngredient).map(([id, components]) => ({
			name: names.get(id) ?? id,
			id,
			components,
		})),
	);
}

function componentsPerSuggestion(suggestions: MainData['suggestions']): ComponentsByName {
	return byName(
		Object.values(suggestions ?? {}).map(({ suggestion }) => ({
			name: suggestion.alternative,
			id: suggestion.id,
			components: suggestion.alternativeComponentNames,
		})),
	);
}

/** Keys the components by name, telling apart the entries that share a name by their id. */
function byName(contributions: NamedContribution[]): ComponentsByName {
	const result: ComponentsByName = {};
	for (const { name, id, components } of contributions) {
		result[Object.hasOwn(result, name) ? `${name} (${id})` : name] = components;
	}
	return result;
}
