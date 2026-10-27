import type { CompanyBoard, FollowedCompany } from "@reactive-resume/schema/career";
import { companyBoards } from "./registry";

/**
 * The company board behind a careers page or posting address: "jobs.lever.co/acme/…" is Lever's board "acme". Only
 * known hosts are read, and the board name must pass its adapter's pattern, so the result can't point anywhere else.
 */
export function boardOf(input: string): { kind: CompanyBoard; slug: string } | null {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return null;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return null;
	const host = url.hostname.toLowerCase().replace(/^www\./, "");
	const [first = "", second = ""] = url.pathname.split("/").filter(Boolean);
	const found = ((): { kind: CompanyBoard; slug: string } | null => {
		if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io")
			return { kind: "greenhouse", slug: first === "embed" ? (url.searchParams.get("for") ?? "") : first };
		if (host === "boards-api.greenhouse.io" && first === "v1")
			return { kind: "greenhouse", slug: url.pathname.split("/")[3] ?? "" };
		if (host === "jobs.lever.co") return { kind: "lever", slug: first };
		if (host === "jobs.eu.lever.co") return { kind: "lever", slug: `eu/${first}` };
		if (host === "jobs.ashbyhq.com") return { kind: "ashby", slug: first };
		if (host === "apply.workable.com" && first !== "j" && first !== "api") return { kind: "workable", slug: first };
		if (host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com")
			return { kind: "smartrecruiters", slug: first };
		const recruitee = host.match(/^([a-z0-9-]+)\.recruitee\.com$/);
		if (recruitee?.[1] && recruitee[1] !== "app") return { kind: "recruitee", slug: recruitee[1] };
		const personio = host.match(/^([a-z0-9-]+)\.jobs\.personio\.(de|com)$/);
		if (personio?.[1]) return { kind: "personio", slug: personio[2] === "com" ? `${personio[1]}.com` : personio[1] };
		const workday = host.match(/^([a-z0-9_-]+)\.(wd\d{1,3})\.myworkdayjobs\.com$/);
		if (workday?.[1] && workday[2]) {
			// A locale ("en-US") may come before the site name.
			const site = /^[a-z]{2}-[a-z]{2}$/i.test(first) ? second : first;
			return site && site !== "wday" ? { kind: "workday", slug: `${workday[1]}/${workday[2]}/${site}` } : null;
		}
		return null;
	})();
	if (!found?.slug || !companyBoards[found.kind].slug.test(found.slug)) return null;
	return found;
}

/** A readable company name from a board name: "acme-corp" reads "Acme Corp"; Workday's is its tenant. */
export const nameFromSlug = (slug: string) =>
	(slug.replace(/^eu\//, "").split("/")[0] ?? slug)
		.replace(/\.com$/, "")
		.replace(/[-_.]+/g, " ")
		.replace(/\b\w/g, (letter) => letter.toUpperCase())
		.trim();

/** Reads the board once, so a company is only followed when its list really answers, and says how many roles it has. */
export async function resolveCompany(
	input: string,
	signal: AbortSignal,
): Promise<(FollowedCompany & { openRoles: number }) | null> {
	const board = boardOf(input);
	if (!board) return null;
	const { company, postings } = await companyBoards[board.kind].list(board.slug, { query: "", signal });
	return {
		kind: board.kind,
		slug: board.slug,
		name: company || nameFromSlug(board.slug),
		openRoles: postings.length,
	};
}
