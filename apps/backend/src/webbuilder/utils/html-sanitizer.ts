// eslint-disable-next-line @typescript-eslint/no-require-imports
const DOMPurify: any = require('isomorphic-dompurify');

export interface SanitizerConfig {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTR: string[];
  FORBID_TAGS: string[];
  FORBID_ATTR: string[];
}

export const DEFAULT_SANITIZER_CONFIG: SanitizerConfig = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'blockquote'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style']
};

export function sanitizeHtml(html: string, config: SanitizerConfig = DEFAULT_SANITIZER_CONFIG): string {
  if (typeof html !== 'string') {
    return html;
  }
  
  return DOMPurify.sanitize(html, config);
}

export function createHtmlSanitizer(config: SanitizerConfig = DEFAULT_SANITIZER_CONFIG) {
  return (html: string) => sanitizeHtml(html, config);
}