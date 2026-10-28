import { createSampleResumeFromDashboard } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("fresh account prepares a linked blank resume and snapshots it on submission", async ({
	authPage: page,
}) => {
	await page.goto("/dashboard/applications");
	await page.getByRole("button", { name: "Save job", exact: true }).first().click();
	const save = page.getByRole("dialog", { name: "Save a job", exact: true });
	await save.getByLabel("Job link or posting text").fill("Write useful software for Fresh Company.");
	await save.getByLabel("Role", { exact: true }).fill("Engineer");
	await save.getByLabel("Company", { exact: true }).fill("Fresh Company");
	await save.getByRole("button", { name: "Save and prepare resume", exact: true }).click();
	await page.getByRole("button", { name: "Import or create a resume" }).click();
	await page.getByRole("button", { name: /^Start blank/ }).click();
	await page.waitForURL(/\/builder\//);
	await expect(page.getByRole("textbox", { name: "Full name", exact: true })).toBeVisible();
	const resumeId = new URL(page.url()).pathname.split("/").at(-1);
	expect(new URL(page.url()).searchParams.has("assistant")).toBe(false);
	const jobs = await (await page.request.get("/api/openapi/applications")).json();
	const job = jobs[0];
	expect(job).toMatchObject({ status: "saved", resumeId, sentResumeVersionId: null });
	expect((await (await page.request.get(`/api/openapi/resumes/${resumeId}`)).json()).applicationId).toBe(job.id);
	const attachment = await page.request.put(`/api/openapi/applications/${job.id}`, {
		data: { resumeFileUrl: "https://example.com/draft.pdf", resumeFileName: "Draft.pdf" },
	});
	await expect(attachment).toBeOK();
	await page.goto(`/dashboard/applications/${job.id}/answers`);
	await page.getByRole("button", { name: "Mark as applied", exact: true }).click();
	const readStatus = async () => {
		const response = await page.request.get(`/api/openapi/applications/${job.id}`);
		return (await response.json()).status;
	};
	await expect.poll(readStatus).toBe("applied");
	const applied = await (await page.request.get(`/api/openapi/applications/${job.id}`)).json();
	expect(applied).toMatchObject({ status: "applied", resumeId });
	expect(applied.sentResumeVersionId).toBeTruthy();
});

test("save, manually prepare a copy, and confirm submitted documents without services", async ({
	authPage: page,
}, testInfo) => {
	const baseName = await createSampleResumeFromDashboard(page, testInfo);
	// oxlint-disable-next-line typescript/no-non-null-assertion -- The dashboard fixture waits for the builder URL before returning.
	const baseId = new URL(page.url()).pathname.split("/").at(-1)!;
	const original = await (await page.request.get(`/api/openapi/resumes/${baseId}`)).json();
	await page.goto("/dashboard/applications");
	await page.getByRole("button", { name: "Save job", exact: true }).first().click();
	const save = page.getByRole("dialog", { name: "Save a job", exact: true });
	await save
		.getByLabel("Job link or posting text")
		.fill("Engineer at Example. Build accessible web applications with TypeScript.");
	await save.getByLabel("Role", { exact: true }).fill("Engineer");
	await save.getByLabel("Company", { exact: true }).fill("Example");
	await save.getByLabel("Resume (optional)").selectOption(baseId);
	await save.getByRole("button", { name: "Save and prepare resume", exact: true }).click();
	const copy = page.getByRole("dialog", { name: "Copy a resume for a job", exact: true });
	await expect(copy.getByText(baseName, { exact: true })).toBeVisible();
	await copy.getByRole("button", { name: "Create and open" }).click();
	await page.waitForURL(/\/builder\//);
	// oxlint-disable-next-line typescript/no-non-null-assertion -- waitForURL above verifies navigation to the new resume builder.
	const copyId = new URL(page.url()).pathname.split("/").at(-1)!;
	expect(copyId).not.toBe(baseId);
	await expect(page.getByRole("textbox", { name: "Full name", exact: true })).toBeVisible();
	expect(new URL(page.url()).searchParams.has("assistant")).toBe(false);
	const jobs = await (await page.request.get("/api/openapi/applications")).json();
	const job = jobs.find((item: { company: string }) => item.company === "Example");
	expect(job).toMatchObject({
		status: "saved",
		resumeId: copyId,
		sentResumeVersionId: null,
		postingSource: { method: "paste", truncated: false },
	});
	expect((await (await page.request.get(`/api/openapi/resumes/${baseId}`)).json()).data).toEqual(original.data);

	await page.goto(`/dashboard/applications/${job.id}/answers`);
	await page.getByRole("button", { name: "Mark as applied", exact: true }).click();
	const readStatus = async () => {
		const response = await page.request.get(`/api/openapi/applications/${job.id}`);
		return (await response.json()).status;
	};
	await expect.poll(readStatus).toBe("applied");
	const applied = await (await page.request.get(`/api/openapi/applications/${job.id}`)).json();
	expect(applied.status).toBe("applied");
	expect(applied.appliedAt).toBeTruthy();
	expect(applied.sentResumeVersionId).toBeTruthy();
	const working = await (await page.request.get(`/api/openapi/resumes/${copyId}`)).json();
	const edited = await page.request.put(`/api/openapi/resumes/${copyId}`, {
		data: {
			name: "Edited after submitting",
			data: { ...working.data, basics: { ...working.data.basics, name: "Changed after submission" } },
		},
	});
	await expect(edited).toBeOK();
	expect((await (await page.request.get(`/api/openapi/applications/${job.id}`)).json()).sentResumeVersionId).toBe(
		applied.sentResumeVersionId,
	);
	const sent = await (
		await page.request.get(`/api/openapi/resumes/${copyId}/versions/${applied.sentResumeVersionId}`)
	).json();
	expect(sent.data).toEqual(working.data);
	expect((await (await page.request.get(`/api/openapi/resumes/${baseId}`)).json()).data).toEqual(original.data);
});

test("unreadable link preserves fields and source while offering immediate paste recovery", async ({
	authPage: page,
}) => {
	await page.goto("/dashboard/applications");
	await page.getByRole("button", { name: "Save job", exact: true }).first().click();
	const dialog = page.getByRole("dialog", { name: "Save a job", exact: true });
	const source = "https://127.0.0.1/job";
	await dialog.getByLabel("Job link or posting text").fill(source);
	await dialog.getByLabel("Role", { exact: true }).fill("Manual role");
	await dialog.getByLabel("Company", { exact: true }).fill("Manual company");
	await dialog.getByRole("button", { name: "Read posting", exact: true }).click();
	await expect(dialog.getByLabel("Pasted description")).toBeVisible();
	await expect(dialog.getByLabel("Role", { exact: true })).toHaveValue("Manual role");
	await expect(dialog.getByLabel("Job link or posting text")).toHaveValue(source);
	await dialog.getByLabel("Pasted description").fill("Complete manual description");
	await dialog.getByRole("button", { name: "Save job", exact: true }).click();
	await expect(dialog).not.toBeVisible();
	const jobs = await (await page.request.get("/api/openapi/applications")).json();
	expect(jobs[0]).toMatchObject({ sourceUrl: source, jobDescription: "Complete manual description", status: "saved" });
	await page.goto(`/dashboard/applications/${jobs[0].id}/summary`);
	const external = page.getByRole("link", { name: "Original posting", exact: true });
	await expect(external).toHaveAttribute("href", source);
	const popup = page.waitForEvent("popup");
	await external.click();
	await (await popup).close();
	expect((await (await page.request.get(`/api/openapi/applications/${jobs[0].id}`)).json()).status).toBe("saved");
});

test("pasted descriptions announce clipping before preparation and preserve bounded evidence", async ({
	authPage: page,
}) => {
	await page.goto("/dashboard/applications");
	await page.getByRole("button", { name: "Save job", exact: true }).first().click();
	const dialog = page.getByRole("dialog", { name: "Save a job", exact: true });
	await dialog.getByLabel("Job link or posting text").fill("Description ".repeat(2000));
	await expect(dialog.getByRole("alert")).toContainText("clipped or incomplete");
	await dialog.getByLabel("Role", { exact: true }).fill("Engineer");
	await dialog.getByLabel("Company", { exact: true }).fill("Clipped");
	await dialog.getByRole("button", { name: "Save job", exact: true }).click();
	await expect(dialog).not.toBeVisible();
	const jobs = await (await page.request.get("/api/openapi/applications")).json();
	expect(jobs[0].jobDescription).toHaveLength(20_000);
	expect(jobs[0].postingSource).toMatchObject({ truncated: true, completeness: "incomplete" });
});
