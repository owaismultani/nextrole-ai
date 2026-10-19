# Rewrite playbook

What to change in the tailored copy, in what order, with patterns and before/after pairs. Every "after" below assumes the user confirmed the facts in it, and keeps their verbs and approximations ("~") exactly.

## Contents

1. Priority order
2. Headline
3. Summary
4. Bullets
5. Skills
6. Sections, titles and layout
7. Before/after pairs
8. Delivering without MCP
9. Sources

## 1. Priority order

Change the top third first, because the first pass by a recruiter lands on titles, employers, dates and the top of the page (directional evidence only: the eye-tracking studies behind this are small and vendor-run).

1. Headline.
2. Summary.
3. First two bullets of the most recent relevant role.
4. Skills order and wording.
5. Remaining bullet order and wording.
6. Hide irrelevant items.
7. Section order and layout.

Rule of thumb: the evidence for every weight-3 must should be visible in items 1–3, or the requirement is marked as a gap.

## 2. Headline

Pattern: `{Official title or role family} · {1–2 true differentiators in the JD's terms}`.

| Situation                                   | Headline                                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Same role family as the JD                  | "Product Designer · Design systems and B2B SaaS"                                                   |
| JD title is more senior than any title held | "Software Engineer · Data pipelines (Spark, Airflow) at 2B events/day". Not "Senior Data Engineer" |
| Official title is opaque                    | "Member of Technical Staff · Backend APIs in Go"                                                   |
| Career changer                              | "Operations Manager moving into Supply Chain Analytics · SQL, forecasting"                         |

The headline may describe the work the user does. It must not read as a title or seniority level they never held.

## 3. Summary

Two to four lines, no pronouns needed, no generic adjectives.

Formula: **who** (role family, true years or scope) + **what** (the top 2–3 musts, each with proof) + **where** (domain or setting).

- Before: "Results-driven analyst passionate about data."
- After: "Marketing analyst since 2021. Defines funnel KPIs with Product and Marketing leads, sizes and analyses ~5 A/B tests a quarter chosen in a weekly SQL and Tableau review, and built the ~40 dbt models on BigQuery behind it."

Each phrase maps to an Acme answer in the SKILL.md worked example. Adding "B2C", "executive" or "end to end" would need a user answer first.

Cut on sight: "results-driven", "passionate", "proven track record", "dynamic", "go-getter", "synergy", "detail-oriented" without proof. Everything the summary claims must be backed further down.

## 4. Bullets

- **Reorder within a role**, not across roles: weight-3 evidence first. Keep roles reverse-chronological.
- **Rephrase to the JD's noun** where the work is genuinely the same: "experimentation" vs "A/B testing", "stakeholder management" vs "worked with other teams". Mirror the term, never the sentence.
- **One proving context per key term**, plus Skills. One to three natural uses in the whole resume is enough.
- **Soft skills only inside results**: "Presented the quarterly roadmap to 60+ executives…", never "Excellent communicator".
- **Hide, don't delete**: irrelevant bullets can move to the bottom of the role or come out of the copy; whole items can be hidden. Keep items that show transferable skills.
- Bullet craft beyond this job (verb choice, metric discovery) is the resume-bullet-writer skill's job if it is available.

## 5. Skills

- Order by the JD's priority. Use the JD's wording and word form ("Project management", "Search Engine Optimization (SEO)").
- Group when there are more than about eight: Languages, Data, Tools, Methods.
- Every listed skill is backed by a bullet or project. Remove nothing from the master; hide or drop in the copy.
- Skill bars and dot ratings carry no meaning for parsers or most readers. Prefer text such as "Python (5 yrs)" or a short proficiency word.
- Workday-style application forms often don't import Skills or Languages from the file. Tell the user to type them into the form by hand after uploading.

## 6. Sections, titles and layout

- **Titles:** official title, written in full. A clarifier in brackets is fine. Never retitle a past job to match the target, even though some tools suggest it: a background check exposes it.
- **Employer names:** as legally written (include "Inc." or "GmbH" if that is the name).
- **Section order:** experienced candidates lead with Experience. Move Certifications up when one is a knockout. For "degree or equivalent", Education goes below Experience. Students and new graduates may lead with Education and Projects.
- **Headings:** keep standard ones (Experience, Education, Skills, Certifications, Projects). A conventional variant such as "Research Experience" is fine when it describes the content better.
- **Layout:** one column for portal applications. Two columns are acceptable when emailing a person directly (career centres disagree on this; one column is the safe default).

## 7. Before/after pairs

| JD terms                                                           | Before                                                      | After                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Amazon Web Services (AWS)", "Infrastructure as Code", "Terraform" | Responsible for managing cloud infrastructure.              | Migrated 40 services to Amazon Web Services (AWS) using Terraform-based Infrastructure as Code (IaC), cutting provisioning time from 2 days to 3 hours.                                        |
| "stakeholder management"                                           | Worked with other teams on the roadmap.                     | Aligned roadmap priorities across 4 product teams through a monthly stakeholder review, cutting blockers raised at planning from ~12 to ~4 a quarter. Skills carries "Stakeholder management". |
| "partner with Product to define KPIs", "experimentation"           | Created weekly reports for marketing using SQL and Tableau. | Defined 5 funnel KPIs with Product and Marketing leads and built the weekly SQL and Tableau review used to choose ~10 experiments a quarter.                                                   |
| "dbt", "Snowflake" (user has never used Snowflake)                 | Worked on data pipelines.                                   | Built ~40 dbt models on BigQuery, cutting dashboard refresh from ~6 h to 45 min. (Snowflake stays off.)                                                                                        |
| "Kubernetes" (user has only read about it)                         | —                                                           | Nothing added. If it is nice-to-have, the letter may say it is being learned, if true.                                                                                                         |

## 8. Delivering without MCP

Give the user four blocks, in this order:

1. **Tailored resume** as copy-ready text, section by section, in the new order. Mark hidden items as "(left out of this copy)" in the change log, not in the resume text.
2. **Change log**, one line per change; for rewritten lines include the before and after. This replaces a separate approval round, since nothing is written to the user's data:
   `Moved · Acme b3 → b1 · evidence for "define KPIs" (weight 3)`
   `Rephrased · Acme b2 · "data pipelines" → "dbt models on BigQuery" · from your answer`
   `Hidden · Projects → "Recipe app" · not relevant to this role`
   `Added · Skills → "A/B testing" · backed by Acme b1 ("sized and analysed about half")`
3. **Remaining gaps**: rows still at Adjacent or None, with what the user could do (letter line, learning step, or nothing).
4. **Facts learned**: newly confirmed facts as a block the user can paste into their master resume (SKILL.md step 10).

If the user's resume is Reactive Resume JSON and MCP is not connected, offer either the JSON Patch operations (see mcp-recipes.md for paths and shapes) or the full updated JSON to import.

The final checklist lives in SKILL.md step 8.

## 9. Sources

- TheLadders eye-tracking studies, 2012 and 2018 (directional only; small samples, vendor-run, first pass only).
- Duke Career Hub and UW iSchool tailoring guides; Mohawk College profile guidance.
- Greenhouse, Unsuccessful resume parse; Workday Recruiting admin guide (Skills and Languages not auto-filled).
- UCI 2025 ATS guide and UMD resume tip sheet (acronyms, word forms, columns).
- Jobscan tutorial (suggests retitling past jobs; this skill does not).
