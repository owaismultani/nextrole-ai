import type { BrowserContext } from "@playwright/test";
import assert from "node:assert/strict";

/** The browser size the app is filmed at. The compositor lays clips out in this coordinate space. */
export const viewport = { width: 1440, height: 900 };

export type DemoIds = { baseline: string; tailored: string; mosaic: string; northstar: string };

export async function signIn(context: BrowserContext, account: { email: string; password: string }) {
	const page = await context.newPage();
	await page.goto("/auth/login");
	await page.getByLabel("Email Address", { exact: true }).fill(account.email);
	await page.getByLabel("Password", { exact: true }).fill(account.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.waitForURL(/\/dashboard/);
	await page.close();
}

export async function demoIds(context: BrowserContext): Promise<DemoIds> {
	const get = async <T>(path: string) => (await (await context.request.get(`/api/openapi${path}`)).json()) as T;
	const applications = await get<{ id: string; company: string }[]>("/applications");
	const resumes = await get<{ id: string; name: string; tags: string[] }[]>("/resumes");
	const ids = {
		baseline: resumes.find((resume) => resume.tags.includes("baseline"))?.id ?? "",
		tailored: resumes.find((resume) => resume.name.includes("Mosaic"))?.id ?? "",
		mosaic: applications.find((application) => application.company === "Mosaic Cloud")?.id ?? "",
		northstar: applications.find((application) => application.company === "Northstar Labs")?.id ?? "",
	};
	for (const [key, value] of Object.entries(ids))
		assert(value, `The demo account has no ${key}; run landing/seed-demo.ts first.`);
	return ids;
}
