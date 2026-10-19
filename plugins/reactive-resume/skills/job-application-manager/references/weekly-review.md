# Weekly review: calculations, benchmarks, diagnosis, pacing

Detail behind SKILL.md §4. The review exists to produce next week's actions. Stats come second, and only when there is enough data to mean something.

## Contents

1. Procedure
2. Definitions and calculations
3. Benchmarks (planning ranges)
4. Diagnosis and normal variance
5. Input goals
6. Pacing and wellbeing
7. Output variants
8. Dubious statistics to avoid
9. Sources

## 1. Procedure

1. **Pull everything.** With MCP: `get_application_stats` for the headline counts, then `list_applications {limit: 100}` page by page until `nextOffset` is null. Without MCP: the tracker file or the table the user pastes.
2. **Compute per open record** (definitions in §2): days in stage, days since the employer last made contact, the follow-up date and whether it's overdue, interviews in the next 7 days, offer deadlines.
3. **Due now.** Offer deadlines first (the deadline named in the follow-up note of offer-stage records; with MCP also `respondBy` from `api_career_saved_items {kind: "offer"}`; if they disagree, show both and ask), then interviews in the next 7 days, thank-yous owed (any round in the last 2 days without a `Sent: thank-you` note), overdue follow-ups, and networking follow-ups due (`target-company` records or `contacts.csv`).
4. **Stale.** Apply the clock (SKILL.md §3). For each stale record, propose one action: nudge, second channel, close as `no-response`, or leave and recheck on a named date. Before proposing a nudge or a close, show the latest activity entry and ask ("Foo Ltd, applied 47 d, last entry 23 Aug: heard anything since?"), because notes written in the web app or by hand may describe employer contact without a `Received:` prefix.
5. **Funnel.** All time and the last 4 weeks, with splits (§2).
6. **Inputs for next week** (§5) and a one-line pacing check (§6). With an offer open, plan around the decision instead (§7, "Offer on the table").
7. **One numbered list, one confirmation.** Change nothing until the user replies with numbers. Then make the changes (bulk where possible), draft the messages they picked, and report what changed.
8. **Next review.** End with "Next review: <date>" and offer a calendar entry (.ics text) or a scheduled reminder if the client supports one; you can't remind the user yourself.

Keep the user's part under about 20 minutes. If the list is long, show the top 10 by urgency and offer the rest.

## 2. Definitions and calculations

Stage rank: `saved` 0 < `applied` 1 < `screening` 2 < `interview` 3 < `offer` 4. `closed` has no rank; it only ends the record.

| Measure                     | How to compute it                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Furthest stage              | Highest-ranked `stage` entry in `activity`. A record closed as `accepted` counts as reaching `offer`. Tracker: the `furthest_stage` column, updated whenever the stage moves forward.                                                      |
| Applied date                | Date of the **earliest** `applied` stage entry; otherwise `appliedAt` (which a reopen to `applied` resets). Tracker: `applied_on`.                                                                                                         |
| Sent                        | Furthest stage ≥ applied.                                                                                                                                                                                                                  |
| Response                    | Furthest stage ≥ screening. A rejection email with no screen is not a response; count those separately as "rejected without a screen", since many of them signal a knockout (location, visa, level).                                       |
| Interview / offer           | Furthest stage ≥ interview / ≥ offer.                                                                                                                                                                                                      |
| Days in stage               | Today minus the latest stage entry for the current stage.                                                                                                                                                                                  |
| Days since employer contact | Today minus the latest of: a stage entry beyond `applied`, a past interview entry, a note starting `Received:` or otherwise describing an employer call, email or reply. If none, days since the applied date. Tracker: `last_contact_on`. |
| Days to first response      | First stage entry ≥ screening minus the applied date. Report the median and how many records it covers.                                                                                                                                    |
| Due follow-up               | `followUpAt` (tracker: `follow_up_on`) is today or earlier.                                                                                                                                                                                |

**Windows.** "Last 4 weeks" means applications with an applied date in the last 28 days. Those are too young to judge: the median wait for a first interview was about 23 days in 2025 tracker data. Report them as activity ("12 sent"), and compute rates on cohorts at least 4 weeks old.

**Splits.** By `source`, by tier tag, `tailored` versus not, `referral` versus not, and by resume version (the linked resume, or the `resume_version` column). A resume-version split is the cleanest test of whether a rewrite helped, provided the same kinds of roles went to both versions.

**Small numbers.** Under about 30 in a group, show counts ("3 of 11"), not percentages. Don't compare two groups that are both under about 10; say "too early to tell".

`get_application_stats` returns only `total`, `byStage` (current stage) and `bySource`. Use it for the headline "Active: 14 (applied 9 · screening 2 …)" line, never for rates: dividing current stages makes every application rejected after an interview vanish from the interview count.

## 3. Benchmarks (planning ranges)

Use these to set expectations, not as targets or predictions. Most come from vendor datasets with their own skews: Ashby (tech and startup-heavy employers), CareerPlug (US small businesses), Huntr (job seekers self-reporting card moves).

| Step                                     | Typical range                                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Cold application → any human response    | 2–6% (inbound ~3%; individual boards from under 1% to about 11%)                                                      |
| Tailored application → interview         | ~5.8% vs ~3.7% untailored (self-reported, 2025)                                                                       |
| Referral → interview                     | ~40%                                                                                                                  |
| Interview process → offer                | ~6% inbound, ~16% referral (tech/startup); ~27% interview → hire (US SMB)                                             |
| Candidates interviewed per hire          | ~15 at startups; double digits in EMEA                                                                                |
| Time to first interview (candidate view) | median ~23 days; 75th percentile more than 2 months; 90th over 4 months (applications that led to an interview, 2025) |
| Time to first offer                      | lengthened from 57 to 83 days across 2025 (self-reported)                                                             |
| Employer time to hire                    | median ~34–35 days (2025–26)                                                                                          |

## 4. Diagnosis and normal variance

Run a diagnosis only with about 30 applications or 5 interview processes in the group.

| Symptom                                                                                 | Likely causes                                                                                | Suggest                                                                    |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Responses under ~1% across 50+ cold applications (well below the ~3% inbound benchmark) | Targeting (level, location, visa, pay), weak match to must-haves, too many cold applications | resume-tailor on the next tier A/B applications; shift effort to referrals |
| Many fast rejections without a screen                                                   | Knockout answers: location, work authorization, years, pay expectations                      | Review form answers honestly; retarget                                     |
| Screens happen, few later rounds                                                        | The pitch, pay expectations, logistics                                                       | mock-interview, recruiter-screen round                                     |
| Interviews without offers                                                               | Interview answers, thin stories, weak questions                                              | interview-prep, mock-interview                                             |
| Offers the user turns down                                                              | Targets don't match what they actually want                                                  | Revisit criteria before applying further                                   |

**Normal variance, worth saying out loud.** Simple arithmetic, assuming each process is independent:

- At a 3% response rate, about 4 in 10 people get no response at all from 30 applications, and about 2 in 10 from 50.
- With 5 interview processes and no offer: at a 16% per-process offer rate that happens about 42% of the time; at 6%, about 73%.

So three rejections after interviews is within normal variance. Say so plainly, then look for one thing to change.

## 5. Input goals

Set weekly goals on inputs the user controls, scaled to their time and tier mix. Example for someone searching full time:

- 3–5 tailored tier A/B applications (each preceded by a contact search).
- 3–5 networking or referral asks.
- Every due follow-up and thank-you.
- 1 practice or prep session per scheduled interview.

Why inputs: search intensity raises interview counts, but the quality of the search predicts both interviews and the quality of the job found, and goal setting with self-monitoring is one of the components that made job-search programmes work. Celebrate completed inputs, not outcomes the user can't control.

If the user sends more than ~40 applications a week with under ~1% responses across 50 or more, recommend fewer, better-targeted applications.

## 6. Pacing and wellbeing

Searches are long. In Huntr's 2025 survey, about 1 in 4 respondents had searched for a year or more and 45% had three months or less of financial runway. A meta-analysis of 47 job-search interventions found participants' odds of employment were about 2.7 times those of controls, and interventions worked only when they combined skill-building with motivation support (goal setting, social support, stress management).

- Time-box search days, and suggest a stopping time.
- After each rejection, a two-line debrief: one thing to keep, one to change. Then move on.
- Warning signs: inputs collapsing week over week, applying to clearly poor fits, all-or-nothing language ("nothing ever works"). Respond by shrinking next week's goals and naming one small win; don't add volume.
- You are not a therapist. If the user sounds in real distress, say so kindly and suggest talking to someone they trust or a local support service.

## 7. Output variants

**Standard** (see SKILL.md §4 for a filled example):

```
Week of <date>. Active <n>: applied <n> · screening <n> · interview <n> · offer <n>
Due now
 1. …
Stale
 4. <company>, <stage> <days> d, <tier>, <contact or "no contact"> → <proposed action>
Funnel. Last 4 weeks (<n> sent): …  All time (<n> sent): responses … · interviews … · offers …
Splits: <only where the groups are big enough>
Next week: <inputs>
Reply with the numbers to act on. I change nothing until then.
```

**First review** (little history): skip the funnel. Clean up instead: fill missing applied dates and sources, set a follow-up on every open record, tag tiers, and propose closing anything past day 45.

**Quiet week** (nothing due, nothing stale): one line of status, next week's inputs, and a check that every open record has a follow-up date.

**Offer on the table:** lead with the deadline and ask "Do you want it? Which open processes would you pick over it?" Propose expedite notes to those only, plan next week around the decision (prep for the preferred processes, decide a day before the deadline), and pause new applications until the user declines.

## 8. Dubious statistics to avoid

- "70–85% of jobs come through networking": traced to a non-representative 2016 survey. Hiring data shows referrals at about 17–18% of hires.
- "Referrals are 7% of applicants but 40% of hires": outdated (about 2014–15) and not re-verified. Recent data: about 1% of applications.
- "Referrals are N times more likely to be hired" with no stage named: quote by stage instead (§3).
- "75% of resumes are rejected by ATS": from a defunct vendor with no published method. Where automatic rejection does happen, it is usually configured knockout questions (location, work authorization, years), not resume parsing; treat even that as practitioner consensus, not measured.
- "40% of companies post fake jobs" and "ghost jobs are 18–22% of postings": surveys and secondhand figures.
- "Google Jobs has 3x LinkedIn's response rate": self-reported card moves, confounded by Google Jobs linking to employer sites. Directional only.
- Any "normal" weekly application count: two reports from the same tracker disagree (a median of 4 or fewer versus about 16 a week).
- "Applications per hire tripled since 2021": the source says about 182% over the 2021 baseline.
- "Average time to hire is 23.8 days": a 2017 figure, now outdated.
- "Apply to 10 jobs a day" or "always follow up after 1 week": no evidence.

## 9. Sources

- Ashby Talent Trends: referrals; inbound; EMEA recruiter productivity; startup hiring; 2023 recruiter productivity; 2025 hiring.
- Huntr, 2025 annual job search trends report; Huntr, Q2 2025 job search trends.
- CareerPlug, Recruiting metrics and KPIs (2025 report).
- van Hooft et al. (2021), Journal of Applied Psychology, doi:10.1037/apl0000675.
- Liu, Huang & Wang (2014), Psychological Bulletin, job-search intervention meta-analysis.
- Reactive Resume source: `get_application_stats` output shape (`packages/api/src/dto/application.ts`).
