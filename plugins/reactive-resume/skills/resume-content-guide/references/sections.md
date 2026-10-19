# Section-by-section rules

Contents:

1. Contact and header
2. Photo
3. Headline
4. Summary or objective
5. Experience
6. Education and GPA
7. Skills
8. Certifications and licences
9. Projects
10. Publications and presentations
11. Volunteer
12. Awards
13. Languages
14. Interests
15. References
16. Format: chronological, hybrid or functional
17. Length
18. Sources

Each entry covers what to include, what to leave off, the contested calls and the Reactive Resume field. Evidence tags are defined in SKILL.md: `official`, `study`, `survey`, `convention`.

## 1. Contact and header

Fields: `basics.name`, `basics.email`, `basics.phone`, `basics.location`, `basics.website`, `basics.customFields[]`, `sections.profiles`.

Include:

- Name. A chosen or preferred name is fine; the legal name is usually needed only for background checks and right-to-work paperwork after an offer (`convention`, not verified).
- Phone, in international format (+CC) for cross-border applications.
- One professional email address.
- Location as city and region, adding the country when applying abroad. UK guidance lists name, phone, email and LinkedIn, with no street address (`official`, National Careers Service). Canada's Job Bank still lists an address; an Australian council treats location as optional and worth including when you live near the job. Traditional German, Austrian and Swiss applications and paper forms use the full address.
- LinkedIn; GitHub or a portfolio only when it shows relevant work. Every link must resolve.

Leave off in the US, UK, Canada, Australia and most of the EU:

- Date of birth or age, marital status, children, nationality, gender (`official`: UK National Careers Service; US EEOC guidance on age inquiries).
- National ID numbers of any kind: SSN, SIN ("never", per Job Bank), NRIC, Aadhaar, BSN, personnummer, CPR, PESEL, CPF, Korean resident number.
- Height, weight, religion, political views, health or disability. The UK Equality Act s.60 restricts pre-offer health questions and the US ADA bars pre-offer disability inquiries (`official`).
- Salary history or current pay. As of April 2026, 22 US states and about 24 localities bar or limit the question, and in some places pay a candidate volunteers can still be used (`convention`, from compliance summaries).
- A second email, a fax number, an unprofessional address.

Contested:

- **Pronouns.** Optional. A preregistered US audit study (draft results, not peer-reviewed) found they/them pronouns lowered positive responses by about 5 percentage points against no pronouns and about 4 against he/him or she/her (`study`, preliminary). Share that, then let the user decide. Never add or remove pronouns unasked.
- **Work authorisation.** See countries.md. Phrase it as authorisation, not nationality.

Special cases:

- **Security clearance** (defence, federal): level, agency and status, such as "Active TS/SCI (DoD)", in the header or summary. Never program names or access details.
- **Required licence** (nursing, engineering, law): near the top, in the summary, header line or its own section above Experience.

Put extras that must be easy to switch off per country (date of birth, nationality, permit, driving licence, notice period, clearance) in `basics.customFields[]`. Custom fields have no hidden flag, so country versions live on copies.

## 2. Photo

Field: `picture.hidden`.

- **Hide by default** in the US, UK, Canada, Australia, New Zealand, Ireland and Singapore. The EEOC says employers "should not ask for a photograph"; Canada's Job Bank calls a photo "not the norm" (`official`). Exceptions: acting and modelling, Japan's rirekisho form, and any form that asks.
- **Germany, Austria, Switzerland, the Gulf, parts of Asia and Latin America:** optional to customary. Share the evidence before the user decides:
  - Germany, identical applications: 18.8% callbacks with a German name, 13.5% with a Turkish name, 4.2% with a Turkish name and a headscarf photo (`study`, Weichselbaumer).
  - Israel, 5,312 CVs: attractive men gained from a photo, while women did best with no photo (`study`, Ruffle and Shtudiner).
- Default where it's customary: ask. Include it for traditional local employers if the user opts in; leave it off for tech companies, international employers and English-language ads.
- If used: recent, professional, neutral background.

## 3. Headline

Field: `basics.headline`.

- The target role in the employer's wording, plus a specialisation where it fits: "Senior Data Engineer · Streaming and cost optimisation".
- Never a title the user hasn't held. "Aspiring X" reads as weak; career changers name the new function instead: "Operations analyst (SQL, Tableau)".

## 4. Summary or objective

Field: `summary` (`content` is HTML; `hidden` toggles it).

- **Experienced candidates:** 2–4 lines, right after the contact details: role identity, years and domain, one or two headline results, the target (`official`: UK guidance calls it a few short lines after contact details).
- **Objective:** only to state a target the history doesn't make obvious (career changer, new grad, returner), phrased as what the user offers, not what they want. Calling all objectives obsolete is opinion (`convention`).
- **Omit** on a one-page new-grad resume that needs the room, or when it only repeats the headline.
- Never a list of adjectives. Every claim should be backed by something further down the page.

## 5. Experience

Field: `sections.experience.items[]` with `company`, `position`, `location`, `dates {start, end, present}`, `description` (HTML) and `roles[]`. An entry without `company` is a draft and doesn't print.

- Reverse-chronological.
- Each entry: employer (the full name helps parsing, such as "Acme Inc."), title, city or "Remote", start and end month and year. USAJOBS requires MM/YYYY and hours per week (`official`, OPM).
- Achievements, not duties (`official`, Job Bank). 3–6 bullets for recent roles, 1–3 for older ones; Job Bank suggests at most 5–7 per section. Hand bullet writing to the resume-bullet-writer skill when it's available.
- Several titles at one employer: one entry with `roles[]`, newest first. It shows promotion and avoids the double listing that reads like job-hopping.
- Older than about 15 years: cut or compress (`official`: Job Bank; OPM says "Remove outdated or unrelated experience"). Exceptions: academic CVs, and roles where early experience is itself a qualification. US federal: keep an older role only when it proves a required qualification, within 2 pages.
- Leave off reasons for leaving (`official`, Job Bank), salary, supervisor names and internal codes.
- Agency contracts: "Contractor via Agency → Client", so short tenures read as planned.
- Confidential clients: describe them ("a Fortune 500 retailer") rather than breaking an NDA.
- Leaving a short or irrelevant role off a resume is acceptable. Leaving it off an application or background-check form that asks for a complete history is not.

## 6. Education and GPA

Field: `sections.education.items[]` with `school`, `degree`, `area`, `grade`, `location`, `dates`, `description`.

- **Placement:** first for students, new grads and roughly the first 1–3 years, and for early-career finance, consulting and law; after experience otherwise (`official`, UK National Careers Service).
- **Include:** degree, field, institution, completion year or "Expected May 2027", honours, a thesis title when relevant. UK degree classifications ("First-Class Honours", "2:1") go in `grade`.
- **Coursework:** only for new grads, and only to fill a real skills gap.
- **GPA:**
  - Include when the application asks, for US federal jobs (cumulative GPA is requested, `official`), for early-career finance, consulting, large law firms and some engineering graduate programmes (`convention`), and otherwise at 3.0/4.0 or above for the first ~3 years.
  - Put it on the degree line at 3.5 or above (`convention`). No study supports a universal cut-off; fewer than 40% of employers screen new graduates by GPA, three years running (`survey`, NACE 2025, n=216). Secondary sources quote other figures for 2026; cite NACE directly.
  - Drop it after the first ~3 years, except for federal and academic applications.
  - Never round up. Give the scale: "3.6/4.0".
- **Foreign grades:** keep the original grade and its scale ("1.3 on the German 1–5 scale, 1.0 best"). Don't convert to a US GPA yourself; use a figure from an official credential evaluation if the user has one (`convention`). Keep the official degree name and add a plain-English description of the field; claim an equivalence ("equivalent to a US master's") only when an evaluation states it.
- **Graduation dates:** keep them for about 10 years after graduating. Later, dropping them reduces an age signal: a 40,000-application field experiment varying graduation years found age discrimination, strongest against older women (`study`, Neumark, Burn and Button). But a missing date can itself signal age, and US federal applications need it. Recommend, don't force.
- **High school:** drop once there's a degree, except for trades and non-degree candidates.

## 7. Skills

Field: `sections.skills.items[]` with `name`, `proficiency` (free text), `level` 0–5 (0 hides the dots), `keywords[]`.

- Group by category: Languages / Frameworks / Tools / Domain, or the field's equivalent. Each important skill should also appear in a bullet as evidence. About two-thirds of US employers report skills-based hiring for entry level (`survey`, NACE), which checks demonstrated skills, not lists.
- Hard skills in the list; soft skills shown in bullets. "Team player" and "communication" in a list are filler (`convention`).
- Proficiency bars, dots and percentages: set `level` to 0. Bars have no shared scale ("4/5 Python" means nothing) and parse badly (`convention`; no study either way). If a level matters, use words ("Advanced") or a certification.
- Only skills the user can defend in an interview. Drop ubiquitous tools (basic office software) unless the posting names them, and obsolete stacks unless the role maintains legacy systems.

## 8. Certifications and licences

Field: `sections.certifications.items[]` with `title`, `issuer`, `dates.start`, `website`, `description`.

- Current, relevant certifications with issuer and date, or expiry where it matters: "Basic Life Support (BLS), American Heart Association, exp. 06/2027".
- Licence numbers only when the posting asks (nursing, engineering).
- A licence the job requires goes high on the page: the summary, the header line, or a Licences section above Experience.
- Expired certifications: remove unless the field values the history.
- State status precisely: "Passed Level II of the CFA Program", "Eligible for RN licensure, May 2027". Course-completion cards are not certifications: write "OSHA 30-Hour Construction (Outreach card)" (see industries.md, skilled trades).

## 9. Projects

Field: `sections.projects.items[]` with `name`, `dates`, `website`, `description`.

- Essential for students, career changers, bootcamp grads, and anyone with a gap or returning to work.
- Same impact format as experience: scope, users, result, plus a link. Two or three substantial projects beat six weak ones (`convention`).
- Present them as real work, not coursework titles. In group projects, say what the user did.
- For new grads in tech, Projects can sit above Experience.

## 10. Publications and presentations

Field: `sections.publications.items[]` with `title`, `publisher`, `dates.start`, `website`, `description`.

- **Academic CV:** everything, in the discipline's citation style. "Forthcoming" and "under review" are labelled as such; "in preparation" never moves into the published list.
- **Industry resume:** "Selected publications", 2–5 relevant items, or one line ("12 peer-reviewed papers; full list at …") (`convention`, university careers guidance).

## 11. Volunteer

Field: `sections.volunteer.items[]` with `organization`, `location`, `dates`, `description`.

- Include it when it shows relevant skills or leadership, or fills a gap. UK and Canadian government guidance both treat volunteering as legitimate experience (`official`).
- With little paid history, it can sit in Experience with "(Volunteer)" in the title.
- Religious or political organisations disclose identity, like hobbies do. Ask before including; offer a neutral description ("community food bank, treasurer").

## 12. Awards

Field: `sections.awards.items[]` with `title`, `awarder`, `dates.start`, `description`.

- Selective, external, recent, with context: "Top 5% of 2,000 sales reps", "President's Club 2024 (#3 of 18)".
- Drop school-era awards after about 5 years unless they are major.
- Military awards: keep major ones, translated into what they recognised.

## 13. Languages

Field: `sections.languages.items[]` with `language`, `fluency` (free text or a CEFR code), `level` 0–5.

- Use CEFR levels (A1–C2) wherever European or international readers are likely, judged against the official self-assessment grid across listening, reading, spoken interaction, spoken production and writing (`official`, Europass).
- For US readers, add plain words: "German (native), English (C1, fluent)".
- Put certificates (IELTS, DELF, JLPT, Goethe) in `fluency`. Set `level` to 0 to hide the dots.
- Never overstate. Interviewers test languages, and German guides warn specifically against inflated CEFR levels.

## 14. Interests

Field: `sections.interests.items[]` with `name`, `keywords[]`.

- Include only when they show a job-relevant skill (team captain shows leadership) or give a strong conversation hook (`official`: UK National Careers Service; Job Bank says only if related).
- Hobbies signal social class: upper-class hobbies helped men's callbacks at law firms but not women's (`study`, Rivera and Tilcsik). Default to omitting them on a crowded page.
- Early-career finance applicants conventionally keep a short interests line as an interview icebreaker (`convention`).

## 15. References

Field: `sections.references` (section `hidden`; items have `name`, `position`, `phone`, `website`, `description`).

| Market                                                         | Default                                                                                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| US, Canada                                                     | Omit the section and the "available on request" line; references go on a separate sheet when asked (`official`, Job Bank)                            |
| UK                                                             | Don't list contacts; "References available on request" is still recommended by the National Careers Service (`official`, contested by practitioners) |
| Australia, New Zealand, Norway, South African government posts | Listing 2 referees, or "available on request", is common (`official`, Australian government guides)                                                  |

- Get the referee's permission first, and never publish their contact details without consent.
- Default to `sections.references.hidden: true` unless the market expects referees.

## 16. Format: chronological, hybrid or functional

| Format                                              | Use when                                          | Notes                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reverse-chronological                               | Almost everyone                                   | Readers anchor on titles, employers and dates (`survey`, vendor eye-tracking study)                                                                                      |
| Hybrid: skills or summary block, then dated history | Career changers, returners, veterans, freelancers | Gaps stay visible and explained, not hidden                                                                                                                              |
| Functional: skills only, no dated history           | Almost never                                      | Recruiters read it as hiding gaps or job-hopping (`convention`, vendor content, not a survey). Some re-entry guides still suggest it after incarceration; prefer hybrid. |

Layout for portal applications: one column, contact details in the body (not a header or footer), standard headings, no tables or text boxes. Details and sources in industries.md, section "Applicant-tracking formatting".

## 17. Length

The table in SKILL.md covers it. Two rules sit on top:

- Length follows relevant content. Never pad to reach two pages; never shrink fonts or margins to fit one (the app's Check flags small body fonts and tight margins).
- The evidence is weak on both sides. A vendor simulation with 482 reviewers found two-page resumes chosen more often, least so at entry level (`survey`, ResumeGo, suggestive only); official guides allow two pages in the UK and Canada and more in Australia. Tie length to career stage, not to a slogan.

## 18. Sources

- UK National Careers Service, CV sections: https://nationalcareers.service.gov.uk/careers-advice/cv-sections
- Job Bank Canada, writing a good resume: https://www.jobbank.gc.ca/findajob/resources/write-good-resume
- US EEOC, prohibited practices: https://www.eeoc.gov/prohibited-employment-policiespractices
- UK Equality Act 2010 s.60: https://www.legislation.gov.uk/ukpga/2010/15/section/60
- US OPM, two-page resume limit (Sep 2025): https://www.opm.gov/policy-data-oversight/hiring-information/merit-hiring-plan-resources/agency-guidance-on-the-two-page-limit-on-resume-length
- NACE Job Outlook 2025 spring update: https://naceweb.org/research/reports/job-outlook/2025/spring-update
- NACE on skills-based hiring: https://naceweb.org/job-market/trends-and-predictions/almost-two-thirds-of-employers-use-skills-based-hiring-to-help-identify-job-candidates
- Neumark, Burn and Button, age discrimination: https://www.nber.org/papers/w21669
- Weichselbaumer, headscarf field experiment: https://newsroom.iza.org/en/archive/research/discrimination-against-female-migrants-wearing-a-headscarf
- Ruffle and Shtudiner, photos and callbacks: https://cris.bgu.ac.il/en/publications/are-good-looking-people-more-employable/
- Rivera and Tilcsik, class signals: https://www.kellogg.northwestern.edu/faculty/research/detail/2016/class-advantage-commitment-penalty-the-interplay-of-social-class
- Pronoun audit (preregistration): https://www.socialscienceregistry.org/trials/11183
- Europass CEFR self-assessment grid: https://europass.europa.eu/system/files/2020-05/CEFR%20self-assessment%20grid%20EN.pdf
- Clearance on a resume: https://news.clearancejobs.com/2022/10/17/should-i-list-a-prior-clearance-on-my-resume/
- University of Arizona, academic CV to industry: https://career.arizona.edu/blog/2022/06/08/how-to-convert-an-academic-cv-for-industry-positions/
- Australian veterans' employment, writing a resume: https://www.veteransemployment.gov.au/partners-finding-and-getting-job/writing-resume
- ResumeGo one- vs two-page study: https://www.resumego.net/research/one-or-two-page-resumes/
- Jobscan on functional resumes (vendor view): https://www.jobscan.co/blog/recruiters-functional-resume-format/
