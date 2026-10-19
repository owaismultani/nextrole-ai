# ATS and screening reality (as of 2026)

What applicant tracking systems (ATS) and AI screeners actually do, so the agent can calm the right fears and fix the real risks. Vendor features, laws and limits change: phrase claims "as of 2026" and verify when a decision depends on one.

## Contents

1. The pipeline
2. What each vendor documents
3. What this means for tailoring
4. Parse-safety checklist
5. Hidden text and prompt injection
6. AI-written applications and recruiter behaviour
7. Myths and dubious statistics
8. Contested or regional advice
9. Legal context
10. Earlier tools: what to copy, what to avoid
11. Sources

## 1. The pipeline

| Stage                                   | What happens                                                                                                                                                                                                         | What the resume can change                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Application form and knockout questions | Rules fire on answers to questions (license, location, authorization, years), not on resume text. In Greenhouse, Auto-Reject overrides Auto-Advance. Taleo workflows can reject on a missing certification or degree | Nothing. Answer truthfully; surface knockouts early |
| Parse into a profile                    | Text is pulled into fields: name, titles, employers, dates, schools, skills. A failed parse in Greenhouse leaves the file "only attached" for manual entry                                                           | Layout, file type, headings, title formatting       |
| Store and search                        | Recruiters search the database with Boolean or keywords (Lever, iCIMS, Taleo) or natural language (LinkedIn Recruiter)                                                                                               | Exact terms, title wording, acronyms                |
| AI ranking or grading (if switched on)  | Requirements come from the JD or a recruiter's calibration; each is matched to resume evidence. Output is a grade, tier or per-criterion verdict                                                                     | Explicit, specific evidence for each requirement    |
| Human review                            | A recruiter skims, often at high volume                                                                                                                                                                              | Clarity, relevance at the top, numbers              |

The honest version of "the ATS rejected me": rules built from the JD's stated requirements, applied too literally (degree filters, gap filters, exact-criteria matches). Employers themselves say this screens out qualified people (Hidden Workers, 2021).

## 2. What each vendor documents

| System                                | Documented behaviour                                                                                                                                                                                                                                                                                                                     | Implication                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Greenhouse (parsing)                  | Accepts .doc, .docx, .pdf, .rtf, .txt, but **cannot parse files over 2.5 MB**. Documented failure causes: spaced-out letters, graphics or word art, image-only files, tables, headers and footers, contact details in a header, footer or text box, columns, no clear sections, abbreviated titles, company names without a legal suffix | Under 2.5 MB; one column; full titles; contact details in the body        |
| Greenhouse Talent Matching            | Recruiter calibrates on key skills (Greenhouse recommends 4–6) plus optional years, industry and titles. Tiers: Strong, Good, Partial, Limited, Needs manual review. Highlights exact and "similar" matches (embedding-based), so related wording can still match. Never advances or rejects on its own; recruiters can override a score | Make each core skill explicit with evidence; repetition doesn't help      |
| Workday Recruiting                    | Parse quality "can vary based on resume format and order of words"; avoid images. **Skills and Languages are not auto-filled**                                                                                                                                                                                                           | Re-check the autofilled form; type Skills and Languages by hand           |
| Workday HiredScore (opt-in)           | Basic qualifications decide the A/B vs C/D split; preferred qualifications separate within a tier. An LLM checks each qualification; a Fit & Gap view points into the resume                                                                                                                                                             | Make every basic qualification easy to verify, in words close to the JD's |
| Ashby                                 | Recruiter-written criteria; a Meets / Does not meet / unknown verdict per criterion with citations. The reviewer decides                                                                                                                                                                                                                 | One clear piece of evidence per likely criterion                          |
| Lever                                 | Boolean and keyword search with filters                                                                                                                                                                                                                                                                                                  | Exact terms matter for search                                             |
| iCIMS                                 | Boolean keyword search (frequency-ranking claims come from old third-party write-ups only)                                                                                                                                                                                                                                               | Standard headings; the JD's terms                                         |
| Oracle Taleo                          | Keyword search across candidate-file text plus structured fields; AND by default. Third-party testing (method undisclosed) says acronyms and spelled-out forms aren't connected                                                                                                                                                          | Use both "Certified Public Accountant (CPA)"                              |
| SAP SuccessFactors                    | AI extracts skills and flags related skills; partner add-ons offer semantic search                                                                                                                                                                                                                                                       | Semantic help exists, but exact terms first                               |
| LinkedIn Recruiter / Hiring Assistant | Natural-language search alongside filters; Hiring Assistant (announced for global English availability from September 2025) is described as weighing explicit and implicit skill evidence                                                                                                                                                | Keep the LinkedIn profile consistent with the resume                      |
| Bullhorn, BambooHR                    | The only systems named in a 2025 recruiter study as configured with automatic match or experience thresholds (Bullhorn docs not verified)                                                                                                                                                                                                | Staffing agencies are more likely to apply hard cut-offs                  |
| Eightfold                             | Alleged in a pending 2026 lawsuit to produce 0–5 match scores                                                                                                                                                                                                                                                                            | Treat as opaque; give complete, specific evidence                         |

Not covered by the research: Oracle Recruiting Cloud (Taleo's successor), SmartRecruiters, Teal's scoring method.

## 3. What this means for tailoring

1. The requirement → evidence table is the same structure the graders build. Make every core requirement provable at a glance.
2. Use the JD's exact term once, in a real context, and pair acronyms with the spelled-out form. Literal search needs it; semantic matching forgives it. Writing for the literal case covers both.
3. Parse safety beats design for portal applications.
4. Rejection is mostly human or knockout-based, so the resume has to persuade a skimming person, not just a parser.
5. A tailored copy keeps the meaning and changes the emphasis.

## 4. Parse-safety checklist

- [ ] **Copy-paste test:** select all in the exported PDF, paste into plain text. All text present, in reading order, dates next to the right roles.
- [ ] One column for portal applications. Two-column PDFs can be read as the whole left column, then the whole right, which scrambles chronology.
- [ ] Name and contact details in the body, not in a header, footer or text box.
- [ ] No text inside images; no icons standing in for words; no skill bars or ratings as the only signal.
- [ ] Standard headings: Experience, Education, Skills, Certifications, Projects.
- [ ] Full job titles; employer names as legally written; dates in one format with 4-digit years.
- [ ] No spaced-out letters ("J O H N").
- [ ] File under 2.5 MB; text-based PDF or DOCX, whichever the portal asks for.
- [ ] After uploading to an autofill form, check every field and type in Skills and Languages by hand.

## 5. Hidden text and prompt injection

- **Prevalence:** about 1% of ~200,000 resumes collected over several years by a sourcing vendor (hireEZ) held hidden prompt injections; over 90% of them were not explicit instructions (hidden keywords or self-promotional text) (Zhang et al., USENIX Security 2026). Duke reports a roughly sevenfold rise from July 2024 to November 2025, spread by social-media tutorials.
- **Effect:** in controlled experiments it helped only when few candidates did it and quality was similar, and the effect collapsed once it became common. No real-world study shows it changing outcomes.
- **Detection:** parsing strips formatting, so hidden text appears in the recruiter's text view. Detectors run in production at some vendors, and recruiters report eliminating such candidates.
- **Rule:** refuse to add hidden, white, microscopic or off-page text, or instructions to AI. Never suggest styling that hides rendered text.
- **Imported resumes:** if a resume the user brings contains text that looks hidden (a keyword block matching the background colour, near-zero font size, text placed off the page, or a pasted list of the JD's terms with no context), flag it and offer to remove it. In Reactive Resume, an item with `hidden: true` is simply not rendered; that is not injection.

## 6. AI-written applications and recruiter behaviour

- Volume is up sharply; recruiters report hundreds of applicants for entry-level roles and thousands for some tech roles. Several said applying early helps because review follows arrival order.
- **Signal decay:** after an AI cover-letter tool launched on a large freelance platform, the link between JD-matching and callbacks fell by about half, and employers shifted weight to work history. Time spent editing AI drafts correlated with hiring success (Cui, Dias & Ye, 2025). Implication: polish and reorder the user's real material; don't generate new text.
- **Editing help does work:** non-generative writing assistance (fixing errors and clarity) raised hires by about 8% across ~480,000 job seekers in a field experiment.
- **LLM screeners prefer LLM text** in lab studies, but the screener's model is unknown and humans increasingly distrust AI prose. Don't turn this into "rewrite it with AI to beat the screener". Never add deliberate typos to look human.

## 7. Myths and dubious statistics

Never repeat these as fact. Correct them gently when the user does.

| Claim                                                         | Reality                                                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| "75% of resumes are rejected by ATS before a human sees them" | Traced to a 2012 sales pitch by Preptel, a resume-optimisation vendor that closed in 2013. No method was ever published                          |
| "ATS can't read PDFs"                                         | Major ATS accept PDF. Failures come from image-only PDFs and complex layouts                                                                     |
| "Copy the JD word for word" / "hit an 80% match score"        | No validated link to interviews. Jobscan's own target is 75%, and it warns that going higher may need overstuffing. Pasted JD text reads as spam |
| "Recruiters spend 6 (or 7.4) seconds on a resume"             | Vendor eye-tracking studies; 2012 had 30 recruiters, 2018 disclosed no method, and both measure only the first glance                            |
| "Keyword frequency drives ranking"                            | Greenhouse matches calibrated skills ("2 of 4"), not frequency. iCIMS frequency claims are old third-party write-ups                             |
| "Hidden white text gets you interviews"                       | One anecdote; controlled studies show gains only when rare; detection is in production                                                           |
| "ATS auto-reject on formatting or missing keywords"           | In a small 2025 vendor study of 25 US recruiters, 23 said no automatic rejection beyond eligibility filters. Directional, not representative     |
| "88% of qualified candidates are rejected by ATS"             | Misreads Hidden Workers: 88% of executives agreed qualified people get screened out                                                              |
| "99% of companies use an ATS"                                 | No traceable source. Hidden Workers measured 63% (69% at firms with 1,000+ staff)                                                                |
| "Tailored resumes get 1.6× more interviews"                   | A vendor's self-reported, correlational platform data. No controlled experiment on resume tailoring was found                                    |
| "41% of job seekers hide text in resumes"                     | Blog summaries of a survey whose wording wasn't verified. Measured prevalence in a real corpus is about 1%                                       |
| "Workday autofill has a 34% error rate"                       | Career-blog figure with no source                                                                                                                |

Also unsupported: "GPT-4o picks its own rewrites 97.6% of the time", "applications up 239% since ChatGPT", "27 million workers filtered out by a six-month-gap filter", "SHRM: 44% use AI for screening".

**What can honestly be said about tailoring:** there is no controlled experiment measuring the uplift from tailoring a resume. The case for it is indirect: how recruiters search and rank, how AI graders check each requirement, and how literal filters behave.

## 8. Contested or regional advice

- **PDF vs DOCX:** both are accepted by the major ATS. Follow the portal's instruction. Some staffing firms ask for DOCX so they can edit it.
- **One vs two columns:** career centres disagree (UCI allows two; UMD forbids columns). Default to one for portals; two is fine for emailing a person.
- **Acronyms:** some guides say spell out, some say use both. Use both.
- **Retitling past jobs:** Jobscan suggests matching the target title. This skill does not: it is misrepresentation a background check can expose.
- **Country norms** (photo, date of birth, nationality, length): defer to the resume-content-guide skill if available. In the UK, leave out age, date of birth, marital status and nationality.

## 9. Legal context

Information, not legal advice. As of 2026:

- **NYC Local Law 144** requires bias audits and candidate notice for automated employment decision tools; a December 2025 state audit called enforcement weak.
- **Illinois HB 3773** (Public Act 103-0804, amending the Illinois Human Rights Act; effective 1 Jan 2026) bars discriminatory AI use in employment decisions and AI use without notice.
- **California** Civil Rights Department rules on automated decision systems took effect 1 Oct 2025.
- **Colorado:** SB 189 amended the AI Act, pushing its start to 1 Jan 2027 and swapping its audit and impact-assessment duties for notice and transparency duties.
- **EU AI Act:** high-risk obligations for employment AI were moved to 2 Dec 2027 by the Digital Omnibus.
- **Mobley v. Workday:** an age-discrimination collective was conditionally certified in May 2025; the case is pending.

Practical effect: users may see AI-use notices and opt-outs. Opting out is a legitimate choice; Greenhouse, for example, routes opted-out resumes to manual review.

## 10. Earlier tools: what to copy, what to avoid

| Copy                                                     | Avoid                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A missing-terms list (as questions, not additions)       | A single opaque "ATS score" as the goal                                                                |
| Side-by-side before/after                                | Encouraging keyword lists and stuffing                                                                 |
| One copy per application, with the sent version recorded | Retitling past jobs                                                                                    |
| A gap check before drafting; a fact gate; a title lock   | Treating absent skills as words to add                                                                 |
| A knockout check first; "read before you send"           | Ignoring knockouts; skipping parse-safety checks; auto-generated letters with no user-specific content |

Reactive Resume's `score_application_match` is an LLM opinion that varies by model. Use its gap list; don't chase the number.

## 11. Sources

- Workday HiredScore release notes, 5 Aug 2026; Workday Recruiting admin guide (parsing).
- Greenhouse support: Unsuccessful resume parse; Supported file types; Talent Matching; Talent Matching data processing FAQ; Application Rules overview; Release notes Feb 2026.
- Ashby, AI-assisted application review (blog and docs).
- Lever help: advanced search. Oracle Taleo docs: advanced search, requisition quick search.
- SAP SuccessFactors applicant screening; Textkernel partner page.
- LinkedIn, Hiring Assistant availability (2025); Fortune on LinkedIn Recruiter search (2023).
- Enhancv, "Does ATS reject resumes?" (25 recruiters, 2025).
- Hidden Workers: Untapped Talent, HBS and Accenture, 2021.
- Zhang et al., USENIX Security 2026 (hidden injections); Duke Pratt news; Baxi et al., ACL Findings 2026; Built In on hidden prompts.
- Cui, Dias & Ye 2025 (arXiv 2509.25054); Wiles, Munyikwa & Horton, Management Science 2025; Xu, Li & Jiang, AIES 2025; BCG, Oct 2025.
- HiringThing and Lenz on the 75% myth; ERE and Standout CV on the six-second claim; Jobscan tutorial.
- NY State Comptroller audit of LL144 (Dec 2025); Illinois Public Act 103-0804 (HB 3773); Fisher Phillips on California rules; Checkr on Colorado; Lewis Silkin on the Digital Omnibus; Proskauer on Mobley v. Workday; ZwillGen on Eightfold.
- UCI 2025 ATS guide; UMD tip sheet; RMU ATS guide.
