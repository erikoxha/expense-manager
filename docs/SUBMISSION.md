# Submission preparation

Topic: **Software Quality Testing of a Personal Expense and Budget Management Web Application**

Team:
- Erjon Koxha —231509
- Bora Alili —231504

Repository for application and tests: https://github.com/erikoxha/expense-manager

The supplied course notice sets submission to **28 September2026 at23:59**, understood in Europe/Skopje local time. It does not specify a presentation date. Check the course announcement for the presentation schedule; no claim that presentation is due on that date is made here.

## Implemented contributions

Erjon's backend contribution: pytest unit/API/PostgreSQL integration, explicit ISP traceability, Hypothesis properties, separate statement/branch coverage gates, k6 workload, bounded authenticated/passive ZAP scans, defect/retest evidence. See testing/PLAN.md, testing/ISP.md and testing/RESULTS.md.

Bora's frontend contribution: React Testing Library/Vitest/MSW, real browser UI/design assertions, Playwright real-app workflow including Statistics/charts, frontend coverage gates and CI artifacts. See her PR https://github.com/erikoxha/expense-manager/pull/1 and frontend/e2e guides after integration.

## Before submitting

- Review each PR and test both contributions together before merging. Preserve actual authorship and tested commit references.
- Retain the final passing CI runs and sanitized reports before their artifact retention expires.
- Produce one final PDF with the topic, both names/index numbers and source/test repository links on its title page.
- Explain setup, versions, commands, criteria, test selection, actual results, defects/retests, security triage and limitations. Explain which techniques extend the supplied course content without guaranteeing a grade.
- Check that the frontend Word report's summary reflects37 component/integration tests,4 UI browser tests and1 real-app workflow, with older runs labeled historical.
- Open the final PDF, inspect every page and check links. One team member uploads it to the assignment; the other confirms the submission receipt.

No application-form or course-assignment submission has been performed by this agent. The supplied eligibility rules still apply: already passed the course with grade7 or8, team up to3, and application for the intended session. The team should confirm their own eligibility and that their project application was submitted.
