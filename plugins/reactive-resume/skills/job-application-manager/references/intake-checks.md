# Intake checks: tiering, ghost jobs and scams

How to decide how much effort a posting deserves, and how to spot postings that are stale or dangerous. Platform features, laws and fraud patterns change: phrase claims "as of 2026" and verify when a decision depends on one.

## Contents

1. Tier and channel
2. Ghost-risk checklist
3. Scam hard stops
4. Soft flags
5. If money or data has already moved
6. Sources

## 1. Tier and channel

Channel matters more than volume. In Ashby's data (tech and startup-heavy), referrals were about 1% of applications (38M applications, 2021–2024) and about 17–18% of hires (about 250K hires, 2021 to mid-2025). By stage:

| Channel                           | Application → interview | Interview → offer |
| --------------------------------- | ----------------------- | ----------------- |
| Employee referral                 | ~40%                    | ~16%              |
| Sourced (recruiter reached out)   | ~25%                    | ~6%               |
| Inbound (job board, careers page) | ~3%                     | ~6%               |

US small-business data (CareerPlug, 2024) shows the same 3% applicant-to-interview rate. One large employer study (NY Fed) found referred hires were more likely to be hired and stayed longer. Treat all of these as directional; the user's own numbers win once there are enough of them.

| Situation                                    | Action                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier A (top target, strong fit)              | Find a first- or second-degree contact; ask for a referral or intro (messages.md §4), then ask the referrer whether to apply first or wait for their submission (referral systems differ). Apply on the company's own site, not an aggregator. If the user already applied, still ask; the contact can flag the application to the recruiter. |
| Tier B (good fit, no contact)                | Tailored application on the company site, plus one note to a named recruiter or hiring manager if one can be found.                                                                                                                                                                                                                           |
| Tier C (stretch or exploratory)              | Light-touch application; cap the time per application (e.g. 20 minutes).                                                                                                                                                                                                                                                                      |
| A recruiter reached out first                | Reply within 1–2 business days and log source `recruiter-inbound`; sourced candidates reach interview often enough to be worth answering.                                                                                                                                                                                                     |
| Only an aggregator "easy apply" is available | Look for the same role on the company careers page and apply there. (Self-reported tracker data suggests employer-site applications do better; this is an inference, not a tested result.)                                                                                                                                                    |

Tailoring is worth it for A and B: in one tracker's self-reported 2025 data, tailored resumes converted to interview at about 5.8% against 3.7% untailored. Hand tailoring to resume-tailor.

**Volume check.** If the user sends more than ~40 applications a week and has under ~1% responses across 50 or more, recommend fewer, better-targeted applications. More applications raise interview counts but not the quality of the job found (van Hooft et al. 2021 meta-analysis), and the quality of the search predicts both.

## 2. Ghost-risk checklist

A posting that closes unfilled isn't necessarily fake. In Ashby's 2024 data, 82% of open jobs were filled; the rest included paused roles (5.5%), offers made with no hire (1%) and closures with no reason given (3.5%). Score these signals, never auto-skip, and reduce effort rather than hope. Check what's in the posting text first; for tier A only, and only when a web tool is available, run one search for the role on the company's careers page and one for recent layoffs. Skip web research for B and C.

- Posted more than 45–60 days ago, or reposted repeatedly.
- No pay range in a jurisdiction that requires one (see pipeline-rules.md §7).
- "Talent pool", "evergreen", "always accepting applications" wording.
- No named team or hiring manager, and a generic description.
- Missing from the company's own careers or ATS page.
- The company recently announced layoffs or a hiring freeze.
- **Ontario, Canada** (postings on or after 1 Jan 2026, employers with 25+ staff; general "talent pool" campaigns, internal-only postings and work done entirely outside Ontario are exempt): postings must say whether a vacancy currently exists, disclose AI used in screening, give pay or a range (spread of $50K or less unless pay exceeds $200K) and not require "Canadian experience". A posting stating there is no existing vacancy is a strong ghost signal; a covered posting missing these is a soft flag, since the applicant usually can't verify the employer's size.

Action: tag `ghost-risk`, apply tier C effort unless the user insists, and look for a human contact who can confirm the role is real.

## 3. Scam hard stops

Flag, tag `suspected-scam`, and do not continue intake or draft messages until the user has read the warning and decides. FTC-reported losses to job and employment-agency scams rose from $90M in 2020 to $501M in 2024; "task" scams went from about 5,000 reports in all of 2023 to about 20,000 in the first half of 2024.

| Signal                                                                                                           | Why it's a stop                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Any request to pay: training, equipment, certification, placement fee, a deposit "to unlock earnings"            | Legitimate employers don't charge candidates to be hired                                                                        |
| A check to deposit, keep part of, and forward or spend on gift cards or equipment                                | Fake-check fraud: the check bounces after the money has gone                                                                    |
| Paid "tasks": rating, liking, app "optimization", payment in crypto                                              | The task-scam pattern the FTC and FBI IC3 warn about                                                                            |
| Reshipping packages from home                                                                                    | Usually stolen goods                                                                                                            |
| Running a repo or package supplied by a recruiter or interviewer you can't verify, especially during a live call | Documented malware campaigns (e.g. "Contagious Interview", 2023) target developers this way, often with crypto or web3 projects |
| Requests for a national ID number, bank details or ID documents before a verified written offer                  | Identity theft. In the US, employment-eligibility paperwork is completed at hire                                                |
| An unsolicited text or WhatsApp job offer                                                                        | Common opening for task scams                                                                                                   |

**Take-homes, safely.** An ordinary take-home that needs a repo cloned or code run is normal for engineering roles and is a soft flag at most (§4). Advise running any take-home only in a disposable environment (a fresh container, VM or cloud sandbox), never on an employer-issued laptop or a machine holding credentials. Check that the company and the interviewer exist: the company's own careers page lists the role, and the recruiter's email domain matches the company.

## 4. Soft flags

Warn and continue: an ordinary take-home or live task that needs someone else's code run (run it only in a disposable VM or container; see "Take-homes, safely" in §3); interviews held only by chat; pay far above market for little work; a recruiter on a free email domain or a domain that doesn't match the company; pressure to decide the same day; a job title that doesn't match the duties; vague answers about who the employer is.

Suggested check: ask the user to find the role on the company's own site, or to email a published company address to confirm the recruiter. Don't search the web for the user's own details.

## 5. If money or data has already moved

Say this plainly and early, without blame:

1. Contact the bank, card issuer or payment app immediately and ask them to stop or reverse the payment.
2. Stop all contact with the "employer" and don't send more money to "unlock" a refund (a common second-stage scam).
3. US: report at ReportFraud.ftc.gov and, for identity theft, IdentityTheft.gov; elsewhere, the national fraud-reporting service or the police.
4. If ID documents or a national ID number were shared, follow the identity-theft steps (credit freeze where available).
5. If software was installed, disconnect the machine and treat its stored passwords and keys as compromised; change them from another device.

Log a note on the record (`Note: suspected scam, reported <date>`) and close it as `withdrew`.

## 6. Sources

- Ashby Talent Trends: referrals; inbound; startup hiring; ghost jobs (2021–2025 data).
- CareerPlug, Recruiting metrics and KPIs (2025 report, 2024 data).
- Huntr, 2025 annual job search trends report (self-reported tracker data).
- van Hooft et al. (2021), Journal of Applied Psychology, job-search meta-analysis.
- Brown, Setren & Topa, NY Fed Staff Report 568, referrals.
- Ontario, Your guide to the Employment Standards Act: publicly advertised job postings (2026 rules).
- FTC press release, March 2025 (2024 fraud data); FTC Data Spotlight, December 2024 (task scams); FTC consumer advice, Job scams.
- FBI IC3 PSA, 4 June 2024 (task scams).
- Palo Alto Networks Unit 42, campaigns targeting job hunters (November 2023).
