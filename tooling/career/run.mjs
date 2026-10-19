// Optional manual tick; supported deployments already schedule work automatically.
const { APP_URL, CRON_SECRET } = process.env;
if (!APP_URL || !CRON_SECRET) throw new Error("APP_URL and CRON_SECRET are required.");
const response = await fetch(new URL("/api/career/run", APP_URL), {
	method: "POST",
	headers: { authorization: `Bearer ${CRON_SECRET}` },
	redirect: "error",
	signal: AbortSignal.timeout(250_000),
});
if (!response.ok) throw new Error(`Career runner failed (HTTP ${response.status}).`);
console.info(await response.json());
