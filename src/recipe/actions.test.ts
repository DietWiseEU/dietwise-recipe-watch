import { describe, expect, it } from 'vitest';
import { createMessageReceivedAction } from './actions';

describe('createMessageReceivedAction', () => {
	it('has no action for a keep-alive, which says nothing except that the assessment is still running', () => {
		expect(createMessageReceivedAction({ type: 'KEEP_ALIVE' })).toBeNull();
	});

	it('maps a message about the recipe to its action', () => {
		expect(createMessageReceivedAction({ type: 'MORE_THAN_ONE_RECIPE', numberOfRecipes: 2 })).toEqual({
			type: 'MoreThanOneRecipesAssessmentMessageReceivedAction',
			numberOfRecipes: 2,
		});
	});
});
