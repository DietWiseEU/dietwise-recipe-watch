import type { MainAction } from './actions';
import type { MainData, SuggestionState } from './model';
import { keyOfSuggestion } from './model';
import { acceptedSuggestion, rejectedSuggestion, undecided } from '@/recipe/reducers/reduceSuggestionStatusAction';
import { calculateRating } from '@/recipe/reducers/calculateRating';

export function createInitialState(): MainData {
	return {
		status: 'INITIAL',
		emptySuggestionsFromServer: false,
		lang: 'en',
	};
}

export function reducer(state: MainData, action: MainAction): MainData {
	switch (action.type) {
		case 'PrepareToAssessRecipeAction': {
			return {
				status: 'PENDING',
				emptySuggestionsFromServer: false,
				url: action.url,
				lang: action.lang,
			};
		}
		case 'RecipeAssessmentFailedAction': {
			// The stream broke rather than the server reporting something about the recipe, so the
			// transport error is of no use to the user. Whatever arrived before the break is kept.
			console.warn('The recipe assessment was interrupted', action.error);
			return {
				...state,
				status: 'FAILURE',
				interrupted: true,
			};
		}
		case 'RecipeAssessmentCompletedAction': {
			if (state.status !== 'PENDING' && state.status !== 'FAILURE') {
				throw new Error('Inconsistent state for RecipeAssessmentCompletedAction: ' + state.status);
			}
			if (state.status === 'FAILURE') {
				console.warn('Received completion while in FAILURE state, that is weird');
			}
			return {
				...state,
				status: 'SUCCESS',
			};
		}
		case 'ResetMainPageAction': {
			if (state.status === 'PENDING') {
				throw new Error('Inconsistent state for ResetMainPageAction: ' + state.status);
			}
			return createInitialState();
		}
		case 'RecipeExtractionMessageReceivedAction': {
			if (state.status !== 'PENDING') {
				throw new Error('Inconsistent state for RecipeExtractionMessageReceivedAction: ' + state.status);
			}
			return {
				...state,
				recipes: action.message.recipes.map((r) => {
					let text = r.recipe.text;
					if (typeof text === 'string') {
						text = text.replaceAll('\\n', '\n'); // Hack!
						text = text.trimStart(); // Hack!
					}
					return {
						...r.recipe,
						text,
					};
				}),
				detectionTypes: action.message.recipes.map((r) => r.detectionType),
				pageText: action.message.pageText,
			};
		}
		case 'MoreThanOneRecipesAssessmentMessageReceivedAction': {
			if (state.status !== 'PENDING') {
				throw new Error(
					'Inconsistent state for MoreThanOneRecipesAssessmentMessageReceivedAction: ' + state.status,
				);
			}
			return {
				...state,
				status: 'SELECT_RECIPE',
				errors: [`Number of recipes: ${action.numberOfRecipes}`],
			};
		}
		case 'SuggestionsMessageReceivedAction': {
			if (state.status !== 'PENDING') {
				throw new Error('Inconsistent state for SuggestionsMessageReceivedAction: ' + state.status);
			}
			const aggregateStateInitial: { keys: string[]; suggestions: { [key: string]: SuggestionState } } = {
				keys: [],
				suggestions: {},
			};
			const aggregateState = action.message.suggestions?.reduce((aggr, cur) => {
				const key = keyOfSuggestion(cur);
				const keys = [...aggr.keys, key];
				const suggestionState: SuggestionState = {
					suggestion: cur,
					extra: undefined,
					status: 'UNDECIDED',
				};
				return {
					keys,
					suggestions: {
						...aggr.suggestions,
						[key]: suggestionState,
					},
				};
			}, aggregateStateInitial);
			return {
				...state,
				emptySuggestionsFromServer: !!action.message.suggestions && action.message.suggestions.length === 0,
				suggestionKeys: aggregateState?.keys,
				suggestions: aggregateState?.suggestions,
				ingredientState: {},
				assessmentId: action.message.assessmentId,
				intervention: action.message.intervention,
			};
		}
		case 'ScoringMessageReceivedAction': {
			if (state.status !== 'PENDING') {
				throw new Error('Inconsistent state for ScoringMessageReceivedAction: ' + state.status);
			}
			const newState = {
				...state,
				scoringData: action.message.scoringData,
			};
			newState.rating = calculateRating(newState);
			return newState;
		}
		case 'RecipeAssessmentErrorMessageReceivedAction': {
			if (state.status !== 'PENDING') {
				throw new Error('Inconsistent state for RecipeAssessmentErrorMessageReceivedAction: ' + state.status);
			}
			return {
				...state,
				status: 'FAILURE',
				errors: action.message.errors,
			};
		}
		case 'SuggestionStatusAction': {
			if (state.status !== 'SUCCESS') {
				throw new Error('Inconsistent state for SuggestionStatusAction: ' + state.status);
			}
			const target = state.suggestions?.[action.key];
			if (!target) throw new Error('No suggestion with key ' + action.key);
			const currentRecipe = state.recipes?.[0];
			if (!currentRecipe) throw new Error('Got suggestions without a recipe');
			const oldStatus = target.status;
			const newStatus = action.status;
			if (oldStatus !== newStatus) {
				switch (newStatus) {
					case 'ACCEPTED': {
						return acceptedSuggestion(state, action, target);
					}
					case 'REJECTED': {
						return rejectedSuggestion(state, action, target);
					}
					case 'UNDECIDED': {
						return undecided(state, action, target);
					}
				}
			} else {
				return state;
			}
			// throw new Error('Illegal fallthrough'); // XXX VS Code claims the default below is illegal without this!!!
		}
		// see https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
		default: {
			const exhaustiveCheck: never = action;
			throw new Error(`Unknown action type: ${exhaustiveCheck['type']}`);
		}
	}
}
