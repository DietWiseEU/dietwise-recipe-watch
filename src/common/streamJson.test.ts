import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamJson } from './streamJson';

describe('streamJson', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// --- helpers ---------------------------------------------------------------

	/**
	 * Helper: mock streaming fetch that sends lines sequentially and supports abort
	 */
	function mockFetchStream(lines: string[], delayMs = 0) {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
			const signal = init?.signal;
			const encoder = new TextEncoder();

			const stream = new ReadableStream<Uint8Array>({
				async start(controller) {
					let aborted = false;

					const onAbort = () => {
						aborted = true;
						controller.error(new DOMException('Aborted', 'AbortError'));
					};

					signal?.addEventListener('abort', onAbort);

					for (const line of lines) {
						if (aborted) return;
						controller.enqueue(encoder.encode(line + '\n'));
						if (delayMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
					}

					if (!aborted) controller.close();
				},
			});

			return Promise.resolve(
				new Response(stream, {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
			);
		});
	}

	it('calls onMessage for each line and onComplete at the end', async () => {
		const onMessage = vi.fn();
		const onComplete = vi.fn();

		mockFetchStream(['{"key":"a","value":"1"}', '{"key":"b","value":"2"}', '{"key":"c","value":"3"}']);

		streamJson('/api/stream', undefined, { onMessage, onComplete });

		// Wait for the messages and completion
		await vi.waitUntil(() => onComplete.mock.calls.length > 0, {
			timeout: 1000,
		});

		expect(onMessage).toHaveBeenCalledTimes(3);
		expect(onMessage.mock.calls[0][0]).toEqual({ key: 'a', value: '1' });
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('stops reading when canceled', async () => {
		const onMessage = vi.fn();
		const onComplete = vi.fn();
		const onError = vi.fn();

		mockFetchStream(['{"key":"x"}', '{"key":"y"}'], 100);

		const handle = streamJson('/api/stream', undefined, {
			onMessage,
			onComplete,
			onError,
		});

		// Wait for first message, then cancel
		await vi.waitUntil(() => onMessage.mock.calls.length > 0, {
			timeout: 500,
		});
		handle.cancel();

		// Give time for potential late calls
		await new Promise<void>((resolve) => setTimeout(resolve, 300));

		// After cancel: no completion, no error
		expect(onMessage).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalled();
		expect(onError).not.toHaveBeenCalled();
	});

	it('calls onError on HTTP error', async () => {
		const onError = vi.fn();

		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

		streamJson('/api/error', undefined, { onError });

		await vi.waitUntil(() => onError.mock.calls.length > 0, {
			timeout: 500,
		});

		const [err] = onError.mock.calls[0];
		expect(err).toBeInstanceOf(Error);
		expect((err as Error).message).toMatch(/HTTP error 500/);
	});

	it('skips malformed JSON but keeps reading', async () => {
		const onMessage = vi.fn();
		const onComplete = vi.fn();

		mockFetchStream(['{"ok":1}', 'INVALID_JSON', '{"ok":2}']);

		streamJson('/api/stream', undefined, { onMessage, onComplete });

		await vi.waitUntil(() => onComplete.mock.calls.length > 0, {
			timeout: 1000,
		});

		expect(onMessage).toHaveBeenCalledTimes(2);
		expect(onMessage.mock.calls[0][0]).toEqual({ ok: 1 });
		expect(onMessage.mock.calls[1][0]).toEqual({ ok: 2 });
	});

	it('skips blank lines', async () => {
		const onMessage = vi.fn();
		const onComplete = vi.fn();

		mockFetchStream(['', '', '{"ok":1}', '', '{"ok":2}']);

		streamJson('/api/stream', undefined, { onMessage, onComplete });

		await vi.waitUntil(() => onComplete.mock.calls.length > 0, {
			timeout: 1000,
		});

		expect(onMessage).toHaveBeenCalledTimes(2);
		expect(onMessage.mock.calls[0][0]).toEqual({ ok: 1 });
		expect(onMessage.mock.calls[1][0]).toEqual({ ok: 2 });
	});

	it('parses trailing JSON chunk without newline', async () => {
		const onMessage = vi.fn();
		const onComplete = vi.fn();

		mockFetchStream(['{"trailing":true}']); // no newline at end is fine

		streamJson('/api/stream', undefined, { onMessage, onComplete });

		await vi.waitUntil(() => onComplete.mock.calls.length > 0, {
			timeout: 500,
		});

		expect(onMessage).toHaveBeenCalledWith({ trailing: true });
		expect(onComplete).toHaveBeenCalledTimes(1);
	});
});
