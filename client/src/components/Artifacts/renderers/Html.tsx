import { memo, useMemo } from 'react';

const TAILWIND_CDN = 'https://cdn.tailwindcss.com/3.4.17';

function hasReactImport(content: string): boolean {
  return /\bimport\b.*\bfrom\b\s+['"]react['"]/.test(content) || /\bReact\b/.test(content);
}

function buildSrcdoc(content: string): string {
  if (content.trim().toLowerCase().startsWith('<!doctype') || content.trim().startsWith('<html')) {
    if (!content.includes('tailwindcss.com') && !content.includes('tailwind')) {
      return content.replace(
        /<head([^>]*)>/i,
        `<head$1><script src="${TAILWIND_CDN}"><\/script>`,
      );
    }
    return content;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
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
      sandbox="allow-scripts"
      className="h-full w-full border-0"
      title="HTML Preview"
    />
  );
});

export function isDirectHtml(type: string, content: string): boolean {
  return type === 'text/html' && !hasReactImport(content);
}
