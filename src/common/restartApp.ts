/**
 * Loads the app afresh from its start page, leaving behind every atom, mounted page and in-memory value of the
 * session so far.
 */
export function restartApp(): void {
	window.location.replace(import.meta.env.BASE_URL);
}
