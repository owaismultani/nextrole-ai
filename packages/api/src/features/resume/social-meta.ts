import type { ResumeSocialMeta } from "@reactive-resume/resume/social-meta";
import { getResumeSocialMeta } from "@reactive-resume/resume/social-meta";
import { redactResumeForViewer } from "./access-policy";
import { parseStoredResumeData } from "./resume-data-validation";

export type PublicResumeSocialMetaInput = { username: string; slug: string };

// Only public, password-free resumes outside Trash are matched. Password-protected resumes must not
// leak their summary to an unauthenticated crawler, and this read deliberately skips the view counting
// and access gating in resumeService.getBySlug — a card render is not a visit.
const findResume = async ({ username, slug }: PublicResumeSocialMetaInput) => {
	const [{ db }, schema, { and, eq, isNull }] = await Promise.all([
		import("@reactive-resume/db/client"),
		import("@reactive-resume/db/schema"),
		import("drizzle-orm"),
	]);
	const [resume] = await db
		.select({ name: schema.resume.name, data: schema.resume.data })
		.from(schema.resume)
		.innerJoin(schema.user, eq(schema.resume.userId, schema.user.id))
		.where(
			and(
				eq(schema.resume.slug, slug),
				eq(schema.user.username, username),
				eq(schema.resume.isPublic, true),
				isNull(schema.resume.password),
				isNull(schema.resume.trashedAt),
			),
		);

	return resume ?? null;
};

export async function getPublicResumeSocialMeta(input: PublicResumeSocialMetaInput): Promise<ResumeSocialMeta | null> {
	const resume = await findResume(input);
	if (!resume) return null;

	// The card shows what an anonymous visitor gets: no dashboard title, nothing the author hid.
	const visible = redactResumeForViewer({ name: resume.name, data: parseStoredResumeData(resume.data) }, false);
	return getResumeSocialMeta(visible.data, visible.name);
}
