import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import { createResumeName } from "./data";

/**
 * Creates a sample resume named after the test and opens it in the editor. It goes through the API: the JSON import
 * spec covers the New dialog, and every other spec just needs a resume.
 */
export async function createSampleResumeFromDashboard(page: Page, testInfo: TestInfo) {
	const resumeName = createResumeName(testInfo);

	const response = await page.request.post("/api/openapi/resumes", {
		data: { name: resumeName, tags: [], withSampleData: true },
	});
	expect(response.ok()).toBe(true);
	const resumeId = (await response.json()) as string;

	await page.goto(`/builder/${resumeId}`);
	await page.waitForURL(/\/builder\/.+/);

	return resumeName;
}

export async function openSidebarSection(page: Page, title: string) {
	// The Share & export sheet hosts Sharing, without a heading of its own.
	if (title === "Sharing") {
		// "Share public resume" once the resume is public.
		await page.getByRole("button", { name: /^Share\b/ }).click();
		await expect(page.getByRole("dialog", { name: "Share & export" })).toBeVisible();
		return;
	}

	// Write: the Basics card is open by default; every other section is an outline row that opens on click.
	await page.getByRole("tab", { name: "Write", exact: true }).click();
	if (title === "Basics") {
		await expect(page.getByRole("textbox", { name: "Full name", exact: true })).toBeVisible();
		return;
	}
	// A custom section can share a built-in's title (the sample has two "Experience" sections); prefer the built-in.
	const builtIn = page.locator(`#sidebar-${title.toLowerCase()}`).getByRole("button", { name: title, exact: true });
	const row = (await builtIn.count()) > 0 ? builtIn : page.getByRole("button", { name: title, exact: true }).first();
	await row.scrollIntoViewIfNeeded();
	if ((await row.getAttribute("aria-expanded")) !== "true") await row.click();
	await expect(row).toHaveAttribute("aria-expanded", "true");
}

/** Opens Share & export on its Download tab, from the ▾ next to Download PDF. */
export async function openDownloadDialog(page: Page) {
	await page.getByRole("button", { name: "More download formats", exact: true }).click();
	const sheet = page.getByRole("dialog", { name: "Share & export" });
	await expect(sheet.getByRole("tab", { name: "Download", exact: true })).toHaveAttribute("aria-selected", "true");
	return sheet;
}

/** Turns the public link on in Share → Link and returns the public address. */
export async function makeResumePublic(page: Page) {
	await openSidebarSection(page, "Sharing");
	const sheet = page.getByRole("dialog", { name: "Share & export" });
	const publicLink = sheet.getByRole("switch", { name: "Public link" });
	// On phones the sheet rises from below the screen: wait until it has arrived before pressing.
	await expect(publicLink).toBeInViewport();
	await publicLink.click();
	return getPublicUrl(page);
}

/** The public address, from Share → Link's "Open public page" (it fills in once the session has loaded). */
export async function getPublicUrl(page: Page) {
	const link = page.getByRole("dialog", { name: "Share & export" }).getByRole("link", { name: "Open public page" });
	await expect(link).toHaveAttribute("href", /\/e2e_/);
	return (await link.getAttribute("href")) as string;
}
