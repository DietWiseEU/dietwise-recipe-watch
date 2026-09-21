import type {
	RecipeAssessmentErrorMessage,
	RecipeAssessmentMessage,
	RecipeExtractionRecipeAssessmentMessage,
	SuggestionsRecipeAssessmentMessage,
	ScoringRecipeAssessmentMessage,
	SuggestionStatus,
} from './model';
import type { Action } from '@/model';

export interface PrepareToAssessRecipeAction extends Action {
	type: 'PrepareToAssessRecipeAction';
	url: string;
	lang: string;
}

export interface RecipeAssessmentFailedAction extends Action {
	type: 'RecipeAssessmentFailedAction';
	error: Error;
}

export interface RecipeAssessmentCompletedAction extends Action {
	type: 'RecipeAssessmentCompletedAction';
}

export interface ResetMainPageAction extends Action {
	type: 'ResetMainPageAction';
}

export interface RecipeExtractionMessageReceivedAction extends Action {
	type: 'RecipeExtractionMessageReceivedAction';
	message: RecipeExtractionRecipeAssessmentMessage;
}

export interface MoreThanOneRecipesAssessmentMessageReceivedAction extends Action {
	type: 'MoreThanOneRecipesAssessmentMessageReceivedAction';
	numberOfRecipes: number;
}

export interface SuggestionsMessageReceivedAction extends Action {
	type: 'SuggestionsMessageReceivedAction';
	message: SuggestionsRecipeAssessmentMessage;
}

export interface ScoringMessageReceivedAction extends Action {
	type: 'ScoringMessageReceivedAction';
	message: ScoringRecipeAssessmentMessage;
}

export interface RecipeAssessmentErrorMessageReceivedAction extends Action {
	type: 'RecipeAssessmentErrorMessageReceivedAction';
	message: RecipeAssessmentErrorMessage;
}

export interface SuggestionStatusAction extends Action {
	type: 'SuggestionStatusAction';
	key: string;
	status: SuggestionStatus;
}

export type MessageReceivedAction =
	| RecipeExtractionMessageReceivedAction
	| MoreThanOneRecipesAssessmentMessageReceivedAction
	| SuggestionsMessageReceivedAction
	| ScoringMessageReceivedAction
	| RecipeAssessmentErrorMessageReceivedAction;

export type MainAction =
	| PrepareToAssessRecipeAction
	| RecipeAssessmentFailedAction
	| RecipeAssessmentCompletedAction
	| ResetMainPageAction
	| RecipeExtractionMessageReceivedAction
	| MoreThanOneRecipesAssessmentMessageReceivedAction
	| SuggestionsMessageReceivedAction
	| ScoringMessageReceivedAction
	| RecipeAssessmentErrorMessageReceivedAction
	| SuggestionStatusAction;

export function createPrepareToAssessRecipeAction(url: string, lang: string): PrepareToAssessRecipeAction {
	return {
		type: 'PrepareToAssessRecipeAction',
		url,
		lang,
	};
}

export function createRecipeAssessmentFailedAction(e: unknown): RecipeAssessmentFailedAction {
	let error: Error;
	if (e instanceof Error) {
		error = e;
	} else {
		error = new Error(e as string);
	}
	return {
		type: 'RecipeAssessmentFailedAction',
		error,
	};
}

export function createRecipeAssessmentCompletedAction(): RecipeAssessmentCompletedAction {
	return {
		type: 'RecipeAssessmentCompletedAction',
	};
}

export function createResetMainPageAction(): ResetMainPageAction {
	return {
		type: 'ResetMainPageAction',
	};
}

/** A keep-alive carries nothing to act on, so it maps to no action; everything else drives the state machine. */
export function createMessageReceivedAction(message: RecipeAssessmentMessage): MessageReceivedAction | null {
	switch (message.type) {
		case 'KEEP_ALIVE':
			return null;
		case 'RECIPES':
			return {
				type: 'RecipeExtractionMessageReceivedAction',
				message,
			};
		case 'MORE_THAN_ONE_RECIPE':
			return {
				type: 'MoreThanOneRecipesAssessmentMessageReceivedAction',
				numberOfRecipes: message.numberOfRecipes,
			};
		case 'SUGGESTIONS':
			return {
				type: 'SuggestionsMessageReceivedAction',
				message,
			};
		case 'SCORING':
			return {
				type: 'ScoringMessageReceivedAction',
				message,
			};
		case 'ERROR':
			return {
				type: 'RecipeAssessmentErrorMessageReceivedAction',
				message,
			};
	}
}

export function createSuggestionStatusAction(key: string, status: SuggestionStatus): SuggestionStatusAction {
	return {
		type: 'SuggestionStatusAction',
		key,
		status,
	};
}
