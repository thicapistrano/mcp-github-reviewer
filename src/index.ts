import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const server = new Server(
  {
    name: "github-code-reviewer-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_pull_request_diff",
        description:
          "Fetches the code changes (diff) of a specific Pull Request for analysis.",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            pull_number: { type: "number", description: "Pull Request number" },
          },
          required: ["owner", "repo", "pull_number"],
        },
      },
      {
        name: "post_pr_review_comment",
        description:
          "Posts a code review comment on a specific line of a file changed in the PR. All comments must be written in English.",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            pull_number: { type: "number" },
            path: {
              type: "string",
              description: "File path (e.g. src/app.js)",
            },
            line: {
              type: "number",
              description:
                "The line number in the file where the comment should be placed",
            },
            body: {
              type: "string",
              description:
                "The review comment in Markdown with suggestions. MUST be written in English.",
            },
            status: {
              type: "string",
              enum: ["PENDING", "PUBLIC"],
              description:
                "Defines whether the comment should be published immediately ('PUBLIC') or created as a draft review pending user approval ('PENDING').",
            },
          },
          required: [
            "owner",
            "repo",
            "pull_number",
            "path",
            "line",
            "body",
            "status",
          ],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_pull_request_diff") {
      const { owner, repo, pull_number } = args as any;
      const { data } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
        headers: { accept: "application/vnd.github.v3.diff" },
      });
      return { content: [{ type: "text", text: data as unknown as string }] };
    }

    if (name === "post_pr_review_comment") {
      const { owner, repo, pull_number, path, line, body, status } =
        args as any;

      const reviewPayload: any = {
        owner,
        repo,
        pull_number,
        comments: [{ path, line, body: `🤖 **AI Suggestion:**\n\n${body}` }],
      };

      // If status is PUBLIC, submit the comment immediately.
      // If PENDING, omit the event parameter so it saves as a pending draft.
      if (status === "PUBLIC") {
        reviewPayload.event = "COMMENT";
      }

      await octokit.rest.pulls.createReview(reviewPayload);

      const successMessage =
        status === "PUBLIC"
          ? `Comment successfully published IMMEDIATELY on file ${path}, line ${line}!`
          : `Comment successfully added as PENDING draft on file ${path}, line ${line}. Check GitHub to approve it.`;

      return {
        content: [
          {
            type: "text",
            text: successMessage,
          },
        ],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error: any) {
    return {
      isError: true,
      content: [
        { type: "text", text: `Error executing tool: ${error.message}` },
      ],
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run();
