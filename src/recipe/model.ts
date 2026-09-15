export interface Viewport {
	width: number;
	height: number;
}

export interface RecipeExtractionAndAssessmentParam {
	/** The URL of the page containing the recipe to assess. */
	url: string;
	/** The viewport in the client. */
	viewport?: Viewport;
	/** The language of the page. */
	lang: string;
}

export interface StatisticsParam {
	suggestionId: string;
}

export interface StatisticsResponse {
	updatedValue: number;
}

export interface AppliesToIngredient {
	type: 'INGREDIENT';
	/** The id of the ingredient this suggestion applies to. */
	ingredient: string;
}

export interface AppliesToRecipe {
	type: 'RECIPE';
	/** The name of the recipe this suggestion applies to. */
	recipeName: string;
}

export interface SuggestionTemplate {
	alternative: string;
	restriction?: string;
	equivalence?: string;
	techniqueNotes?: string;
}

export interface Seasonality {
	monthFrom: number;
	monthTo: number;
}

export interface SuggestionStats {
	timesSuggested: number;
	timesAccepted: number;
	timesRejected: number;
}

export type Cost = 'LO' | 'MED' | 'HI';

export interface Suggestion extends SuggestionTemplate {
	id: string;
	target: AppliesToIngredient | AppliesToRecipe;
	ruleId: string;
	recommendation: string;
	humanFriendlyRecommendationDisplay?: string;
	seasonality?: Seasonality;
	cost?: Cost;
	rationale?: string;
	alternativeComponentNames: string[];
	totalSuggestionStats: SuggestionStats;
	userSuggestionStats: SuggestionStats;
	text: string;
}

export interface SuggestionExtraData {
	ranking: number;
	totalAccepted: number;
	total: number;
}

export type SuggestionStatus = 'ACCEPTED' | 'REJECTED' | 'UNDECIDED';

export interface SuggestionState {
	suggestion: Suggestion;
	extra?: SuggestionExtraData;
	status: SuggestionStatus;
}

export interface Ingredient {
	id: string;
	nameInRecipe: string;
	triggerIngredient?: string;
	roleOrTechnique?: string;
}

export interface Recipe {
	name?: string;
	recipeYield?: string;
	recipeIngredients: Ingredient[];
	recipeInstructions: string[]; // TODO Must reference ingedient
	text?: string;
}

export type RecipeDetectionType = 'JSONLD' | 'LLM_FROM_TEXT';

export interface RecipeAndDetectionType {
	recipe: Recipe;
	detectionType: RecipeDetectionType;
}

export type TypeOfRecommendation = 'LIMITED' | 'ENCOURAGED';

export interface RecommendationSpecialWeight {
	typeOfRecommendation: TypeOfRecommendation;
	/** How much this component counts against the others of its type, for the age and gender of the user. */
	weight: number;
}

/** A component present in the (possibly amended) recipe and the points it moves the rating by. */
export interface RatingContribution {
	componentName: string;
	points: number;
}

export interface Rating {
	/** The ENCOURAGED components present in the (possibly amended) recipe; each adds its points. */
	encouragedPresent: RatingContribution[];
	/** The LIMITED components present in the (possibly amended) recipe; each subtracts its points. */
	limitedPresent: RatingContribution[];
}

export interface ScoringData {
	totalNumberOfRecomendations: number;
	recommendationWeights: { [key: string]: RecommendationSpecialWeight };
	recommendationsPerIngredient: { [key: string]: string[] };
}

export interface RecipeExtractionRecipeAssessmentMessage {
	type: 'RECIPES';
	recipes: RecipeAndDetectionType[];
	pageText: string;
}

export interface MoreThanOneRecipesAssessmentMessage {
	type: 'MORE_THAN_ONE_RECIPE';
	numberOfRecipes: number;
}

export interface SuggestionsRecipeAssessmentMessage {
	type: 'SUGGESTIONS';
	suggestions?: Suggestion[];
}

export interface ScoringRecipeAssessmentMessage {
	type: 'SCORING';
	scoringData: ScoringData;
}

export interface RecipeAssessmentErrorMessage {
	type: 'ERROR';
	errors?: string[];
}

export type RecipeAssessmentMessage =
	| RecipeExtractionRecipeAssessmentMessage
	| MoreThanOneRecipesAssessmentMessage
	| SuggestionsRecipeAssessmentMessage
	| ScoringRecipeAssessmentMessage
	| RecipeAssessmentErrorMessage;

export type MainDataStatus = 'INITIAL' | 'SUCCESS' | 'FAILURE' | 'PENDING' | 'SELECT_RECIPE';

export type IngredientStateType = { [key: string]: string | undefined };

export interface MainData {
	status: MainDataStatus;
	errors?: string[];
	rating?: Rating;
	recipes?: Recipe[];
	detectionTypes?: RecipeDetectionType[];
	suggestionKeys?: string[];
	emptySuggestionsFromServer: boolean;
	/** Map from suggestion key to suggestion state. */
	suggestions?: { [key: string]: SuggestionState };
	/** Map from ingredient id to suggestion key, only if the substitution is accepted. */
	ingredientState?: IngredientStateType;
	/** The URL of the recipe page. */
	url?: string;
	/** The language of the recipe page. */
	lang: string;
	/** The extracted content of the recipe page. */
	pageText?: string;
	scoringData?: ScoringData;
}

export function keyOfSuggestion(s: Suggestion): string {
	return s.target.type === 'INGREDIENT' ? keyOfIngredientSuggestion(s.id, s.target.ingredient) : s.id + 'R';
}

export function keyOfIngredientSuggestion(suggestionId: string, ingredientId: string): string {
	return suggestionId + 'I' + ingredientId;
}
