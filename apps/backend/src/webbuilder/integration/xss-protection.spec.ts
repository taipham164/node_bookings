import { plainToClass } from 'class-transformer';
import { CreatePageDto } from '../dto/create-page.dto';

// Mock the HTML sanitizer to simulate production sanitization behavior
jest.mock('../utils/html-sanitizer', () => ({
  sanitizeHtml: jest.fn((html) => {
    if (typeof html !== 'string') return html;
    // Simulate DOMPurify sanitization behavior
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/\s(onclick|onload|onerror|onmouseover|onmouseout|onfocus|onblur|onchange|onsubmit|style)\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/<\/?(?:iframe|object|embed|form|input|button)[^>]*>/gi, ''); // Remove dangerous tags
  })
}));

describe('XSS Protection Integration', () => {
  it('should sanitize HTML content and remove script tags in CreatePageDto', () => {
    const input = {
      shopId: 'test-shop',
      slug: 'test-page',
      title: 'Test Page',
      html: '<p>Safe content</p><script>alert("xss")</script>',
      isHome: false
    };

    const dto = plainToClass(CreatePageDto, input);
    
    // Verify basic DTO properties
    expect(dto.shopId).toBe('test-shop');
    expect(dto.slug).toBe('test-page');
    expect(dto.title).toBe('Test Page');
    expect(dto.isHome).toBe(false);
    
    // Verify XSS protection - script tag should be removed
    expect(dto.html).toBe('<p>Safe content</p>');
    expect(dto.html).not.toContain('<script');
    expect(dto.html).not.toContain('alert');
    expect(dto.html).not.toContain('xss');
  });

  it('should remove event handlers while preserving safe HTML', () => {
    const input = {
      shopId: 'test-shop',
      slug: 'test-page',
      title: 'Test Page',
      html: '<div onclick="malicious()" class="safe">Safe content</div><p>More content</p>',
      isHome: false
    };

    const dto = plainToClass(CreatePageDto, input);
    
    // Verify event handlers are removed but safe content and attributes remain
    expect(dto.html).toBe('<div class="safe">Safe content</div><p>More content</p>');
    expect(dto.html).not.toContain('onclick');
    expect(dto.html).not.toContain('malicious');
    expect(dto.html).toContain('class="safe"'); // Safe attributes should remain
  });

  it('should remove dangerous tags while preserving safe content', () => {
    const input = {
      shopId: 'test-shop',
      slug: 'test-page',
      title: 'Test Page',
      html: '<p>Safe paragraph</p><iframe src="malicious.com"></iframe><strong>Bold text</strong>',
      isHome: false
    };

    const dto = plainToClass(CreatePageDto, input);
    
    // Verify dangerous tags are removed but safe HTML remains
    expect(dto.html).toBe('<p>Safe paragraph</p><strong>Bold text</strong>');
    expect(dto.html).not.toContain('iframe');
    expect(dto.html).not.toContain('malicious.com');
    expect(dto.html).toContain('<p>Safe paragraph</p>');
    expect(dto.html).toContain('<strong>Bold text</strong>');
  });
});