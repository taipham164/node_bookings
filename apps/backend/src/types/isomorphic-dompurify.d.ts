// Type definitions for isomorphic-dompurify
import { SanitizeConfig } from 'dompurify';

declare module 'isomorphic-dompurify' {
  interface DOMPurifyI {
    sanitize(dirty: string | Node, cfg?: SanitizeConfig): string;
    sanitize(dirty: string | Node, cfg: SanitizeConfig & { RETURN_DOM_FRAGMENT?: false; RETURN_DOM?: false }): string;
    sanitize(dirty: string | Node, cfg: SanitizeConfig & { RETURN_DOM_FRAGMENT: true }): DocumentFragment;
    sanitize(dirty: string | Node, cfg: SanitizeConfig & { RETURN_DOM: true }): HTMLBodyElement | HTMLElement;
  }
  
  const DOMPurify: DOMPurifyI;
  export default DOMPurify;
}