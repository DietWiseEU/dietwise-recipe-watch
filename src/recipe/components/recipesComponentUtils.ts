import type { Recipe } from '@/recipe/model';

export interface HasRecipesArgument {
	recipes?: Recipe[];
}

/** A single recipe is named in the header above the page; several are each named above their own ingredients. */
export const hasSingleRecipe = (props: HasRecipesArgument): boolean => props.recipes?.length === 1;
