export interface Settings {
	language: string;
	onboardingSeen: boolean;
}

export const DEFAULT_SETTINGS: Settings = Object.freeze({
	language: 'en',
	onboardingSeen: false,
});
