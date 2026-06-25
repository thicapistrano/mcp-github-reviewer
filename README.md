# MCP GitHub Code Reviewer

An MCP (Model Context Protocol) server that gives Claude the ability to fetch Pull Request diffs from GitHub and post inline code review comments directly on the PR — either as a pending draft for you to approve, or published immediately.

## How it works

```text
You (Claude Code) ──► MCP Server (src/index.ts) ──► GitHub API
                           │
                     Two tools exposed:
                     • get_pull_request_diff
                     • post_pr_review_comment
```

When running as an MCP server, Claude can call these tools in response to natural language prompts. You describe which PR to review, and Claude fetches the diff, analyzes the code, and posts structured inline comments.

There is also a standalone script (`review.js`) that automates the same workflow without MCP — useful for CI pipelines or one-off runs outside Claude Code.

## Tools available

### `get_pull_request_diff`

Fetches the raw diff of a Pull Request from GitHub.

| Parameter    | Type   | Description                       |
| ------------ | ------ | --------------------------------- |
| `owner`      | string | GitHub username or organization   |
| `repo`       | string | Repository name                   |
| `pull_number`| number | PR number                         |

### `post_pr_review_comment`

Posts an inline review comment on a specific line of a changed file.

| Parameter     | Type   | Description                                                                     |
| ------------- | ------ | ------------------------------------------------------------------------------- |
| `owner`       | string | GitHub username or organization                                                 |
| `repo`        | string | Repository name                                                                 |
| `pull_number` | number | PR number                                                                       |
| `path`        | string | File path (e.g. `src/app.js`)                                                   |
| `line`        | number | Line number where the comment will appear                                       |
| `body`        | string | Comment text in Markdown                                                        |
| `status`      | string | `PENDING` saves as a draft (you publish on GitHub); `PUBLIC` submits immediately|

## Prerequisites

- Node.js 18+
- A GitHub Personal Access Token with `repo` scope
- Claude Code (to use as an MCP server)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
GITHUB_TOKEN=ghp_YourGitHubTokenHere
```

## Running as an MCP server (Claude Code)

Add this server to your Claude Code MCP configuration (`~/.claude/claude_desktop_config.json` or via `claude mcp add`):

```json
{
  "mcpServers": {
    "github-code-reviewer": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-github-reviewer/src/index.ts"],
      "env": {
        "GITHUB_TOKEN": "ghp_YourGitHubTokenHere"
      }
    }
  }
}
```

Or start the server manually:

```bash
npm start
```

## Running the standalone script

The `review.js` script runs a full automated review without MCP. Edit the `REPO_CONFIG` at the top of the file, then:

```bash
node review.js
```

It will fetch the PR diff, send it to Claude via the Anthropic API, and post the resulting comments to GitHub automatically.

## Example prompts

Use these prompts in Claude Code after the MCP server is connected:

---

**Review with pending draft (recommended for first use):**

> Review the PR 360 in dafiti-group/freight-connector and use post_pr_review_comment with status: "PENDING" so I can double-check everything on GitHub before publishing.

Claude will fetch the diff, analyze the code, and save the comments as a pending draft review on GitHub. You then go to the PR on GitHub and click "Submit review" when you're happy with the comments.

---

**Review and publish immediately:**

> For immediate launch: "Review the PR and use post_pr_review_comment with status: "PUBLIC" to submit the comments directly."

Claude will post every comment live on the PR as soon as it finishes the analysis.

---

**Full review in Portuguese:**

> Por favor, liste as alterações e faça o code review do PR número 42 do repositório seu-usuario/seu-repositorio. Se encontrar problemas, use a ferramenta de comentário para postar direto no GitHub.

Claude will list the changed files, analyze the diff, and post inline comments directly to the PR.

---

## Project structure

```text
mcp-github-reviewer/
├── src/
│   └── index.ts      # MCP server — exposes tools to Claude
├── review.js         # Standalone script using the Anthropic API directly
├── package.json
├── tsconfig.json
└── .env              # GITHUB_TOKEN goes here
```

## Dependencies

| Package                       | Role                                             |
| ----------------------------- | ------------------------------------------------ |
| `@modelcontextprotocol/sdk`   | MCP server framework                             |
| `@octokit/rest`               | GitHub API client                                |
| `@anthropic-ai/sdk`           | Anthropic Claude API (used by `review.js`)       |
| `dotenv`                      | Loads `.env` variables                           |
| `tsx`                         | Runs TypeScript directly without a build step    |
