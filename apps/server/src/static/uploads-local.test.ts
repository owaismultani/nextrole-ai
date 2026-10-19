import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
	APP_URL: "https://resume.example.com",
	STORAGE_BACKEND: "local",
	LOCAL_STORAGE_PATH: "",
}));
vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));

let storage: ReturnType<typeof import("@reactive-resume/api/features/storage").getStorageService>;
let handleUpload: typeof import("./uploads").handleUpload;
beforeAll(async () => {
	envMock.LOCAL_STORAGE_PATH = await mkdtemp(join(tmpdir(), "resume-private-upload-"));
	storage = (await import("@reactive-resume/api/features/storage")).getStorageService();
	({ handleUpload } = await import("./uploads"));
});
afterAll(async () => {
	await rm(envMock.LOCAL_STORAGE_PATH, { recursive: true, force: true });
});

it("stores a private local attachment for authenticated reads and excludes it from public uploads", async () => {
	const key = "uploads/user-1/agent/thread-1/attachment-1";
	const data = new TextEncoder().encode("private attachment");
	await storage.write({ key, data, contentType: "text/plain", private: true });
	const stored = await storage.read(key);
	expect(stored).not.toBeNull();
	expect(Uint8Array.from(stored?.data ?? [])).toEqual(data);
	if (process.platform !== "win32")
		expect((await stat(join(envMock.LOCAL_STORAGE_PATH, key))).mode & 0o777).toBe(0o600);
	expect((await handleUpload(new Request(`${envMock.APP_URL}/api/${key}`))).status).toBe(404);
});

it.each(["uploads/user-1/pictures/private", "uploads/../agent/thread-1/private", "uploads/user-1/agent/../private"])(
	"rejects private writes outside the canonical attachment namespace: %s",
	async (key) => {
		await expect(
			storage.write({ key, data: new Uint8Array([1]), contentType: "text/plain", private: true }),
		).rejects.toThrow();
		expect(await storage.read(key)).toBeNull();
	},
);
