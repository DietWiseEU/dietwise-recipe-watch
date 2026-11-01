export interface Settings {
	language: string;
	onboardingSeen: boolean;
	/** Whether accepting an alternative, or rejecting the last one, opens the next ingredient with alternatives. */
	autoAdvance: boolean;
}

export const DEFAULT_SETTINGS: Settings = Object.freeze({
	language: 'en',
	onboardingSeen: false,
	autoAdvance: true,
});
