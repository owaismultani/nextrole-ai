# Metric library by job family

Each family lists high-yield questions, metrics worth asking about, where those numbers usually live, traps, and a bullet pattern. The metrics are prompts for questions, not targets: use one only when the user has a real figure, an honest range, or a lower bound. Bracketed values in patterns are placeholders the user must fill. Never suggest a typical value ("most people say 20%"), because users will adopt it.

Use the **Find** line for the homework list in SKILL.md step 9, and remind the user to look only in systems they still legitimately have access to.

If the user's job doesn't fit a family, combine the two closest, or fall back to the six lenses in SKILL.md (scale, before/after, time, money, quality, comparison).

## Contents

1. Software engineering
2. Data and machine learning
3. Product management
4. Design and UX
5. Marketing
6. Sales and business development
7. Customer success and support
8. Operations, logistics and supply chain
9. Finance and accounting
10. HR and recruiting
11. Project and program management
12. Healthcare and nursing
13. Teaching and education
14. Retail, hospitality and food service
15. Trades and manufacturing
16. Administration and executive assistance
17. Legal
18. Research and academia
19. Government and nonprofit
20. Writing and creative

## 1. Software engineering

- **Ask:** What shipped, who used it, and what got faster, cheaper or safer? Any before and after on latency, build time, incidents or cost?
- **Metrics:** p95/p99 latency, uptime against an SLO, error rate, infrastructure cost per month, CI or build time, scale (requests per day, users), migration size, incidents. Delivery metrics as DORA defines them as of 2026: change lead time, deployment frequency, failed deployment recovery time, change fail rate, deployment rework rate.
- **Find:** the service's monitoring dashboard (Datadog, Grafana, CloudWatch), CI history, the cloud billing console, incident postmortems, their own pull-request history.
- **Traps:** DORA figures are team-level, so use team wording. "MTTR" and the four-metric framing are outdated. Test coverage percentage is a weak signal on its own.
- **Pattern:** "Cut p95 latency of [service] from [N] ms to [N] ms for [N] daily requests by [method]"

## 2. Data and machine learning

- **Ask:** What decision changed because of your work? What did the model or analysis beat, and was it tested online?
- **Metrics:** precision, recall, F1 or AUC against a named baseline; A/B lift; hours or cost saved; pipeline freshness and reliability; weekly dashboard users; query cost.
- **Find:** experiment or A/B reports, evaluation notebooks, dashboard usage stats (Looker, Tableau), pipeline monitoring.
- **Traps:** an offline metric with no business link; claiming an A/B lift the user can't attribute to their work.
- **Pattern:** "Built [model] that beat the [baseline] by [N] points of [metric]; [team] now uses it to [decision]"

## 3. Product management

- **Ask:** Which outcome metric moved after launch? What did you decide to cut or delay, and why?
- **Metrics:** activation, retention, conversion, revenue influenced, NPS, time to market, experiments run, adoption.
- **Find:** launch reviews, product analytics (Amplitude, Mixpanel), OKR documents, release notes.
- **Traps:** whole-team outcomes under a solo verb. Write "led product for [X], which…" and keep the user's own decisions as the action.
- **Pattern:** "Led product for [feature]; [metric] rose from [N] to [N] within [period] of launch"

## 4. Design and UX

- **Ask:** What did your research find? What changed for users after the redesign?
- **Metrics:** task success rate, time on task, SUS score, funnel drop-off, related support tickets, accessibility conformance (WCAG level), design-system adoption (teams or components), studies run.
- **Find:** research reports, usability-test notes, analytics funnels, design-system usage stats, their portfolio case studies.
- **Traps:** NDAs on unreleased work. A portfolio link often says more than a number.
- **Pattern:** "Redesigned [flow] after [N] usability sessions; task success rose from [N]% to [N]%"

## 5. Marketing

- **Ask:** Which channel and budget, and results against what target?
- **Metrics:** pipeline value, MQL to SQL conversion, CAC, ROAS, click-through and conversion rates, organic sessions, list or follower growth, budget managed, content output; for social: reach, saves and shares, profile visits, link clicks, DMs or inquiries, content reused by sales.
- **Find:** the ad or email platform's reports, web analytics, CRM pipeline reports, platform insights (Instagram Insights, LinkedIn page analytics) for the last 12 months.
- **Traps:** vanity metrics (impressions alone); results that depend on the attribution model; email open rates have been unreliable since Apple's 2021 Mail Privacy Protection.
- **Pattern:** "Grew [channel] from [N] to [N] [unit] in [period] by [method]"

## 6. Sales and business development

- **Ask:** Quota and attainment per year? Rank on the team? Deal size and cycle?
- **Metrics:** percent of quota, amount closed, rank (#N of M), new accounts, win rate, average deal size, sales cycle in days, pipeline created, President's Club or equivalent.
- **Find:** CRM reports (Salesforce, HubSpot), quota or commission statements, ranking emails, award announcements.
- **Traps:** confidential revenue. Use percent of quota or rank instead of amounts.
- **Pattern:** "Closed [N]% of [year] quota with [N] new accounts, ranking [N] of [N] reps"

## 7. Customer success and support

- **Ask:** What volume did you handle, how fast, and what did customers say? Any renewals or saves?
- **Metrics:** CSAT, NPS, first response time, first-contact resolution, average handle time, tickets per day, backlog, gross or net revenue retention, churn, book of business, help articles written and deflection.
- **Find:** the help desk's reports (Zendesk, Intercom, Freshdesk), QA scorecards, renewal reports, help-centre article stats.
- **Traps:** lower handle time alongside lower CSAT is not a win.
- **Pattern:** "Resolved about [N] tickets a day at [N]% CSAT; wrote [N] help articles on the most repeated questions"

## 8. Operations, logistics and supply chain

- **Ask:** Which flow did you fix, and what happened to cost or service?
- **Metrics:** on-time in-full, fill rate, inventory turns, days of inventory, forecast error, cycle time, cost per unit, freight cost, stockouts, throughput, picks per hour, accuracy.
- **Find:** WMS or ERP reports, site KPI boards, their own scorecard, monthly operations reviews.
- **Traps:** site-level numbers that many people moved. Use scope wording.
- **Pattern:** "Raised on-time delivery from [N]% to [N]% across [N] sites by [method]"

## 9. Finance and accounting

- **Ask:** How fast was the close, how accurate, what did you save, and what scope did you cover?
- **Metrics:** days to close, reconciliations, audit findings, DSO, budget size, forecast variance, entities consolidated, hours automated.
- **Find:** close calendars, audit reports, variance reports, automation logs in the ERP.
- **Traps:** confidential financials, especially unreleased figures at a listed company. Use percentages or scale.
- **Pattern:** "Shortened month-end close from [N] to [N] days for [N] entities by [method]"

## 10. HR and recruiting

- **Ask:** How many hires, how fast, and did they stay? What programs did you launch?
- **Metrics:** hires per year, open roles carried, time to fill, offer acceptance rate, 90-day retention, cost per hire, engagement survey change, training completion, employees supported.
- **Find:** ATS reports (Greenhouse, Lever, Workday), offer logs, engagement survey results.
- **Traps:** claims about demographics or diversity carry legal sensitivity; get the wording approved by the user and keep it factual.
- **Pattern:** "Hired [N] [role type] in [year] and cut average time to fill from [N] to [N] days"

## 11. Project and program management

- **Ask:** What budget, team and vendors? Delivered on time? What made it hard?
- **Metrics:** budget, team size, workstreams or vendors, on-time and on-budget delivery, schedule variance, sites or users rolled out, savings.
- **Find:** project charters, status reports, budget trackers, closeout reports.
- **Traps:** "on time and on budget" is the baseline expectation; pair it with scope or difficulty.
- **Pattern:** "Delivered [program] for [N] users across [N] sites on a [budget] budget, [N] weeks ahead of plan"

## 12. Healthcare and nursing

- **Ask:** Unit type, size and acuity? Typical patient ratio? Quality projects you led or joined? Who did you precept? Which equipment and certifications? Any DAISY nominations, or patient or family letters (never quoted with identifying details)? Rapid response, code team, charge, float or resource roles? Which EHR (Epic, Cerner/Oracle Health)?
- **Metrics:** beds, patients per shift, falls with injury per 1,000 patient days, pressure injury rate, CLABSI or CAUTI rates, patient experience (HCAHPS) scores, audit compliance, preceptees trained, certifications, rapid-response or committee roles.
- **Find:** the unit quality board, their nurse manager or unit educator, their annual review, the preceptor log, certification records.
- **Traps:** quality indicators are unit- or hospital-level, so write "contributed to" or "on a unit that…". Report injury falls, not just total falls. Never include anything that could identify a patient (HIPAA in the US, equivalents elsewhere).
- **Pattern:** "Precepted [N] new-graduate nurses on a [N]-bed [unit type]; all completed orientation on schedule"

## 13. Teaching and education

- **Ask:** Class sizes and sections? Results against an earlier cohort? What did you build or start?
- **Metrics:** students or sections per year, pass or exam rates against a baseline, attendance, curriculum units written, grants, clubs started, mentees.
- **Find:** school or exam-board results, department data reviews, appraisal or observation notes.
- **Traps:** cohort differences make score claims shaky; say "against the previous cohort" and keep it modest. Student privacy applies.
- **Pattern:** "Raised [course] pass rate from [N]% to [N]% across [N] classes by [method]"

## 14. Retail, hospitality and food service

- **Ask:** Volume per shift? Sales against target? Audit or inspection results? Who did you train?
- **Metrics:** transactions or covers per shift, sales against target, units per transaction, average ticket, shrink, mystery-shop or health-inspection scores, speed of service, staff trained, review ratings.
- **Find:** store or shift reports, POS data, mystery-shop or inspection reports, their manager.
- **Traps:** store-level numbers; describe scope ("one of [N] shift leads").
- **Pattern:** "Served about [N] customers a shift with [accuracy/rating]; trained [N] new hires on [system]"

## 15. Trades and manufacturing

- **Ask:** Output, quality, safety and downtime? Licences held? Who did you train?
- **Metrics:** OEE, scrap or rework rate, first-pass yield, downtime hours, units per shift, recordable-free days or TRIR, jobs completed, project value, inspections passed, apprentices trained.
- **Find:** job logs, inspection records, the safety board, apprenticeship paperwork, licence records.
- **Traps:** safety claims must be exact; never round them in the user's favour.
- **Pattern:** "Completed [N]+ [job type] with [N] failed inspections; trained [N] apprentices"

## 16. Administration and executive assistance

- **Ask:** Whom did you support, at what level, and at what volume? Any savings or systems set up?
- **Metrics:** executives supported, meetings or trips per year, events (attendees, budget), expense reports, vendor savings, turnaround time, systems implemented.
- **Find:** calendar history, the expense system, event budgets and vendor invoices.
- **Traps:** scope words matter more than percentages here.
- **Pattern:** "Ran calendars and travel for [N] [level]; organised [N] events of [N] people within budget"

## 17. Legal

- **Ask:** Matter types, volume and your role? Which outcomes are public?
- **Metrics:** caseload or matters, documents reviewed, deals (public values only), filings, hearings or trials, contracts negotiated, turnaround, pro bono hours.
- **Find:** their matter list or time records; public deal announcements and court records only.
- **Traps:** client identity and matter details are confidential under professional-conduct rules (in the US, ABA Model Rule 1.6 and state equivalents); name clients only with consent. Present past results with context (their role, the matter type) rather than bare verdict amounts; some bars (e.g. North Carolina) have held that a disclaimer doesn't cure a misleading results claim. Rules vary by jurisdiction as of 2026; tell the user to check their bar's guidance.
- **Pattern:** "Negotiated [N] [contract type] for [client category] clients, cutting average turnaround from [N] to [N] days"

## 18. Research and academia

- **Ask:** Outputs, funding, your role on each, tools or data released, people supervised?
- **Metrics:** publications (venue and author position), grants (amount, PI or co-I), datasets or software (users, downloads), students supervised, talks, patents.
- **Find:** their publication list (ORCID, Google Scholar), grant award letters, repository download stats.
- **Traps:** academic CVs list outputs rather than impact bullets (see situations.md). Avoid journal impact factors as a measure of the user's work.
- **Pattern:** "Designed [method] and ran [N] [samples/trials] for a [first/co-first]-authored paper in [venue]"

## 19. Government and nonprofit

- **Ask:** Who was served, what was raised, and what changed?
- **Metrics:** people served, funds raised or grants won, program outcomes, volunteers managed, budget, policies drafted.
- **Find:** grant reports, annual reports, program evaluations, volunteer rosters.
- **Traps:** US federal resumes follow their own rules (see situations.md).
- **Pattern:** "Raised [amount] from [N] funders for [program] serving [N] [people] a year"

## 20. Writing and creative

- **Ask:** Where was it published, how many people saw it, and what did it lead to?
- **Metrics:** pieces per week or month, outlets, audience (page views, subscribers), engagement, conversion lift on copy, awards, commissions.
- **Find:** CMS or newsletter analytics, editor emails, award announcements, their portfolio.
- **Traps:** vanity reach numbers; a portfolio link usually says more.
- **Pattern:** "Wrote [N] [pieces] a month for [outlet], growing [audience metric] from [N] to [N]"

## Sources

- DORA, "DORA's software delivery metrics" and "History of DORA's metrics" (dora.dev), current five-metric set
- NDNQI-style nursing quality indicators (falls, pressure injuries) as unit-level measures; CMS HCAHPS survey
- ABA Model Rule 1.6 (confidentiality); Orange County Bar Association Ethics Opinion 2022-01 (client names in attorney bios); North Carolina State Bar 99 FEO 7 (past-results claims)
- San Francisco Declaration on Research Assessment (against journal impact factors)
- Apple Mail Privacy Protection (2021) and its effect on email open-rate tracking
- Laszlo Bock (2014), "My personal formula for a winning resume" (baseline and specificity)
