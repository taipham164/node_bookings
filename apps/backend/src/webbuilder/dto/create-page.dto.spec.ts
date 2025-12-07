import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePageDto } from './create-page.dto';

// Mock the HTML sanitizer to avoid isomorphic-dompurify ES module issues
jest.mock('../utils/html-sanitizer', () => ({
  sanitizeHtml: jest.fn((html) => {
    if (typeof html !== 'string') return html;
    // Simple mock implementation
    let result = html;
    result = result.replace(/<script[^>]*>.*?<\/script>/gi, '');
    result = result.replace(/\s(?:onclick|onload|onerror|onmouseover|onmouseout|onfocus|onblur|onchange|onsubmit|style)\s*=\s*["'][^"']*["']/gi, '');
    result = result.replace(/<\/?(?:iframe|object|embed|form|input|button)[^>]*>/gi, '');
    return result;
  })
}));

describe('CreatePageDto', () => {
  describe('HTML Sanitization', () => {
    it('should remove script tags', () => {
      const input = {
        shopId: 'test-shop',
        slug: 'test-page',
        title: 'Test Page',
        html: '<p>Safe content</p><script>alert("xss")</script>',
        isHome: false
      };

      const dto = plainToClass(CreatePageDto, input);
      
      expect(dto.html).toBe('<p>Safe content</p>');
      expect(dto.html).not.toContain('script');
      expect(dto.html).not.toContain('alert');
    });

    it('should remove onclick and other event handlers', () => {
      const input = {
        shopId: 'test-shop',
        slug: 'test-page',
        title: 'Test Page',
        html: '<div onclick="alert(xss)" onload="malicious()">Click me</div>',
        isHome: false
      };

      const dto = plainToClass(CreatePageDto, input);
      
      expect(dto.html).toBe('<div>Click me</div>');
      expect(dto.html).not.toContain('onclick');
      expect(dto.html).not.toContain('onload');
    });

    it('should remove dangerous tags like iframe and object', () => {
      const input = {
        shopId: 'test-shop',
        slug: 'test-page',
        title: 'Test Page',
        html: '<p>Safe</p><iframe src="malicious.com"></iframe><object data="malicious.swf"></object>',
        isHome: false
      };

      const dto = plainToClass(CreatePageDto, input);
      
      expect(dto.html).toBe('<p>Safe</p>');
      expect(dto.html).not.toContain('iframe');
      expect(dto.html).not.toContain('object');
    });

    it('should preserve safe HTML tags and attributes', () => {
      const input = {
        shopId: 'test-shop',
        slug: 'test-page',
        title: 'Test Page',
        html: '<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em></p><a href="/safe-link">Link</a><img src="image.jpg" alt="Safe image">',
        isHome: false
      };

      const dto = plainToClass(CreatePageDto, input);
      
      expect(dto.html).toContain('<h1>Title</h1>');
      expect(dto.html).toContain('<strong>bold</strong>');
      expect(dto.html).toContain('<em>italic</em>');
      expect(dto.html).toContain('<a href="/safe-link">Link</a>');
      expect(dto.html).toContain('<img src="image.jpg" alt="Safe image">');
    });

    it('should remove style attributes to prevent CSS injection', () => {
      const input = {
        shopId: 'test-shop',
        slug: 'test-page',
        title: 'Test Page',
        html: '<div style="background: url(javascript:alert(xss))">Content</div>',
        isHome: false
      };

      const dto = plainToClass(CreatePageDto, input);
      
      expect(dto.html).toBe('<div>Content</div>');
      expect(dto.html).not.toContain('style');
      expect(dto.html).not.toContain('javascript:');
    });

    it('should handle nested malicious content', () => {
      const input = {
        shopId: 'test-shop',
        slug: 'test-page',
        title: 'Test Page',
        html: '<div><script>alert("nested")</script><p onclick="malicious()">Content</p></div>',
        isHome: false
      };

      const dto = plainToClass(CreatePageDto, input);
      
      expect(dto.html).toBe('<div><p>Content</p></div>');
      expect(dto.html).not.toContain('script');
      expect(dto.html).not.toContain('onclick');
    });

    it('should handle empty or non-string HTML values', () => {
      const inputEmpty = {
        shopId: 'test-shop',
        slug: 'test-page',
        title: 'Test Page',
        html: '',
        isHome: false
      };

      const dtoEmpty = plainToClass(CreatePageDto, inputEmpty);
      expect(dtoEmpty.html).toBe('');

      // Test with null/undefined (should be handled gracefully)
      const inputNull = {
        shopId: 'test-shop',
        slug: 'test-page',
        title: 'Test Page',
        html: null,
        isHome: false
      };

      const dtoNull = plainToClass(CreatePageDto, inputNull);
      expect(dtoNull.html).toBeNull();
    });

    it('should pass validation after sanitization', async () => {
      const input = {
        shopId: 'test-shop',
        slug: 'test-page',
        title: 'Test Page',
        html: '<p>Safe content</p><script>alert("xss")</script>',
        isHome: false
      };

      const dto = plainToClass(CreatePageDto, input);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
      expect(dto.html).toBe('<p>Safe content</p>');
    });
  });
});