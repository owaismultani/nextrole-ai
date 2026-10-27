/** Large boards publish whole lists in one response (Lever's run to ~6 MB), so the cap is well above a page's. */
export const MAX_SOURCE_BYTES = 16_000_000;
const TIMEOUT_MS = 15_000;
const USER_AGENT = "Mozilla/5.0 (compatible; ReactiveResume; job sources)";

export type SourceFailure = "auth" | "quota" | "not-found" | "unreachable" | "malformed" | "too-large" | "timeout";

export class SourceError extends Error {
	constructor(
		readonly reason: SourceFailure,
		options?: ErrorOptions,
	) {
		super(`Job source failed (${reason}).`, options);
		this.name = "SourceError";
	}
}

type Request = {
	method?: "GET" | "POST";
	headers?: Record<string, string>;
	body?: unknown;
	signal: AbortSignal;
	/** Reuse a response this many milliseconds old, so a list read by many searches is fetched once. */
	cacheMs?: number;
};

// ponytail: one bounded in-memory cache per process; responses are public lists, so nothing private is kept.
const CACHE_BYTES = 64_000_000;
const cache = new Map<string, { at: number; text: string }>();
let cachedBytes = 0;

function remember(key: string, text: string) {
	if (text.length > CACHE_BYTES / 4) return;
	const old = cache.get(key);
	if (old) cachedBytes -= old.text.length;
	cache.delete(key);
	cache.set(key, { at: Date.now(), text });
	cachedBytes += text.length;
	for (const [oldest, entry] of cache) {
		if (cachedBytes <= CACHE_BYTES) break;
		cache.delete(oldest);
		cachedBytes -= entry.text.length;
	}
}

export function clearSourceCache() {
	cache.clear();
	cachedBytes = 0;
}

/**
 * Fetches a job source's response as text: fixed public hosts only (callers build addresses from templates), no
 * redirects, a deadline, and a byte cap. Error bodies are never kept, since they can echo keys.
 */
export async function fetchSource(url: string, request: Request): Promise<string> {
	const body = request.body === undefined ? undefined : JSON.stringify(request.body);
	const key = `${request.method ?? "GET"} ${url} ${body ?? ""}`;
	if (request.cacheMs) {
		const hit = cache.get(key);
		if (hit && Date.now() - hit.at < request.cacheMs) return hit.text;
	}
	const signal = AbortSignal.any([request.signal, AbortSignal.timeout(TIMEOUT_MS)]);
	let response: Response;
	try {
		response = await fetch(url, {
			method: request.method ?? "GET",
			headers: {
				accept: "application/json, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5",
				"user-agent": USER_AGENT,
				...(body ? { "content-type": "application/json" } : {}),
				...request.headers,
			},
			...(body ? { body } : {}),
			signal,
			redirect: "error",
		});
	} catch (error) {
		request.signal.throwIfAborted();
		throw new SourceError(signal.aborted ? "timeout" : "unreachable", { cause: error });
	}
	if (!response.ok) {
		await response.body?.cancel().catch(() => {});
		throw new SourceError(
			response.status === 401 || response.status === 403
				? "auth"
				: response.status === 429 || response.status === 402
					? "quota"
					: response.status === 404 || response.status === 410
						? "not-found"
						: "unreachable",
		);
	}
	if (Number(response.headers.get("content-length")) > MAX_SOURCE_BYTES) {
		await response.body?.cancel().catch(() => {});
		throw new SourceError("too-large");
	}
	const reader = response.body?.getReader();
	if (!reader) throw new SourceError("malformed");
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > MAX_SOURCE_BYTES) throw new SourceError("too-large");
			chunks.push(value);
		}
	} catch (error) {
		request.signal.throwIfAborted();
		if (error instanceof SourceError) throw error;
		throw new SourceError(signal.aborted ? "timeout" : "unreachable", { cause: error });
	} finally {
		await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
	const text = new TextDecoder().decode(Buffer.concat(chunks));
	if (request.cacheMs) remember(key, text);
	return text;
}

export async function fetchSourceJson(url: string, request: Request): Promise<unknown> {
	const text = await fetchSource(url, request);
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw new SourceError("malformed");
	}
}
