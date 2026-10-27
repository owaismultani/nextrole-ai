/** Query strings and fragments can carry tokens (password reset, email verification), so neither leaves the page. */
function withoutQuery<T extends { url: string }>(event: T): T {
	const url = new URL(event.url);
	url.search = "";
	url.hash = "";
	return { ...event, url: url.toString() };
}

/**
 * Vercel Web Analytics and Speed Insights, only in builds made on Vercel: other hosts don't serve their `/_vercel`
 * scripts. Both are loaded after the first render so they never delay it.
 */
export async function injectVercelInsights() {
	if (!__VERCEL__) return;
	const [{ inject }, { injectSpeedInsights }] = await Promise.all([
		import("@vercel/analytics"),
		import("@vercel/speed-insights"),
	]);
	inject({ framework: "vite", beforeSend: withoutQuery });
	injectSpeedInsights({ framework: "vite", beforeSend: withoutQuery });
}
