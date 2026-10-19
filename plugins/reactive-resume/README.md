# Reactive Resume

Job-search help for your AI agent, built around [Reactive Resume](https://rxresu.me), the free and open-source resume builder. The plugin bundles eight skills and the Reactive Resume MCP server, so your agent can read and edit the resumes, cover letters and job applications in your account.

## Skills

| Skill                     | What it does                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `resume-builder`          | Builds a new resume as Reactive Resume JSON, asking for every missing detail.                           |
| `resume-content-guide`    | Decides what belongs on a resume for your situation, country and industry, and audits an existing one.  |
| `resume-bullet-writer`    | Turns duties into impact bullets, asking for real numbers or honest ranges.                             |
| `resume-tailor`           | Fits one resume to one job posting on a copy, with gap questions and an optional cover letter.          |
| `job-application-manager` | Tracks applications, stages, follow-ups and the resume version you sent, and drafts messages.           |
| `interview-prep`          | Builds a story bank, a company brief and likely questions for a specific interview, then debriefs it.   |
| `mock-interview`          | Plays the interviewer for a specific job and scores your answers with quotes.                           |
| `offer-negotiation`       | Decodes an offer, plans one counter, drafts the email and call script, and rehearses the call with you. |

The skills never invent employers, dates, numbers or results. They ask, label estimates as estimates, and show you every change before writing it to your account.

## MCP server

The plugin connects to `https://rxresu.me/mcp`. The first time a skill needs your data, your agent asks you to sign in to Reactive Resume and approve access; no API key is stored in the plugin. Without signing in, the skills still work on text you paste.

Data goes only to your Reactive Resume account, under its [privacy policy](https://docs.rxresu.me/legal/privacy-policy). Tools that use AI (match scores, tailored summaries, drafted messages) run on the AI provider you configured in Reactive Resume, and the skills ask before calling them.

Self-hosting Reactive Resume? Install the skills on their own and connect your own server instead: `npx add-mcp <your-app-url>/mcp --name reactive-resume`.

## Install

Claude Code:

```sh
claude plugin install reactive-resume --marketplace reactive-resume/reactive-resume
```

Codex:

```sh
codex plugin marketplace add reactive-resume/reactive-resume
codex plugin add reactive-resume@reactive-resume
```

Then ask in plain language, for example "Tailor my resume to this job posting" or "Mock interview me for this role". Full guide: [Using agent skills](https://docs.rxresu.me/guides/using-agent-skills).

## License

MIT
