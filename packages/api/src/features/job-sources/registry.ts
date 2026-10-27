import type { CompanyBoardAdapter, JobSearchAdapter } from "./types";
import type { CompanyBoard, JobSearchSource } from "@reactive-resume/schema/career";
import { ashby } from "./boards/ashby";
import { greenhouse } from "./boards/greenhouse";
import { lever } from "./boards/lever";
import { personio } from "./boards/personio";
import { recruitee } from "./boards/recruitee";
import { smartrecruiters } from "./boards/smartrecruiters";
import { workable } from "./boards/workable";
import { workday } from "./boards/workday";
import { adzuna } from "./sources/adzuna";
import { arbeitnow } from "./sources/arbeitnow";
import { bundesagentur } from "./sources/bundesagentur";
import { himalayas } from "./sources/himalayas";
import { jobicy } from "./sources/jobicy";
import { jooble } from "./sources/jooble";
import { reed } from "./sources/reed";
import { remoteok } from "./sources/remoteok";
import { themuse } from "./sources/themuse";
import { usajobs } from "./sources/usajobs";
import { weworkremotely } from "./sources/weworkremotely";

export const searchSources: Record<JobSearchSource, JobSearchAdapter> = {
	adzuna,
	reed,
	jooble,
	usajobs,
	bundesagentur,
	himalayas,
	jobicy,
	themuse,
	arbeitnow,
	remoteok,
	weworkremotely,
};

/** Sources whose own search narrows results by the query; the rest are whole feeds the query filters here. */
export const SEARCHES_BY_QUERY = new Set<string>([
	"adzuna",
	"reed",
	"jooble",
	"usajobs",
	"bundesagentur",
	"himalayas",
	"jobicy",
	"workday",
]);

export const companyBoards: Record<CompanyBoard, CompanyBoardAdapter> = {
	greenhouse,
	lever,
	ashby,
	smartrecruiters,
	recruitee,
	personio,
	workable,
	workday,
};
