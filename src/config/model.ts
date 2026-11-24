export interface AppConfig {
	authServerHost: string;
	apiServerHost: string;
	/** Prints the recipe rating and the data it is made of to the console. */
	logRating: boolean;
}

export const FALLBACK_APP_CONFIG: AppConfig = Object.freeze({
	authServerHost: 'http://localhost:8280/realms/dietwise',
	apiServerHost: 'http://localhost:8180/api/v1',
	logRating: false,
});
