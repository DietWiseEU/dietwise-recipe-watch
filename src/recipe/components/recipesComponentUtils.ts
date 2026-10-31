import type { Recipe } from '@/recipe/model';

export interface HasRecipesArgument {
	recipes?: Recipe[];
	suggestionIds?: string[];
	errors?: string[];
}

/** A single recipe is named in the header above the page; several are each named above their own ingredients. */
export const hasSingleRecipe = (props: HasRecipesArgument): boolean => props.recipes?.length === 1;

export const hasRecipesContent = (props: HasRecipesArgument): boolean => {
	return Boolean(props.recipes?.length || (props.errors?.length && !props.suggestionIds));
};
