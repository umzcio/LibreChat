import { memo, useMemo } from 'react';

const TAILWIND_CDN = 'https://cdn.tailwindcss.com/3.4.17';

function hasReactImport(content: string): boolean {
  return /\bimport\b.*\bfrom\b\s+['"]react['"]/.test(content) || /\bReact\b/.test(content);
}

function buildSrcdoc(content: string): string {
  const baseTag = '<base target="_blank">';
  if (content.trim().toLowerCase().startsWith('<!doctype') || content.trim().startsWith('<html')) {
    let result = content;
    if (!result.includes('tailwindcss.com') && !result.includes('tailwind')) {
      result = result.replace(
        /<head([^>]*)>/i,
        `<head$1><script src="${TAILWIND_CDN}"><\/script>`,
      );
    }
    if (!result.includes('<base')) {
      result = result.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    }
    return result;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${baseTag}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="${TAILWIND_CDN}"><\/script>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    ::-webkit-scrollbar { height: .1em; width: .5rem; }
    ::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,.1); border-radius: 9999px; }
    ::-webkit-scrollbar-track { background-color: transparent; border-radius: 9999px; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

export const HtmlRenderer = memo(function HtmlRenderer({
  content,
}: {
  content: string;
}) {
  const srcdoc = useMemo(() => buildSrcdoc(content), [content]);

  return (
    <iframe
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      className="h-full w-full border-0"
      title="HTML Preview"
    />
  );
});

export function isDirectHtml(type: string, content: string): boolean {
  return type === 'text/html' && !hasReactImport(content);
}
