# Claude Code Instructions — jira-dev-mcp

## Critical rule: stop and ask when uncertain

When working on this codebase, if you encounter something you do not understand
and cannot resolve after checking available resources (docs, code, tests):

**STOP. Ask the user explicitly. Do not guess.**

Guessing wastes time with invalid code that looks plausible but is wrong.
A one-sentence clarifying question costs nothing; a wrong implementation costs a review cycle.

Examples of when to ask:
- The intended behavior of a Jira API field is ambiguous
- The correct auth flow for a new OAuth scope is unclear
- A type mismatch has multiple possible fixes with different semantics
- A test failure could mean the test is wrong or the code is wrong — unclear which

## Language

Always respond in Chinese (中文) in this project.

## Workflow

This is a local MCP server. Changes must:
1. Pass `npx tsc --noEmit` (zero errors)
2. Pass `npm test` (all tests green)
3. Not break the 6 registered MCP tools: `jira_search_issues`, `jira_read_task`,
   `jira_download_attachment`, `jira_my_tasks`, `jira_set_project_path`, `jira_get_project_path`
