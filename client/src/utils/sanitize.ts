import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['a', 'strong', 'em', 'br', 'code', 'p', 'ul', 'ol', 'li', 'span'];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
