import DOMPurify from 'isomorphic-dompurify';

export interface SanitizerConfig {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTR: string[];
  FORBID_TAGS: string[];
  FORBID_ATTR: string[];
  ALLOW_SAFE_STYLES?: boolean;
}

// Safe CSS properties that are commonly used in page builders and don't pose security risks
export const SAFE_CSS_PROPERTIES = [
  // Layout & Box Model
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'float', 'clear', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-style', 'border-color', 'border-radius',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'outline', 'outline-width', 'outline-style', 'outline-color',
  
  // Flexbox & Grid
  'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'justify-content', 'align-items', 'align-content',
  'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'align-self',
  'grid', 'grid-template', 'grid-area', 'grid-column', 'grid-row',
  
  // Typography
  'color', 'font', 'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight',
  'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-decoration',
  'text-transform', 'text-indent', 'text-shadow', 'white-space', 'word-wrap', 'word-break',
  
  // Background & Visual
  'background', 'background-color', 'background-image', 'background-position',
  'background-repeat', 'background-size', 'background-attachment', 'background-clip',
  'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
  
  // Transform & Animation (safe subset)
  'transform', 'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay',
  
  // Lists
  'list-style', 'list-style-type', 'list-style-position', 'list-style-image',
  
  // Tables
  'border-collapse', 'border-spacing', 'caption-side', 'empty-cells', 'table-layout',
  'vertical-align'
];

// Dangerous CSS patterns that should be blocked
export const DANGEROUS_CSS_PATTERNS = [
  /javascript:/i,
  /expression\s*\(/i,
  /url\s*\(\s*["']?javascript:/i,
  /url\s*\(\s*["']?data:/i,
  /url\s*\(\s*["']?vbscript:/i,
  /behavior\s*:/i,
  /-moz-binding\s*:/i,
  /binding\s*:/i,
  /import\s/i,
  /@import/i
];

export const DEFAULT_SANITIZER_CONFIG: SanitizerConfig = {
  ALLOWED_TAGS: [
    // Text elements
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Links & Media
    'a', 'img',
    // Structure
    'div', 'span', 'section', 'article', 'header', 'footer', 'main', 'aside',
    // Formatting
    'blockquote', 'pre', 'code',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'data-booking-widget', 'style'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link', 'base'],
  FORBID_ATTR: [
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress', 'onmousedown', 'onmouseup'
  ],
  ALLOW_SAFE_STYLES: true
};

/**
 * Sanitizes CSS property value by checking against dangerous patterns
 */
export function sanitizeCssValue(property: string, value: string): string | null {
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_CSS_PATTERNS) {
    if (pattern.test(value)) {
      console.warn(`Blocked dangerous CSS in ${property}: ${value}`);
      return null;
    }
  }
  
  // Additional specific checks
  if (property === 'background-image' || property === 'background') {
    // Allow gradients but be more restrictive with URLs
    if (value.includes('url(') && !value.match(/url\s*\(\s*["']?(https?:\/\/|data:image\/)/)) {
      console.warn(`Blocked potentially unsafe background URL: ${value}`);
      return null;
    }
  }
  
  return value;
}

/**
 * Sanitizes inline style attribute by parsing CSS and filtering safe properties
 */
export function sanitizeStyleAttribute(styleValue: string): string {
  if (!styleValue || typeof styleValue !== 'string') {
    return '';
  }
  
  const safePairs: string[] = [];
  
  // Parse CSS declarations
  const declarations = styleValue.split(';').map(decl => decl.trim()).filter(Boolean);
  
  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) continue;
    
    const property = declaration.slice(0, colonIndex).trim().toLowerCase();
    const value = declaration.slice(colonIndex + 1).trim();
    
    // Check if property is in safe list
    if (SAFE_CSS_PROPERTIES.includes(property)) {
      const sanitizedValue = sanitizeCssValue(property, value);
      if (sanitizedValue !== null) {
        safePairs.push(`${property}: ${sanitizedValue}`);
      }
    }
  }
  
  return safePairs.join('; ');
}

export function sanitizeHtml(html: string, config: SanitizerConfig = DEFAULT_SANITIZER_CONFIG): string {
  if (typeof html !== 'string') {
    throw new TypeError(`Expected string input for HTML sanitization, received ${typeof html}`);
  }
  
  // Configure DOMPurify with custom hooks for style attribute handling
  const purifyConfig = { ...config };
  
  if (config.ALLOW_SAFE_STYLES && config.ALLOWED_ATTR.includes('style')) {
    // Add hook to sanitize style attributes
    DOMPurify.addHook('afterSanitizeAttributes', function (node: Element) {
      if (node.hasAttribute('style')) {
        const styleValue = node.getAttribute('style');
        if (styleValue) {
          const sanitizedStyle = sanitizeStyleAttribute(styleValue);
          if (sanitizedStyle) {
            node.setAttribute('style', sanitizedStyle);
          } else {
            node.removeAttribute('style');
          }
        }
      }
    });
  }
  
  try {
    const result = DOMPurify.sanitize(html, purifyConfig);
    return result;
  } finally {
    // Clean up hooks to prevent side effects
    DOMPurify.removeAllHooks();
  }
}

export function createHtmlSanitizer(config: SanitizerConfig = DEFAULT_SANITIZER_CONFIG) {
  return (html: string) => sanitizeHtml(html, config);
}