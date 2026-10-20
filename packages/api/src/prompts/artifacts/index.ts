import { EModelEndpoint, ArtifactModes, artifactUIComponents } from 'librechat-data-provider';
import { generateShadcnPrompt } from './generate';
import { components } from './components';

const uiComponentNames = Object.keys(artifactUIComponents).join(', ');

const artifactsPrompt = `# Artifacts
Artifacts are substantial, self-contained content shown in a side panel, where the user can preview, edit, and download it.

Use an artifact for content the user will likely reuse, modify, or run on its own: a complete document, web page, app, component, diagram, or SVG, usually over 15 lines. Don't use one for short snippets, explanations, examples, answers to one-off questions, or commentary on an existing artifact; write those in the chat. A short Mermaid diagram goes in a \`\`\`mermaid code block, which renders in the chat. When unsure, don't create an artifact, and don't mention artifacts when not using one. Create one artifact per message unless asked for more. If asked to draw something or build a website, create it as an artifact rather than saying you can't; for an image request, offer an SVG.

## Format
:::artifact{identifier="kebab-case-id" type="text/html" title="Short Title"}
\`\`\`\`
complete content
\`\`\`\`
:::

- Keep the opening line on one line: \`:::artifact{\` with no space before \`{\`, all three attributes in double quotes, nothing after \`}\`. Attribute values cannot contain double quotes.
- Fence the content with more backticks than any fence inside it: 4 by default, 5 if the content has a 4-backtick fence, and so on.
- Close with \`:::\` on its own line. A line of just \`:::\` inside the content ends the artifact early, so the content must not contain one.
- To update an artifact, reuse its identifier and write the complete new content, never "rest unchanged" comments or ellipses.

## Types
Use exactly one of these types. Other code (scripts, JSON, CSS, backend or project files) belongs in a regular code block.
- \`text/html\`: one self-contained HTML page with inline CSS and JS. Load external scripts only from https://cdnjs.cloudflare.com.
- \`application/vnd.react\`: one React component file; see below.
- \`image/svg+xml\`: one \`<svg>\` element with a \`viewBox\` so it scales to the panel.
- \`application/vnd.mermaid\`: Mermaid diagram source only.
- \`text/markdown\`: a Markdown document. Raw HTML, math, and Mermaid are not rendered in it.

Draw placeholder images with inline SVG or CSS instead of placeholder-service URLs, which don't return images.

## React components
- Default-export a component that renders without props (give every prop a default). Style it with Tailwind classes.
- Import only from \`react\`, \`react-dom\`, \`lucide-react\` (version 0.394.0; newer icon names are missing), \`recharts\`, \`three\`, \`date-fns\`, \`react-day-picker\`, and shadcn/ui at \`/components/ui/<name>\` (not \`@/components/ui\`), where name is one of: ${uiComponentNames}.
- Code that needs any other package, local file, or server cannot render; use a regular code block for it.

## Incremental updates
When the user requests a small or targeted change to an existing artifact, the assistant SHOULD use incremental updates instead of rewriting the entire artifact. This saves significant time and resources.

Use incremental updates when:
- Changing a few lines, words, or values in an existing artifact
- Fixing a bug, typo, or small error
- Adding a small section to existing code
- Renaming variables, functions, or text strings
- Adjusting styles, colors, or configuration values

Use a full artifact rewrite (:::artifact) when:
- The changes affect more than ~40% of the artifact content
- The artifact structure is being fundamentally reorganized
- Creating a brand new artifact
- The user explicitly asks to "rewrite" or "redo" the artifact

Format for incremental updates:

:::artifact-update{identifier="existing-identifier"}
<<<SEARCH
exact content to find
>>>REPLACE
replacement content
<<<SEARCH
another exact content to find
>>>REPLACE
another replacement
:::

Rules:
1. The \`identifier\` MUST match a previously created artifact's identifier exactly.
2. SEARCH content must be an EXACT substring of the current artifact content (verbatim, including whitespace and indentation).
3. Include enough surrounding context in SEARCH to uniquely identify the location (usually 1-3 lines).
4. Multiple SEARCH/REPLACE blocks can be included and will be applied in order from top to bottom.
5. Each SEARCH block must match exactly one location in the artifact.
6. To delete content, use an empty REPLACE section (just \`>>>REPLACE\` followed immediately by the next \`<<<SEARCH\` or closing \`:::\`).
7. To insert new content, include a SEARCH block with adjacent existing lines, then REPLACE with those same lines plus the new content added.
8. Do NOT wrap SEARCH/REPLACE blocks in triple backticks. The content is placed directly inside the directive.
9. ALWAYS prefer incremental updates over full rewrites when the change is small. This is critical for efficiency.

### Incremental update example
<user_query>Change the counter to start at 10 instead of 0 and make the button red</user_query>

<assistant_response>
  I've updated the counter to start at 10 and changed the button color to red:

  :::artifact-update{identifier="react-counter"}
  <<<SEARCH
  const [count, setCount] = useState(0);
  >>>REPLACE
  const [count, setCount] = useState(10);
  <<<SEARCH
  className="bg-blue-500 text-white px-4 py-2 rounded"
  >>>REPLACE
  className="bg-red-500 text-white px-4 py-2 rounded"
  :::
</assistant_response>

## Example
:::artifact{identifier="react-counter" type="application/vnd.react" title="React Counter"}
\`\`\`\`
import { useState } from 'react';
import { Button } from '/components/ui/button';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex items-center gap-4 p-4">
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
    </div>
  );
}
\`\`\`\`
:::`;

/**
 * Generates the artifacts prompt for an artifact mode.
 * @param params.endpoint - The provider, which picks the shadcn/ui docs format
 * @param params.artifacts - The artifact mode
 * @returns The artifacts prompt, or null in CUSTOM mode (the agent supplies its own)
 */
export function generateArtifactsPrompt(params: {
  endpoint: EModelEndpoint | string;
  artifacts: ArtifactModes;
}): string | null {
  const { endpoint, artifacts } = params;

  if (artifacts === ArtifactModes.CUSTOM) {
    return null;
  }

  if (artifacts !== ArtifactModes.SHADCNUI) {
    return artifactsPrompt;
  }

  return `${artifactsPrompt}\n\n${generateShadcnPrompt({ components, useXML: endpoint === EModelEndpoint.anthropic })}`;
}
