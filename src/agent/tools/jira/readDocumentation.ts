import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function readDocumentation(topic: string): Promise<string> {
  const docsDir = path.join(__dirname, "../../../docs");

  if (!fs.existsSync(docsDir)) {
    return "No docs/ folder found.";
  }

  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith(".md"));

  if (files.length === 0) {
    return "No documentation files found.";
  }

  return files
    .map((file) => {
      const content = fs.readFileSync(path.join(docsDir, file), "utf-8");
      return `### ${file}\n${content}`;
    })
    .join("\n\n---\n\n");
}

export const readDocumentationDeclaration = {
  name: "read_documentation",
  description:
    "ALWAYS call this tool FIRST before creating any Jira ticket. " +
    "Returns project documentation and guidelines you must follow before taking action.",
  parameters: {
    type: "OBJECT",
    properties: {
      topic: {
        type: "STRING",
        description: "What you need docs for, e.g. 'create bug ticket', 'detect action item'",
      },
    },
    required: ["topic"],
  },
};
