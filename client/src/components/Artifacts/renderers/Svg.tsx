import { memo, useMemo } from 'react';

export const SvgRenderer = memo(function SvgRenderer({
  content,
}: {
  content: string;
}) {
  const src = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`,
    [content],
  );

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-surface-primary p-4">
      <img src={src} alt="SVG Preview" className="max-h-full max-w-full object-contain" />
    </div>
  );
});

export function isDirectSvg(type: string): boolean {
  return type === 'image/svg+xml';
}
