# Decoding an offer

Contents

1. Traps by component
2. Public-company RSUs
3. Private-company equity
4. Equity tax points: US taxpayers, then elsewhere
5. Sign-on, relocation and clawbacks
6. Retirement and benefits
7. Sales, physician and academic offers
8. Public-sector pay scales
9. Comparing several offers without MCP
10. Sources

Every figure in the decode carries a basis: `guaranteed`, `conditional`, `estimate` or `unknown`. Ask for what's missing; never fill it with a typical value. This file is general information, not financial, tax or legal advice: for exercise decisions, 83(b) elections, clawback signatures and non-competes, the user asks a tax adviser or an employment lawyer. Facts are as of 2026.

## 1. Traps by component

| Component          | Trap                                                                                                         | Do                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Base               | A monthly quote hides 13 or 14 payments (Austria, Spain, Germany, Mexico, Brazil, Philippines, Japan, China) | Ask "how many payments a year, and which are guaranteed?"; annualise (countries.md §1) |
| Target bonus       | "Target" read as guaranteed; year-1 proration; must be employed on the payout date                           | `conditional`, 0 to cap; ask for the last 2–3 years' payout as % of target             |
| Sign-on            | Folded into "first-year comp"; clawback unread                                                               | Keep one-off; get the clawback text; worst-case repayment by month (§5)                |
| Equity             | A 4-year average hides back-loaded vesting; private paper value treated as cash                              | Year-by-year vesting; private equity as a range with a 0 floor (§3)                    |
| Retirement match   | An unvested match counted in full                                                                            | Match × years the user expects to stay and be vested                                   |
| Benefits           | Invented premium values                                                                                      | List them; put a cash value only where the user gives a cost                           |
| Level / title      | Accepting a lower level for a slightly higher base                                                           | Level first: it sets the band, refreshers and future raises                            |
| Location / remote  | Remote said on a call but absent from the letter; location-based pay cut on a later move                     | Remote days and the location-pay policy in writing                                     |
| Notice / covenants | A long notice, unpaid garden leave or broad non-compete unread                                               | Duration, scope, whether garden leave is paid, non-solicit; counsel if broad           |

## 2. Public-company RSUs

- Value at vest moves with the share price. Show the grant value and say the year-by-year value is unknown.
- Vesting shapes differ. Amazon's is reported as 5/15/40/40 (Levels.fyi); other companies front-load or vest evenly. Compare offers year by year, never on a 4-year average.
- Ask about refreshers (annual new grants): policy, typical timing, and whether they're performance-based. Without an answer, refreshers are `unknown`, not an assumed figure.
- US: RSUs are taxed as income at vest. The default 22% federal supplemental withholding can under-withhold for higher earners, so the user may owe more at filing.

## 3. Private-company equity

**Facts to request.** Anything the employer won't share is `unknown`.

1. Number of options or RSUs, and the type: ISO, NSO, RSU (single or double trigger) or, outside the US, possibly virtual or phantom options.
2. Fully diluted share count, so the ownership % can be checked.
3. Strike price, and the current 409A fair market value and its date.
4. Latest preferred price per share.
5. Total liquidation preference, and whether any of it is above 1x or participating.
6. Vesting schedule, cliff, and acceleration on a sale or termination.
7. Post-termination exercise window (PTEW).
8. Whether early exercise is allowed.
9. Refresh policy.
10. Any past tender offers (company buybacks).
11. Leaver terms: what happens to vested options if the user resigns or is let go (good or bad leaver), and whether virtual options survive leaving.

**Context for those facts:**

- The strike comes from the 409A value of common stock, which sits below the preferred price because preferred shares carry a liquidation preference and other rights. The "common is worth 10–20% of preferred" rule of thumb has no traceable source; don't use it.
- 1x non-participating preference is the norm, but ask. In Carta's data, participating preferred appeared in about 4.8% of deals in Q4 2021, peaked at 15.6% in Q1 2023 and was 6.1% in Q3 2023.
- About 80% of terminated grants in Q1 2024 had the standard 90-day exercise window (Carta). In 2022, nearly 50,000 employees at $1B+ companies walked away from vested options worth over $1.8B at 409A value. A longer PTEW is a good non-cash ask; note that ISOs exercised more than 3 months after leaving are taxed as NSOs.
- Double-trigger RSUs vest only when the time condition is met **and** a liquidity event happens, and often expire after about 7 years by convention (not by law). Expiry before a liquidity event is a real risk.
- Liquidity before an IPO isn't guaranteed. Carta counted a record 16,538 employees selling in tender offers in 2025 (about 20% of them former employees), still a small share of holders. In Gunderson Dettmer's review of about 250 tenders, the median cap was 20% of vested holdings for current employees (28% for former), the price equalled the latest preferred in 60% of deals, and discounts were usually over 10% otherwise.
- Outside the US, ask whether these are real options or a virtual plan. Virtual (phantom) plans, common at German startups, usually pay cash only at an exit and are taxed differently; read the plan terms and ask a local tax adviser (verify).

**Valuing as a range.** Paper value (units × (preferred price − strike)) is not a valuation. Build scenarios the user chooses, show them as assumptions, not probabilities, and keep the equity's currency even when salary is in another one.

Worked example 1 (options count known):

- Offer: 20,000 ISOs at a $2.00 strike (the 409A value). Latest preferred $10.00. 100M fully diluted shares, so 0.02%. 4-year vesting, 1-year cliff, 90-day PTEW. The user assumes 30% further dilution.
- Paper value: 20,000 × ($10 − $2) = $160,000. Not a valuation.
- Failure, or a sale below the preference stack: $0. Example: $150M of 1x preference and a $120M sale leaves common holders nothing.
- Flat (a sale at today's valuation after dilution that cuts each holder's stake by 30%, stake × 0.7): $10 × 0.7 = $7 a share → (7 − 2) × 20,000 = $100,000 pre-tax.
- 3× today's valuation, same dilution: $21 a share → (21 − 2) × 20,000 = $380,000 pre-tax.
- Say: "Equity: $0 to about $380k pre-tax over 4+ years, illiquid, under your assumptions. Exercise cost $40k, plus tax exposure."
- Leaving at month 24: 10,000 vested options cost $20,000 to exercise, plus tax, within 90 days, or they're lost.

Worked example 2 (only a percentage given; "0.1% in options at a $2 strike"):

- First ask: number of options, fully diluted share count, latest preferred price, preference stack, vesting, PTEW, and real or virtual options. Until then the value is `unknown`.
- Show the method with the user's own assumptions. If the company says 10M fully diluted shares: 0.1% = 10,000 options, exercise cost 10,000 × $2 = $20,000.
- After assumed dilution that cuts the stake by 30% (stake × 0.7) it is about 0.07%. Above the preference stack, a rough pre-tax value is 0.07% × exit value − exercise cost: a $100M exit gives about $50,000; a $500M exit about $330,000. A sale below the preference stack gives about $0. The simple pro-rata model is rough: it assumes preferred converts to common, which holds only well above the stack.
- Say: "Worth $0 to about $330k pre-tax under these assumptions, illiquid until a sale or IPO, with $20k to exercise. Decide whether the cash alone works; treat this as upside." Whether 0.1% is generous depends on stage and role; give no "typical" percentage without a source the user can check (grant-size benchmarks: evidence.md §4).

## 4. Equity tax points: US taxpayers, then elsewhere

**US taxpayers only** (verify with a tax adviser):

- **ISOs:** no regular income tax at exercise, but the spread counts for the alternative minimum tax (AMT). ISO treatment needs exercise within 3 months of leaving (1 year for disability). Options first exercisable in one year above $100,000 of grant-date value are treated as NSOs. Holding rules: 1 year from exercise and 2 years from grant for favourable treatment.
- **2026 AMT change:** the exemption phase-out now starts at $500,000 (single) / $1,000,000 (joint), at 50 cents per dollar instead of 25, so ISO exercisers face more AMT. Verify against the IRS revenue procedure.
- **NSOs:** the spread at exercise is ordinary income.
- **83(b) election** (restricted stock or early-exercised shares): due within 30 days of the transfer, no extensions, irrevocable, and tax paid isn't refunded if the shares are forfeited. Since mid-2025 it can be filed online (Form 15620) through an IRS account.
- **QSBS** for stock issued after 4 July 2025: 50%, 75% or 100% gain exclusion after 3, 4 or 5 years; cap $15M; gross-assets test $75M. Early exercise starts the clock but puts cash at risk.

**Elsewhere** (verify locally with a tax adviser):

- **Germany:** virtual-option payouts are usually taxed as salary at payout; §19a EStG can defer tax on qualifying startup equity; ask a Steuerberater.
- **UK:** EMI options may avoid income tax at exercise if the exercise price is at least the market value at grant.
- **India:** ESOPs are taxed as a perquisite at exercise; employees of eligible startups can defer the tax.

## 5. Sign-on, relocation and clawbacks

Ask for the exact clawback text, then show the worst case. Example: a 30,000 sign-on, repaid pro rata over 24 months on a voluntary exit: leave at month 6 → repay 22,500; month 12 → 15,000; month 18 → 7,500. Reasonable asks: pro-rata repayment, triggered only by a voluntary or for-cause exit, net of the tax already paid.

- **California, AB 692** (agreements signed from 1 Jan 2026): bars most "stay-or-pay" terms, including retention and relocation repayment. A sign-on clawback is allowed only if it's in a separate agreement, the worker is told they may consult a lawyer and gets 5 business days to do so, repayment is pro-rata, interest-free and over at most 2 years, the worker can choose to defer receiving the bonus, and repayment is triggered only by a voluntary quit or misconduct. Damages are $5,000 per worker or actual damages, whichever is greater.
- **New York, Trapped at Work Act:** signed 19 Dec 2025, amended by chapter amendment 13 Feb 2026. Most firm alerts read the effective date as 19 Dec 2026; some flag 13 Feb 2027 as possible. It limits repayment of bonuses and relocation money to narrow cases (for example, a voluntary quit or a misconduct termination). Verify before signing a clawback.
- **India:** the Supreme Court in _Vijaya Bank v. Narnaware_ (2025) upheld a ₹2 lakh minimum-service bond at a public-sector bank; commentators warn private employers can't assume the same result.
- Use a sign-on to bridge pay the user would forfeit (unvested equity, a bonus due soon, a notice buyout), and document the forfeited amount (a vesting screenshot, a bonus letter). That is legitimate leverage.

## 6. Retirement and benefits

- **US 401(k):** the most common match formula is 50% of the first 6% of pay. Matches vest immediately, on a cliff of up to 3 years, or graded over up to 6 years: always ask for the schedule, because an unvested match is worth 0 if the user leaves early.
- **UK pension auto-enrolment:** at least 8% of qualifying earnings, at least 3% from the employer; the qualifying band is £6,240–£50,270 for 2025/26 and 2026/27. Compare the employer % and the basis (banded earnings vs full salary); don't value it beyond the stated %.
- Health premiums, PTO, stipends: list them; value in cash only where the user supplies a cost.

## 7. Sales, physician and academic offers

**Sales (OTE = base + target variable at 100% of quota).** Ask for last year's quota-attainment distribution, ramp and quota relief, accelerators, decelerators and caps, whether a draw is recoverable, territory and account changes, when commission counts as earned, chargeback and clawback triggers, and what's paid after leaving. Value the variable as `conditional`, using the employer's attainment data, never an assumed 100%. California Labor Code 2751 requires a signed written commission agreement covering how commissions are computed and paid (a handbook isn't enough), including for out-of-state employers with California reps.

**Physicians (wRVU contracts).** Negotiate the threshold, the $ per wRVU, guarantee vs reconciliation, call pay and APP credit, tail coverage and the non-compete. A lower base can win: at 5,400 wRVUs and $48 per wRVU, $200k base with a 5,000 threshold pays $219.2k, while $180k base with a 4,500 threshold pays $223.2k (FastRVU, a vendor). Benchmarks disagree widely: for heme/onc in the South at the 90th percentile, MGMA shows about $865k, SullivanCotter $596k, AMGA $694k. Fair-market-value rules (Stark, Anti-Kickback) can genuinely cap what the employer may pay; that is a real limit, not necessarily a bluff.

**Academic.** Negotiable: start-up funds, summer salary (9- vs 12-month appointment), teaching relief, graduate student or RA support, rollover of unspent start-up funds, start date, relocation, dual-career help. Benefits and tenure rules are usually fixed by policy. Benchmarks: AAUP and the Chronicle, AAMC, CUPA-HR; public-university salaries are public records.

## 8. Public-sector pay scales

The grade is set; the negotiation is about the step, allowances and leave.

- **US federal GS:** the default is step 1. An agency may set pay up to step 10 for superior qualifications or a special agency need, for a first federal appointment or a return after a break of at least 90 days. Approval must come **before the start date** and can't be made retroactively: in one OPM claim, a step 4 promised in the offer letter was lost because approval came too late. Other levers: a recruitment incentive, and annual-leave credit for relevant non-federal experience. OPM's rule and fact sheet say agencies may not consider non-federal salary or a competing offer and shouldn't ask for them. At least one agency (GSA, order 9531.1C, April 2026) says it no longer applies the 2024 changes. Assume a competing offer can't be used unless this agency's HR says otherwise. Never decline the tentative offer to trigger a step review; ask HR, before accepting, whether they'll consider a superior-qualifications determination, which must be approved before the start date. Script in scripts.md §8.
- **NHS Agenda for Change:** starting above the band minimum is at the employer's discretion and needs evidence of relevant experience, raised before the offer is finalised.
- **UK Civil Service:** external hires usually start at the band minimum. How much room exists above it varies by department and sources are thin; ask in writing about an above-minimum start and any allowances.
- **India public sector:** the pay-matrix cell is normally fixed. The 8th Pay Commission's terms of reference were approved on 28 Oct 2025, with a report expected around May 2027.

## 9. Comparing several offers without MCP

With MCP connected, decode each offer and point the user to Career → Offers for the side-by-side view. Without it:

|                                    | Offer A (currency)  | Offer B (currency) | Basis                 | Source       |
| ---------------------------------- | ------------------- | ------------------ | --------------------- | ------------ |
| Base (annual, n payments)          |                     |                    | guaranteed            | offer letter |
| Statutory or collective extras     |                     |                    | guaranteed / law      | countries.md |
| Target bonus                       | 0 to cap            |                    | conditional           |              |
| Sign-on (clawback terms)           |                     |                    | one-off               |              |
| Equity                             | range + assumptions |                    | estimate              | §2–3         |
| Retirement match (vesting)         |                     |                    | conditional on tenure |              |
| **Year-1 cash**                    |                     |                    |                       |              |
| **4-year base (if employed)**      |                     |                    |                       |              |
| **Conditional or estimated range** |                     |                    |                       |              |
| Level, remote, notice, covenants   |                     |                    | terms                 |              |
| Unknowns to ask                    | list                | list               |                       |              |

Never sum the three bold rows into one number. Differences between offers are shown only when currency and pay period match; otherwise list both as given.

## 10. Sources

- Levels.fyi, Amazon vesting: https://www.levels.fyi/companies/amazon/salaries
- Candor, double-trigger RSUs and withholding: https://candor.co/articles/money-matters/let-s-demystify-double-trigger-rsus
- Goodwin, double-trigger RSUs: https://www.goodwinlaw.com/en/insights/publications/2023/02/02_16-what-are-doublevest-rsus
- Oxford Business Law Blog, RSU expiry convention: https://blogs.law.ox.ac.uk/oblb/blog-post/2024/02/regulating-startup-equity-compensation-unicorn-era
- a16z, 409A valuations: https://a16z.com/16-things-to-know-about-the-409a-valuation/
- Carta, deal terms Q3 2023: https://www3.carta.com/blog/deal-terms-q3-2023
- Carta, 90-day exercise windows: https://carta.com/data/linkedin-employee-stock-options-90-days-too-short/ and https://carta.com/data/linkedin-90-day-option-window-unfair/
- Cooley GO, extending exercise windows: https://www.cooleygo.com/extending-post-termination-option-exercise-periods-what-you-should-know/
- Carta, employee tender offers in 2025: https://carta.com/data/linkedin-startup-tender-offers-employee-liquidity-2025/
- Gunderson Dettmer, tender offers: https://www.gunder.com/en/news-insights/insights/private-markets-liquidity-a-review-of-tender-offers
- 26 CFR 1.422-1 (ISOs): https://www.federal-regs.com/title/26/part-1/1.422-1/
- Pulley, ISO $100k limit: https://pulley.com/guides/iso-100k-limit
- Mercer Advisors, AMT after 2025 legislation: https://www.merceradvisors.com/insights/taxes/alternative-minimum-tax-after-obbba/
- Mintz, online 83(b) filing: https://www.mintz.com/insights-center/viewpoints/2906/2025-07-29-new-electronic-filing-option-section-83b-elections
- Crowell, QSBS changes: https://crowell.com/en/insights/client-alerts/the-one-big-beautiful-bill-act-expands-favorable-qsbs-treatment
- Akin, California AB 692: https://www.akingump.com/en/insights/alerts/californias-assembly-bill-692-restricting-many-so-called-stay-or-pay-employment-contract-terms-set-to-take-effect-january-1-2026
- Holland & Knight, New York Trapped at Work Act: https://www.hklaw.com/en/insights/publications/2026/03/new-york-amends-trapped-at-work-act
- LiveLaw, employment bonds in India: https://www.livelaw.in/lawschool/articles/supreme-court-employment-bonds-restrictive-covenants-section-27-indian-contract-act-543701
- MGMA, sign-on clawbacks: https://mgma.com/mgma-stat/clawbacks-on-clinician-sign-on-bonuses-more-common
- Bankrate, 401(k) match: https://www.bankrate.com/retirement/401k-match
- GOV.UK, auto-enrolment bands 2026/27: https://www.gov.uk/government/publications/review-of-the-automatic-enrolment-earnings-trigger-and-qualifying-earnings-band-for-202627/review-of-the-automatic-enrolment-earnings-trigger-and-qualifying-earnings-band-for-202627
- CalChamber, written commission agreements: https://p-hrcalifornia.calchamber.com/hr-library/qa/employees-paid-commission-required-written-agreement-employment-contract-employees
- Healio, physician wRVU contracts: https://www.healio.com/news/hematology-oncology/20260102/how-physicians-can-negotiate-work-relative-value-unit-contracts-with-large-health-systems
- FastRVU, threshold example (vendor): https://fastrvu.com/articles/rvu-contract-negotiation-guide
- Becker's, physician benchmark divergence: https://www.beckershospitalreview.com/hospital-transactions-and-valuation/4-common-mistakes-in-determining-fair-market-value-for-physician-compensation/
- UNC, negotiating faculty offers: https://research.unc.edu/wp-content/uploads/2018/02/Handout-Negotiating-Offers-for-Faculty-Positions-Feb-2018.pdf
- OPM, superior qualifications pay setting: https://www.opm.gov/policy-data-oversight/pay-leave/pay-administration/fact-sheets/superior-qualifications-and-special-needs-pay-setting-authority/
- OPM claim 16-0004: https://www.opm.gov/policy-data-oversight/pay-leave/claim-decisions/compensation-leave/claims/2017/16-0004/
- GSA order: https://www.gsa.gov/directives-library/superior-qualifications-and-special-needs-pay-setting-authority
- OPM, annual-leave credit: https://www.opm.gov/policy-data-oversight/pay-leave/leave-administration/fact-sheets/creditable-service-for-annual-leave-accrual-for-non-federal-work-experience-and-experience-in-the-uniformed-service/
- NHS Wales, starting salary guidance: https://phw.nhs.wales/about-us/policies-and-procedures/policies-and-procedures-documents/human-resources-policies-supporting-documents/incremental-credit-and-starting-salary-guidance-2023/
- Business Today, 8th Pay Commission: https://businesstoday.in/personal-finance/story/8th-pay-commission-18-month-deadline-ends-in-may-2027-what-happens-next-549222-2026-08-14
