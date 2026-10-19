export function mergeResponseHeaders(response: Response, headers: Headers): Response {
	if ([...headers].length === 0) return response;

	const nextHeaders = new Headers(response.headers);
	for (const [key, value] of headers) nextHeaders.append(key, value);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: nextHeaders,
	});
}
