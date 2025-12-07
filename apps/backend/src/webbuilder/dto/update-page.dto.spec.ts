import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdatePageDto } from './update-page.dto';

// Mock the HTML sanitizer to avoid isomorphic-dompurify ES module issues
jest.mock('../utils/html-sanitizer', () => ({
  sanitizeHtml: jest.fn((html) => {
    if (typeof html !== 'string') {
      throw new TypeError(`Expected string input for HTML sanitization, received ${typeof html}`);
    }
    // Simple mock implementation
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/\s(onclick|onload|onerror|onmouseover|onmouseout|onfocus|onblur|onchange|onsubmit|style)\s*=\s*["'][^"']*["']/gi, '')
      .replace(/<\/?(?:iframe|object|embed|form|input|button)[^>]*>/gi, '');
  })
}));

describe('UpdatePageDto', () => {
  describe('HTML Sanitization', () => {
    it('should remove script tags from optional html field', () => {
      const input = {
        html: '<p>Safe content</p><script>alert("xss")</script>',
        title: 'Updated Title'
      };

      const dto = plainToClass(UpdatePageDto, input);
      
      expect(dto.html).toBe('<p>Safe content</p>');
      expect(dto.html).not.toContain('script');
    });

    it('should handle undefined html field without transformation', () => {
      const input = {
        title: 'Updated Title'
        // html is undefined
      };

      const dto = plainToClass(UpdatePageDto, input);
      
      expect(dto.html).toBeUndefined();
    });

    it('should remove event handlers from html', () => {
      const input = {
        html: '<div onclick="malicious()" onmouseover="alert()">Content</div>'
      };

      const dto = plainToClass(UpdatePageDto, input);
      
      expect(dto.html).toBe('<div>Content</div>');
      expect(dto.html).not.toContain('onclick');
      expect(dto.html).not.toContain('onmouseover');
    });

    it('should preserve safe HTML elements and attributes', () => {
      const input = {
        html: '<h2>Updated Title</h2><p class="content">Safe <a href="/link">link</a></p>',
        title: 'New Title'
      };

      const dto = plainToClass(UpdatePageDto, input);
      
      expect(dto.html).toContain('<h2>Updated Title</h2>');
      expect(dto.html).toContain('class="content"');
      expect(dto.html).toContain('<a href="/link">link</a>');
    });

    it('should pass validation after sanitization', async () => {
      const input = {
        html: '<p>Updated content</p><script>alert("test")</script>',
        title: 'Updated Title',
        isHome: true
      };

      const dto = plainToClass(UpdatePageDto, input);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
      expect(dto.html).toBe('<p>Updated content</p>');
      expect(dto.title).toBe('Updated Title');
      expect(dto.isHome).toBe(true);
    });

    it('should throw TypeError for non-string html input during transformation', () => {
      const input = {
        html: ['invalid', 'array'], // Invalid non-string input
        title: 'Updated Title'
      };

      expect(() => plainToClass(UpdatePageDto, input)).toThrow(TypeError);
      expect(() => plainToClass(UpdatePageDto, input)).toThrow('HTML field must be a string, received object');
    });

    it('should handle undefined html values without error', async () => {
      const input = {
        title: 'Updated Title',
        // html is undefined
      };

      const dto = plainToClass(UpdatePageDto, input);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
      expect(dto.html).toBeUndefined();
      expect(dto.title).toBe('Updated Title');
    });
  });
});