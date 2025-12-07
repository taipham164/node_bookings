import { sanitizeHtml, DEFAULT_SANITIZER_CONFIG } from './html-sanitizer';

// Mock isomorphic-dompurify to avoid Jest ES module issues
jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html, config) => {
      // Simple mock implementation for testing
      let result = html;
      
      // Remove script tags
      result = result.replace(/<script[^>]*>.*?<\/script>/gi, '');
      
      // Remove dangerous attributes
      config.FORBID_ATTR.forEach((attr: string) => {
        const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        result = result.replace(regex, '');
      });
      
      // Remove forbidden tags
      config.FORBID_TAGS.forEach((tag: string) => {
        const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
        result = result.replace(regex, '');
      });
      
      return result;
    })
  }
}));

describe('HTML Sanitizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Safe content</p><script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      
      expect(result).toBe('<p>Safe content</p>');
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });

    it('should remove onclick and other event handlers', () => {
      const input = '<div onclick="alert(xss)" onload="malicious()">Click me</div>';
      const result = sanitizeHtml(input);
      
      expect(result).toBe('<div>Click me</div>');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onload');
    });

    it('should remove dangerous tags like iframe and object', () => {
      const input = '<p>Safe</p><iframe src="malicious.com"></iframe><object data="malicious.swf"></object>';
      const result = sanitizeHtml(input);
      
      expect(result).toBe('<p>Safe</p>');
      expect(result).not.toContain('iframe');
      expect(result).not.toContain('object');
    });

    it('should handle non-string inputs gracefully', () => {
      expect(sanitizeHtml(null as any)).toBeNull();
      expect(sanitizeHtml(undefined as any)).toBeUndefined();
      expect(sanitizeHtml(123 as any)).toBe(123);
    });

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should use default configuration when none provided', () => {
      const input = '<script>alert("test")</script><p>Safe</p>';
      const result = sanitizeHtml(input);
      
      expect(result).toBe('<p>Safe</p>');
      
      // Verify DOMPurify.sanitize was called with default config
      const DOMPurify = require('isomorphic-dompurify').default;
      expect(DOMPurify.sanitize).toHaveBeenCalledWith(input, DEFAULT_SANITIZER_CONFIG);
    });

    it('should allow custom configuration', () => {
      const customConfig = {
        ALLOWED_TAGS: ['p'],
        ALLOWED_ATTR: [],
        FORBID_TAGS: ['script', 'div'],
        FORBID_ATTR: ['onclick']
      };
      
      const input = '<div><script>alert("test")</script><p>Safe</p></div>';
      const result = sanitizeHtml(input, customConfig);
      
      // Verify DOMPurify.sanitize was called with custom config
      const DOMPurify = require('isomorphic-dompurify').default;
      expect(DOMPurify.sanitize).toHaveBeenCalledWith(input, customConfig);
    });
  });

  describe('DEFAULT_SANITIZER_CONFIG', () => {
    it('should have expected allowed tags', () => {
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_TAGS).toContain('p');
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_TAGS).toContain('strong');
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_TAGS).toContain('h1');
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_TAGS).toContain('a');
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_TAGS).toContain('img');
    });

    it('should have expected allowed attributes', () => {
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_ATTR).toContain('href');
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_ATTR).toContain('src');
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_ATTR).toContain('alt');
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_ATTR).toContain('class');
    });

    it('should forbid dangerous tags', () => {
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_TAGS).toContain('script');
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_TAGS).toContain('iframe');
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_TAGS).toContain('object');
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_TAGS).toContain('form');
    });

    it('should forbid dangerous attributes', () => {
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_ATTR).toContain('onclick');
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_ATTR).toContain('onload');
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_ATTR).toContain('style');
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_ATTR).toContain('onerror');
    });
  });
});