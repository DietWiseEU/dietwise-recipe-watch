import type { MainData, Recipe } from '@/recipe/model';

export interface HasRecipesArgument {
	recipes?: Recipe[];
}

/** A single recipe is named in the header above the page; several are each named above their own ingredients. */
export const hasSingleRecipe = (props: HasRecipesArgument): boolean => props.recipes?.length === 1;

/** The errors the server reported, unless its suggestions arrived anyway, since they are what the user came for. */
export const serverErrorsOf = (mainState: MainData): string[] =>
	mainState.suggestionKeys?.length ? [] : (mainState.errors ?? []);

/** Whether the assessment went wrong: the server reported errors, or the connection broke before it finished. */
export const hasFailed = (mainState: MainData): boolean =>
	Boolean(mainState.interrupted) || serverErrorsOf(mainState).length > 0;
