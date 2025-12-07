import { 
  sanitizeHtml, 
  DEFAULT_SANITIZER_CONFIG,
  sanitizeStyleAttribute,
  sanitizeCssValue
} from './html-sanitizer';

// Mock isomorphic-dompurify to avoid Jest ES module issues
const mockHooks: Array<{ eventName: string, callback: Function }> = [];

jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html, config) => {
      // Simple mock implementation for testing
      let result = html;
      
      // Remove script tags
      result = result.replace(/<script[^>]*>.*?<\/script>/gi, '');
      
      // Remove dangerous attributes (except style which we handle specially)
      config.FORBID_ATTR.forEach((attr: string) => {
        if (attr !== 'style') {  // Don't remove style here, let hooks handle it
          const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
          result = result.replace(regex, '');
        }
      });
      
      // Remove forbidden tags
      config.FORBID_TAGS.forEach((tag: string) => {
        const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
        result = result.replace(regex, '');
      });
      
      // Simulate hook execution for style attribute
      if (mockHooks.length > 0 && result.includes('style=')) {
        // Extract and process style attributes
        const styleMatch = result.match(/style\\s*=\\s*["']([^"']*)["']/);
        if (styleMatch) {
          const originalStyle = styleMatch[1];
          let updatedResult = result;
          
          // Create a mock DOM element to test style hooks
          const mockElement = {
            hasAttribute: jest.fn((attr) => attr === 'style'),
            getAttribute: jest.fn((attr) => attr === 'style' ? originalStyle : null),
            setAttribute: jest.fn((attr, value) => {
              if (attr === 'style') {
                updatedResult = result.replace(/style\\s*=\\s*["'][^"']*["']/, `style="${value}"`);
              }
            }),
            removeAttribute: jest.fn((attr) => {
              if (attr === 'style') {
                updatedResult = result.replace(/\\s*style\\s*=\\s*["'][^"']*["']/, '');
              }
            })
          };
          
          // Execute hooks
          mockHooks.forEach(hook => {
            if (hook.eventName === 'afterSanitizeAttributes') {
              hook.callback(mockElement);
            }
          });
          
          result = updatedResult;
        }
      }
      
      return result;
    }),
    addHook: jest.fn((eventName, callback) => {
      mockHooks.push({ eventName, callback });
    }),
    removeAllHooks: jest.fn(() => {
      mockHooks.length = 0;
    }),
  },
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

    it('should throw TypeError for non-string inputs', () => {
      expect(() => sanitizeHtml(null as any)).toThrow(TypeError);
      expect(() => sanitizeHtml(null as any)).toThrow('Expected string input for HTML sanitization, received object');
      
      expect(() => sanitizeHtml(undefined as any)).toThrow(TypeError);
      expect(() => sanitizeHtml(undefined as any)).toThrow('Expected string input for HTML sanitization, received undefined');
      
      expect(() => sanitizeHtml(123 as any)).toThrow(TypeError);
      expect(() => sanitizeHtml(123 as any)).toThrow('Expected string input for HTML sanitization, received number');
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
      expect(DEFAULT_SANITIZER_CONFIG.ALLOWED_ATTR).toContain('style');
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
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_ATTR).toContain('onerror');
      expect(DEFAULT_SANITIZER_CONFIG.FORBID_ATTR).not.toContain('style'); // Style is now allowed with sanitization
    });
  });

  describe('CSS Sanitization', () => {
    describe('sanitizeStyleAttribute', () => {
      it('should allow safe CSS properties', () => {
        const input = 'color: red; font-size: 16px; margin: 10px; padding: 5px;';
        const result = sanitizeStyleAttribute(input);
        expect(result).toContain('color: red');
        expect(result).toContain('font-size: 16px');
        expect(result).toContain('margin: 10px');
        expect(result).toContain('padding: 5px');
      });

      it('should filter out unsafe CSS properties', () => {
        const input = 'color: red; behavior: url(script.htc); position: absolute;';
        const result = sanitizeStyleAttribute(input);
        expect(result).toContain('color: red');
        expect(result).toContain('position: absolute');
        expect(result).not.toContain('behavior');
      });

      it('should remove dangerous CSS values', () => {
        const input = 'background: url(javascript:alert(1)); color: red;';
        const result = sanitizeStyleAttribute(input);
        expect(result).toContain('color: red');
        expect(result).not.toContain('javascript:');
      });

      it('should allow safe gradients', () => {
        const input = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
        const result = sanitizeStyleAttribute(input);
        expect(result).toContain('linear-gradient');
      });

      it('should handle GrapesJS common styles', () => {
        const input = 'padding: 40px 20px; min-height: 200px; text-align: center; border-radius: 12px;';
        const result = sanitizeStyleAttribute(input);
        expect(result).toContain('padding: 40px 20px');
        expect(result).toContain('min-height: 200px');
        expect(result).toContain('text-align: center');
        expect(result).toContain('border-radius: 12px');
      });
    });

    describe('HTML with inline styles', () => {
      it('should preserve safe inline styles in HTML', () => {
        const input = '<div style="color: red; padding: 10px;">Content</div>';
        const result = sanitizeHtml(input);
        expect(result).toContain('style="color: red; padding: 10px"');
        expect(result).toContain('Content');
      });

      it('should remove dangerous inline styles', () => {
        const input = '<div style="color: red; behavior: url(evil.htc);">Content</div>';
        const result = sanitizeHtml(input);
        expect(result).toContain('style="color: red"');
        expect(result).not.toContain('behavior');
      });

      it('should handle GrapesJS section with complex styles', () => {
        const input = `
          <section style="padding: 60px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h1 style="font-size: 3em; margin-bottom: 20px;">Welcome</h1>
          </section>
        `;
        const result = sanitizeHtml(input);
        expect(result).toContain('padding: 60px 20px');
        expect(result).toContain('text-align: center');
        expect(result).toContain('linear-gradient');
        expect(result).toContain('font-size: 3em');
      });

      it('should handle booking widget styles', () => {
        const input = `
          <div data-booking-widget="true" style="min-height: 400px; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; border-radius: 12px;">
            <h2 style="margin-bottom: 20px; font-size: 2em;">Book Your Appointment</h2>
          </div>
        `;
        const result = sanitizeHtml(input);
        expect(result).toContain('data-booking-widget="true"');
        expect(result).toContain('min-height: 400px');
        expect(result).toContain('border-radius: 12px');
        expect(result).toContain('margin-bottom: 20px');
      });

      it('should remove styles with javascript: URLs', () => {
        const input = '<div style="background-image: url(javascript:alert(1)); color: red;">Content</div>';
        const result = sanitizeHtml(input);
        expect(result).toContain('color: red');
        expect(result).not.toContain('javascript:');
      });

      it('should allow safe data: URLs for images', () => {
        const input = '<div style="background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==);">Content</div>';
        const result = sanitizeHtml(input);
        expect(result).toContain('data:image/png');
      });
    });

    describe('sanitizeCssValue', () => {
      it('should allow safe values', () => {
        expect(sanitizeCssValue('color', 'red')).toBe('red');
        expect(sanitizeCssValue('margin', '10px')).toBe('10px');
        expect(sanitizeCssValue('background', 'linear-gradient(90deg, red, blue)')).toBe('linear-gradient(90deg, red, blue)');
      });

      it('should block javascript: URLs', () => {
        expect(sanitizeCssValue('background-image', 'url(javascript:alert(1))')).toBeNull();
      });

      it('should block expression() functions', () => {
        expect(sanitizeCssValue('width', 'expression(alert(1))')).toBeNull();
      });

      it('should allow safe HTTP URLs in backgrounds', () => {
        expect(sanitizeCssValue('background-image', 'url(https://example.com/image.jpg)')).toBe('url(https://example.com/image.jpg)');
      });
    });
  });
});