import type { TestInfo } from "@playwright/test";

const sanitize = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

export type E2EAccount = {
	name: string;
	username: string;
	email: string;
	password: string;
};

function createRunSlug(testInfo: TestInfo) {
	const worker = testInfo.workerIndex;
	const title = sanitize(testInfo.titlePath.join("-")).slice(0, 32);
	const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

	return `e2e-${worker}-${title}-${suffix}`;
}

export function createAccount(testInfo: TestInfo): E2EAccount {
	const username = createRunSlug(testInfo).replaceAll("-", "_").slice(0, 64);

	return {
		name: "E2E Test User",
		username,
		email: `${username}@example.test`,
		password: "Password123!",
	};
}

export function createResumeName(testInfo: TestInfo) {
	return `E2E Resume ${createRunSlug(testInfo)}`;
}
