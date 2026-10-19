import type { Page } from "@playwright/test";
import { startAiStub } from "../fixtures/ai-stub";
import { expect, test } from "../fixtures/test";

let stub: Awaited<ReturnType<typeof startAiStub>>;
test.beforeAll(async () => {
	stub = await startAiStub();
});
test.afterAll(async () => {
	await stub?.close();
});

async function createApplication(page: Page) {
	const response = await page.request.post("/api/openapi/applications", {
		data: { company: "Harbor Freight Labs", role: "Operations lead", status: "interview" },
	});
	await expect(response).toBeOK();
	const applicationId = (await response.json()) as string;
	const interview = await page.request.post(`/api/openapi/applications/${applicationId}/interviews`, {
		data: { at: new Date(Date.now() + 2 * 86_400_000).toISOString(), kind: "technical", timezone: "Europe/Berlin" },
	});
	await expect(interview).toBeOK();
	return applicationId;
}

test("knowledge corrections persist and the workspace opens without an AI provider", async ({ authPage: page }) => {
	const applicationId = await createApplication(page);
	const original = "I reduced packing errors by 12 percent.";
	const corrected = "I reduced packing errors by 8 percent.";

	await page.goto("/dashboard/career/knowledge/facts");
	await page.getByLabel("New fact").fill(original);
	await page.getByLabel("New fact").press("Enter");
	await expect(page.getByText(original, { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Correct", exact: true }).click();
	await page.getByLabel("Correct this fact").fill(corrected);
	const saved = page.waitForResponse((response) => response.url().includes("/career/updateFact") && response.ok());
	await page.getByRole("button", { name: "Save correction" }).click();
	await saved;
	await page.reload();
	await expect(page.getByText(corrected, { exact: true })).toBeVisible();

	// Stage Interview opens on Prepare; with no connection it says where to add one instead of failing.
	await page.goto(`/dashboard/applications/${applicationId}`);
	await expect(page.getByRole("tab", { name: /Prepare/, selected: true })).toBeVisible();
	await expect(page.getByRole("link", { name: "Connect an AI provider in Settings" })).toBeVisible();
});

test("a fit check's missing evidence is saved to Knowledge from the table", async ({ authPage: page }) => {
	test.skip(process.env.FLAG_ALLOW_UNSAFE_AI_BASE_URL !== "true", "Needs FLAG_ALLOW_UNSAFE_AI_BASE_URL=true");
	const applicationId = await createApplication(page);
	const provider = await page.request.post("/api/openapi/ai-providers", {
		data: { label: "Stub", provider: "openai-compatible", model: "stub", baseURL: stub.baseURL, apiKey: "stub-key" },
	});
	await expect(provider).toBeOK();
	await expect(await page.request.post(`/api/openapi/ai-providers/${(await provider.json()).id}/test`)).toBeOK();

	await page.goto(`/dashboard/applications/${applicationId}/fit`);
	await page.getByRole("button", { name: "Check fit" }).click();
	await expect(page.getByText("A relevant role, with one question to resolve")).toBeVisible({ timeout: 30_000 });
	await page.getByRole("button", { name: "Add evidence" }).click();
	const evidence = "I onboarded 40 enterprise accounts in 2024.";
	await page.getByLabel("What you did: Enterprise onboarding").fill(evidence);
	await page.getByRole("button", { name: "Save to Knowledge" }).click();
	await expect(page.getByText("Added by you").filter({ visible: true })).toBeVisible();

	await page.goto("/dashboard/career/knowledge/facts");
	await expect(page.getByText(evidence, { exact: true })).toBeVisible();
});
