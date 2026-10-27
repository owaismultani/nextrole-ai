/**
 * Seeds a fictional demo account for recording the landing page's product tour: Alex Morgan, a product manager in
 * Berlin, with a baseline resume, Knowledge, a discovery schedule and its last run, applications at every stage, an
 * interview with a briefing, a fit check, a tailored resume and cover letter, and two offers to compare.
 *
 * Local only: it refuses anything but a loopback APP_URL and DATABASE_URL, and it replaces the demo account each run.
 * Everything goes through the public API except a discovery run's history (its roles, results and notifications),
 * which only a real search could otherwise produce. The schedule is left enabled with its next run hours away; pass
 * `--pause` afterwards to switch it off so it never searches for real.
 *
 *   pnpm --filter @reactive-resume/tooling exec tsx landing/seed-demo.ts
 *   pnpm --filter @reactive-resume/tooling exec tsx landing/seed-demo.ts --pause
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { demoAccount } from "./demo-account";

const root = join(import.meta.dirname, "..", "..");
for (const file of [".env.local", ".env"]) if (existsSync(join(root, file))) process.loadEnvFile(join(root, file));

const base = new URL(process.env.DEMO_APP_URL ?? "http://localhost:3000");
const databaseUrl = process.env.DATABASE_URL ?? "";
const loopback = ["localhost", "127.0.0.1", "[::1]"];
assert(loopback.includes(base.hostname), "Seeding needs a local APP_URL.");
assert(
	loopback.some((host) => databaseUrl.includes(`@${host}`)),
	"Seeding needs a local DATABASE_URL.",
);

const pool = new Pool({ connectionString: databaseUrl });

if (process.argv.includes("--pause")) {
	await pool.query(
		`update career_schedule set enabled = false where user_id = (select id from "user" where email = $1)`,
		[demoAccount.email],
	);
	await pool.end();
	console.log("Demo discovery schedule paused.");
	process.exit(0);
}

// ---- The account ---------------------------------------------------------------------------------------------------

await pool.query(`delete from "user" where email = $1 or username = $2`, [demoAccount.email, demoAccount.username]);

const signUp = await fetch(new URL("/api/auth/sign-up/email", base), {
	method: "POST",
	headers: { "content-type": "application/json", origin: base.origin, referer: `${base.origin}/auth/register` },
	body: JSON.stringify({ ...demoAccount, displayUsername: demoAccount.username, callbackURL: "/dashboard" }),
});
assert(signUp.ok, `Sign-up failed: ${signUp.status} ${await signUp.clone().text()}`);
const cookie = signUp.headers
	.getSetCookie()
	.map((value) => value.split(";")[0])
	.join("; ");
assert(cookie, "Sign-up returned no session.");
const { rows: users } = await pool.query<{ id: string }>(`select id from "user" where email = $1`, [demoAccount.email]);
const userId = users[0]?.id;
assert(userId);
// Times show in the account's timezone; the demo lives in Berlin.
await pool.query(`update "user" set timezone = 'Europe/Berlin' where id = $1`, [userId]);

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
	const response = await fetch(new URL(`/api/openapi${path}`, base), {
		method,
		headers: { cookie, origin: base.origin, ...(body === undefined ? {} : { "content-type": "application/json" }) },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	assert(response.ok, `${method} ${path} failed: ${response.status} ${await response.clone().text()}`);
	return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

// ---- Dates, relative to now, in Berlin ------------------------------------------------------------------------------

const now = new Date();
const day = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(now.getTime() - days * day);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
/** A wall-clock time in Berlin `days` from today, as an ISO string with its offset. */
function berlin(days: number, hours: number, minutes: number) {
	const date = new Date(now.getTime() + days * day);
	const local = `${isoDate(date)}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
	const offset = new Intl.DateTimeFormat("en", { timeZone: "Europe/Berlin", timeZoneName: "longOffset" })
		.formatToParts(date)
		.find((part) => part.type === "timeZoneName")
		?.value.replace("GMT", "");
	return `${local}${offset && offset.length > 0 ? offset : "+00:00"}`;
}

// ---- Baseline resume -------------------------------------------------------------------------------------------------

const resumeId = await api<string>("POST", "/resumes", {
	name: "Alex Morgan · Product Manager",
	slug: "alex-morgan",
	tags: ["baseline"],
	withSampleData: true,
});

const html = (items: string[]) => `<ul>${items.map((item) => `<li><p>${item}</p></li>`).join("")}</ul>`;
const resumeData = structuredClone(sampleResumeData);
resumeData.basics = {
	...resumeData.basics,
	name: "Alex Morgan",
	headline: "Senior Product Manager · B2B SaaS onboarding and activation",
	email: "alex.morgan@demo.nextrole.test",
	phone: "+49 30 5550 1942",
	location: "Berlin, Germany",
	website: { url: "https://alexmorgan.example", label: "alexmorgan.example" },
	customFields: [],
};
resumeData.picture = { ...resumeData.picture, hidden: true };
resumeData.summary = {
	...resumeData.summary,
	content:
		"<p>Product manager with seven years in B2B SaaS, most of them on onboarding and activation. I run customer discovery every week, ship small experiments, and work closely with design and engineering to turn first sessions into habits.</p>",
};
const experienceTemplate = sampleResumeData.sections.experience.items[0];
assert(experienceTemplate);
resumeData.sections.experience.items = [
	{
		...experienceTemplate,
		id: randomUUID(),
		company: "Brightwave",
		position: "Senior Product Manager, Onboarding",
		location: "Berlin",
		period: "2022 – Present",
		description: html([
			"Own new-customer onboarding for a B2B analytics platform used by 4,000 teams.",
			"Cut three friction points in setup, lifting week-one activation by 17 points in a quarter.",
			"Run weekly customer discovery calls and a shared insight library the whole team uses.",
		]),
	},
	{
		...experienceTemplate,
		id: randomUUID(),
		company: "Ledgerline",
		position: "Product Manager, Growth",
		location: "Berlin",
		period: "2019 – 2022",
		description: html([
			"Led the self-serve trial and pricing page experiments for an invoicing product.",
			"Shipped 40+ A/B tests with engineering and design; built the experiment review ritual.",
		]),
	},
	{
		...experienceTemplate,
		id: randomUUID(),
		company: "Parcelpoint",
		position: "Associate Product Manager",
		location: "Hamburg",
		period: "2017 – 2019",
		description: html(["Shipped the merchant dashboard's first reporting views with a team of five."]),
	},
];
const educationTemplate = sampleResumeData.sections.education.items[0];
assert(educationTemplate);
resumeData.sections.education.items = [
	{
		...educationTemplate,
		id: randomUUID(),
		school: "Technical University of Munich",
		degree: "Master of Science",
		area: "Management and Technology",
		grade: "",
		location: "Munich",
		period: "2015 – 2017",
		description: "",
	},
];
const skillTemplate = sampleResumeData.sections.skills.items[0];
assert(skillTemplate);
resumeData.sections.skills.items = [
	["Product discovery", "Expert", 5, ["Customer interviews", "Jobs to be done", "Opportunity trees"]],
	["Experimentation", "Advanced", 4, ["A/B testing", "Amplitude", "SQL"]],
	["Onboarding and activation", "Expert", 5, ["Lifecycle email", "In-app guides", "Activation metrics"]],
	["Collaboration", "Advanced", 4, ["Roadmaps", "Design critiques", "Stakeholder updates"]],
].map(([name, proficiency, level, keywords]) => ({
	...skillTemplate,
	id: randomUUID(),
	icon: "",
	name: name as string,
	proficiency: proficiency as string,
	level: level as number,
	keywords: keywords as string[],
}));
const profileTemplate = sampleResumeData.sections.profiles.items[0];
assert(profileTemplate);
resumeData.sections.profiles.items = [
	{
		...profileTemplate,
		id: randomUUID(),
		network: "LinkedIn",
		username: "alexmorgan-pm",
		icon: "linkedin-logo",
		website: { ...profileTemplate.website, url: "https://linkedin.example/alexmorgan-pm", label: "alexmorgan-pm" },
	},
];
for (const key of [
	"projects",
	"awards",
	"certifications",
	"publications",
	"volunteer",
	"references",
	"interests",
] as const) {
	const section = resumeData.sections[key] as { items: unknown[] } | undefined;
	if (section) section.items = [];
}
await api("PUT", `/resumes/${resumeId}`, { data: resumeData });
await api("POST", "/career/setup/baseline", { resumeId });
await api("POST", "/career/setup/skip", {});

// ---- Knowledge ------------------------------------------------------------------------------------------------------

await api("PUT", "/career/profile", {
	targetRoles: ["Senior Product Manager", "Product Lead"],
	locations: ["Berlin", "Remote, EU"],
	priorities: "A team that ships small and often, real ownership of activation, and two office days at most.",
	minBase: { amount: 90000, currency: "EUR", period: "year" },
	maxOfficeDays: 2,
	noticeWeeks: 8,
	memoryMode: "ask",
});

// Typed in by hand, as the Facts page does: a manual source quotes itself.
const manual = (quote: string) => ({ kind: "manual", id: "facts", quote });
const facts: Record<string, string> = {};
for (const [key, text, category] of [
	["activation", "Lifted week-one activation by 17 points in one quarter at Brightwave.", "accomplishment"],
	[
		"friction",
		"Found and removed three setup friction points from session recordings and interviews.",
		"accomplishment",
	],
	["discovery", "Run four to six customer discovery calls every week.", "experience"],
	["experiments", "Shipped more than 40 A/B tests at Ledgerline.", "experience"],
	["saas", "Seven years in B2B SaaS product roles.", "experience"],
	["sql", "Write my own SQL for experiment analysis.", "skill"],
] as const) {
	const fact = await api<{ id: string }>("POST", "/career/facts", {
		applicationId: null,
		text,
		category,
		source: manual(text),
	});
	facts[key] = fact.id;
}

const stories: Record<string, string> = {};
for (const story of [
	{
		key: "onboarding",
		title: "Turning onboarding friction into a 17-point activation lift",
		situation: "New Brightwave customers stalled during setup; only a third reached a first dashboard in week one.",
		task: "I owned activation and had one quarter to move it.",
		action:
			"I watched 60 session recordings, ran twelve interviews, and found three friction points. We shipped the smallest fix for each behind an experiment.",
		result: "Week-one activation rose by 17 points, and the fixes became the default for every new team.",
		reflection: "Ship the smallest test first; the big redesign we had planned was never needed.",
		factIds: [facts.activation, facts.friction],
		tags: ["activation", "onboarding"],
	},
	{
		key: "insight",
		title: "Building a shared customer-insight habit",
		situation: "Interview notes lived in personal docs, so engineers rarely heard from customers.",
		task: "Make customer insight something the whole team used every week.",
		action:
			"I set up a shared insight library and a 20-minute Friday readout, and invited engineers to two calls a month.",
		result: "Every squad now cites customer evidence in its planning documents.",
		reflection: "Rituals beat repositories; the readout mattered more than the library.",
		factIds: [facts.discovery],
		tags: ["discovery"],
	},
]) {
	const { key, ...data } = story;
	const saved = await api<{ id: string }>("POST", "/career/stories", { applicationId: null, ...data });
	stories[key] = saved.id;
}

// ---- Applications ---------------------------------------------------------------------------------------------------

type Seeded = { id: string; company: string; role: string };
const applications: Record<string, Seeded> = {};
const posting = (company: string, role: string) =>
	`${company} is hiring a ${role} to own the journey from sign-up to habit. You'll run customer discovery, design experiments with engineering and design, and report on activation each week.`;

for (const [key, company, role, status, daysInStage, extra] of [
	["mosaic", "Mosaic Cloud", "Senior Product Manager", "screening", 3, { location: "Remote, EU", salary: "€95–110k" }],
	["northstar", "Northstar Labs", "Senior Product Manager", "interview", 6, { location: "Berlin · Hybrid" }],
	["fieldwork", "Fieldwork", "Product Lead, Activation", "applied", 4, { location: "Berlin" }],
	["harbor", "Harbor Health", "Product Manager", "applied", 9, { location: "Remote, EU" }],
	["kestrel", "Kestrel AI", "Senior Product Manager", "applied", 12, { location: "Munich · Hybrid" }],
	["quarry", "Quarry", "Product Lead", "offer", 2, { location: "Remote, EU" }],
	["atlas", "Atlas Freight", "Group Product Manager", "offer", 1, { location: "Berlin · Hybrid" }],
	["lumen", "Lumen", "Staff Product Manager, Growth", "closed", 20, { closedReason: "not-selected" }],
	["tidewater", "Tidewater", "Senior Product Manager", "closed", 30, { closedReason: "no-response" }],
	["brightline", "Brightline", "Senior Product Manager, Platform", "saved", 1, { location: "Amsterdam · Hybrid" }],
	["orbital", "Orbital Pay", "Product Manager, Payments", "saved", 2, { location: "Remote, EU" }],
	["juniper", "Juniper Health", "Product Manager", "saved", 1, { location: "Berlin" }],
] as const) {
	const id = await api<string>("POST", "/applications", {
		company,
		role,
		status,
		stageEnteredAt: isoDate(daysAgo(daysInStage)),
		jobDescription: posting(company, role),
		requirements: ["Customer discovery", "Experiment design", "B2B SaaS onboarding", "Pricing ownership"],
		source: "NextRole discovery",
		tags: ["demo"],
		...extra,
	});
	applications[key] = { id, company, role };
}

const northstar = applications.northstar;
const mosaic = applications.mosaic;
assert(northstar && mosaic);
await api("PATCH", `/applications/${northstar.id}`, {
	contacts: [
		{ name: "Maya Chen", role: "Head of Product", type: "Hiring Manager" },
		{ name: "Leo Fischer", role: "Design Lead", type: "Interviewer" },
	],
	notes:
		"Strong match for activation ownership. Maya wants an onboarding case study, one disagreement story and two questions about the first 90 days.",
});
await api("POST", `/applications/${northstar.id}/interviews`, {
	at: berlin(2, 17, 58),
	kind: "behavioral",
	durationMinutes: 45,
});
await api("POST", `/applications/${applications.fieldwork?.id}/interviews`, {
	at: berlin(5, 10, 30),
	kind: "screening",
	durationMinutes: 30,
});

// A tailored copy and a cover letter for Mosaic Cloud.
const tailoredId = await api<string>("POST", "/documents/copy-for-job", { resumeId, applicationId: mosaic.id });
const tailored = structuredClone(resumeData);
tailored.summary = {
	...tailored.summary,
	content:
		"<p>Product manager with seven years in B2B SaaS, leading product-led onboarding and activation. I run customer discovery every week and ship weekly experiments with design and engineering.</p>",
};
await api("PUT", `/resumes/${tailoredId}`, { data: tailored });
const letter = await api<{ id: string }>("POST", "/cover-letters", {
	name: "Mosaic Cloud · Cover letter",
	resumeId: tailoredId,
	recipientCompany: "Mosaic Cloud",
	letterDate: isoDate(now),
	content:
		"<p>Dear Mosaic Cloud team,</p><p>Your posting asks for someone who can own the journey from sign-up to habit. At Brightwave I did exactly that: by removing three setup friction points I found in recordings and interviews, we lifted week-one activation by 17 points in a quarter.</p><p>I run customer discovery every week and ship small experiments with design and engineering. I'd love to bring that rhythm to Mosaic's onboarding.</p><p>Best regards,<br>Alex Morgan</p>",
});
await api("PATCH", `/applications/${mosaic.id}`, { resumeId: tailoredId, coverLetterId: letter.id });

// Two offers to compare.
await api("POST", "/career/offers", {
	applicationId: applications.atlas?.id,
	terms: {
		version: "written",
		currency: "EUR",
		period: "year",
		base: 98000,
		variable: 10000,
		variableConditions: "Company and personal goals",
		equity: "0.05% over four years",
		location: "Berlin",
		officeDays: 3,
		leave: "28 days",
		learning: 2000,
		other: "",
		respondBy: berlin(6, 18, 0),
	},
});
await api("POST", "/career/offers", {
	applicationId: applications.quarry?.id,
	terms: {
		version: "verbal",
		currency: "EUR",
		period: "year",
		base: 92000,
		variable: null,
		variableConditions: "",
		equity: "",
		location: "Remote, EU",
		officeDays: 0,
		leave: "30 days",
		learning: null,
		other: "Four-day weeks in August",
		respondBy: null,
	},
});

// ---- Discovery: the schedule through the API, its last run as a real one would leave it ----------------------------

const schedule = await api<{ id: string }>("POST", "/career/schedules", {
	applicationId: null,
	kind: "discovery",
	query: "Senior product manager B2B SaaS onboarding",
	enabled: false,
	email: false,
	nextRunAt: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
	timezone: "Europe/Berlin",
	intervalMinutes: 360,
	intervalDays: null,
});

const runAt = new Date(now.getTime() - 50 * 60 * 1000);
const bySource = [
	["himalayas", 9, 1],
	["remoteok", 6, 0],
	["themuse", 7, 1],
	["arbeitnow", 8, 1],
	["weworkremotely", 4, 0],
	["web", 6, 0],
] as const;
const report = {
	outcome: "success",
	failure: null,
	trigger: "schedule",
	at: runAt.toISOString(),
	queries: ["Senior product manager B2B SaaS onboarding", "Product lead activation"],
	provider: "Job sources",
	sources: bySource.map(([source]) => source),
	found: 40,
	duplicates: 18,
	rejected: 4,
	readFailures: 0,
	filtered: 15,
	matches: 3,
	bySource: bySource.map(([source, found, kept]) => ({ source, found, kept, status: "ok", reason: null })),
};
const runId = randomUUID();
await pool.query(
	`insert into career_run (id, user_id, schedule_id, report, created_at, updated_at) values ($1, $2, $3, $4, $5, $5)`,
	[runId, userId, schedule.id, report, runAt],
);
await pool.query(
	`update career_schedule set enabled = true, last_attempted_at = $2, last_succeeded_at = $2, last_run = $3 where id = $1`,
	[schedule.id, runAt, report],
);

const found = [
	["Senior Product Manager, Activation", "Mosaic Cloud", "Berlin, DE", "himalayas", mosaic.id],
	["Product Lead, Onboarding", "Fieldwork", "Remote within Europe", "arbeitnow", null],
	["Senior PM, Self-serve", "Lattice Rail", "Berlin · Hybrid", "themuse", null],
	["Product Manager, Growth", "Canopy Analytics", "Remote, EU", "himalayas", null],
] as const;
for (const [index, [role, company, location, source, trackedId]] of found.entries()) {
	const url = `https://jobs.example.test/${company.toLowerCase().replaceAll(" ", "-")}/${index}`;
	const opportunityId = randomUUID();
	await pool.query(
		`insert into career_opportunity (id, user_id, url, role, company, location, snippet, description, run_id, source, tracked_application_id, first_seen_at, last_seen_at, posted_at, created_at, updated_at)
		 values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, $12, $12)`,
		[
			opportunityId,
			userId,
			url,
			role,
			company,
			location,
			`Own the journey from sign-up to habit at ${company}: customer discovery, experiments and activation.`,
			posting(company, role),
			runId,
			source,
			trackedId,
			runAt,
			daysAgo(index + 1),
		],
	);
	await pool.query(
		`insert into career_run_item (id, run_id, user_id, url, host, title, decision, source) values ($1, $2, $3, $4, 'jobs.example.test', $5, 'match', $6)`,
		[randomUUID(), runId, userId, url, `${role} · ${company}`, source],
	);
	if (trackedId) {
		for (const [kind, outputId] of [
			["resume", tailoredId],
			["cover-letter", letter.id],
		] as const) {
			await pool.query(
				`insert into career_preparation (id, user_id, opportunity_id, application_id, kind, status, output_id, output_generation, baseline_resume_id, started_at, completed_at, created_at, updated_at, issues)
				 values ($1, $2, $3, $4, $5, 'done', $6, 1, $7, $8, $9, $8, $9, $10)`,
				[
					randomUUID(),
					userId,
					opportunityId,
					trackedId,
					kind,
					outputId,
					resumeId,
					runAt,
					new Date(runAt.getTime() + 90_000),
					JSON.stringify(kind === "cover-letter" ? ["Who the letter should be addressed to"] : []),
				],
			);
		}
	}
}
for (const [title, decision] of [
	["Staff PM, Growth · Lumen (on-site, Austin)", "filtered"],
	["Product Lead · Harbor (posting closed)", "rejected"],
] as const) {
	await pool.query(
		`insert into career_run_item (id, run_id, user_id, url, host, title, decision, source) values ($1, $2, $3, $4, 'jobs.example.test', $5, $6, 'himalayas')`,
		[randomUUID(), runId, userId, `https://jobs.example.test/${randomUUID()}`, title, decision],
	);
}

// ---- Coach work: a fit check and an interview briefing --------------------------------------------------------------

const northstarDetails = await api<{ activity: { id: string; type?: string; kind?: string }[] }>(
	"GET",
	`/applications/${northstar.id}`,
);
const interviewId = northstarDetails.activity.find((entry) => entry.type === "interview")?.id ?? null;

const artifacts = [
	{
		applicationId: mosaic.id,
		interviewId: null,
		title: "Fit · Senior Product Manager, Mosaic Cloud",
		data: {
			kind: "fit",
			headline: "A strong match on onboarding and discovery",
			summary: "Your Knowledge supports three of the four requirements. Pricing ownership has no evidence yet.",
			requirements: [
				{
					text: "Customer discovery",
					origin: "posting",
					status: "supported",
					evidence: "Two stories and a weekly habit of discovery calls.",
					factIds: [facts.discovery],
				},
				{
					text: "Experiment design",
					origin: "posting",
					status: "supported",
					evidence: "More than 40 A/B tests at Ledgerline.",
					factIds: [facts.experiments],
				},
				{
					text: "B2B SaaS onboarding",
					origin: "posting",
					status: "supported",
					evidence: "Owned onboarding at Brightwave; +17 points activation.",
					factIds: [facts.activation, facts.saas],
				},
				{
					text: "Pricing ownership",
					origin: "posting",
					status: "missing",
					evidence: "No evidence yet. Pricing page experiments at Ledgerline may be related.",
					factIds: [],
				},
			],
			checks: [
				{ label: "Salary", met: true, text: "€95–110k is above your minimum." },
				{ label: "Office days", met: true, text: "Remote within the EU." },
			],
			ask: { person: "Recruiter", text: "Does the role own pricing, or partner with a pricing team?" },
		},
	},
	{
		applicationId: northstar.id,
		interviewId,
		title: "Briefing · Northstar Labs",
		data: {
			kind: "briefing",
			headline: "A focused 30-minute plan",
			summary: "Built from the posting, Maya's request and your two strongest stories.",
			plan: [
				{
					minutes: 10,
					title: "Your onboarding case study",
					detail: "Explain the customer problem, what you personally led, and how the team measured activation.",
					action: "story",
					storyId: stories.onboarding,
				},
				{
					minutes: 10,
					title: "Trade-offs and collaboration",
					detail:
						"Rehearse why you prioritised three friction points. Bring one example of a disagreement with engineering.",
					action: "draft-story",
					storyId: null,
				},
				{
					minutes: 5,
					title: "Company questions",
					detail: "Ask about activation milestones, team ownership, and the first 90 days.",
					action: "questions",
					storyId: null,
				},
				{
					minutes: 5,
					title: "Say it aloud",
					detail: "Practise your introduction once. Keep the first answer to about 90 seconds.",
					action: "practise",
					storyId: null,
				},
			],
			questions: [
				{ text: "What would success look like in the first 90 days?", origin: "Maya's request" },
				{ text: "Where do new teams struggle most today?", origin: "Briefing" },
			],
			focus: "Lead with the onboarding case study; Maya asked for it by name.",
			opening:
				"I'm a product manager who lives in onboarding: my best quarter lifted week-one activation by 17 points.",
			stories: [
				"Turning onboarding friction into a 17-point activation lift",
				"Building a shared customer-insight habit",
			],
			honesty: "You haven't owned pricing; say so, and point to the pricing-page experiments instead.",
			storyIds: [stories.onboarding, stories.insight],
			missingStory: "A disagreement with engineering, and how you resolved it.",
			practiceQuestions: ["Tell me about a time you changed a roadmap because of customer evidence."],
		},
	},
];
for (const artifact of artifacts) {
	await pool.query(
		`insert into career_artifact (id, user_id, application_id, interview_id, title, data, evidence, input_version, created_at, updated_at)
		 values ($1, $2, $3, $4, $5, $6, $7, 'demo', $8, $8)`,
		[
			randomUUID(),
			userId,
			artifact.applicationId,
			artifact.interviewId,
			artifact.title,
			artifact.data,
			{ factIds: Object.values(facts), storyIds: Object.values(stories) },
			daysAgo(0.1),
		],
	);
}

// ---- Notifications --------------------------------------------------------------------------------------------------

for (const [key, notice, url, applicationId] of [
	[
		"demo-opportunities",
		{ type: "opportunities", count: 3, query: "Senior product manager B2B SaaS onboarding" },
		"/dashboard/discover",
		null,
	],
	[
		"demo-briefing",
		{ type: "briefing", company: "Northstar Labs", role: "Senior Product Manager" },
		null,
		northstar.id,
	],
	[
		"demo-followup",
		{ type: "followup", company: "Harbor Health", role: "Product Manager" },
		null,
		applications.harbor?.id,
	],
] as const) {
	await pool.query(
		`insert into career_notification (id, user_id, application_id, key, notice, url, created_at, updated_at) values ($1, $2, $3, $4, $5, $6, $7, $7)`,
		[randomUUID(), userId, applicationId, key, notice, url, runAt],
	);
}

await pool.end();
console.log(`Demo account ready: ${demoAccount.email} / ${demoAccount.password}`);
