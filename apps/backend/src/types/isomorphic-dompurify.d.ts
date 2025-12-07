// Type definitions for isomorphic-dompurify
import { Config } from 'dompurify';

declare module 'isomorphic-dompurify' {
  interface DOMPurifyI {
    sanitize(dirty: string | Node, cfg?: Config): string;
    sanitize(dirty: string | Node, cfg: Config & { RETURN_DOM_FRAGMENT?: false; RETURN_DOM?: false }): string;
    sanitize(dirty: string | Node, cfg: Config & { RETURN_DOM_FRAGMENT: true }): DocumentFragment;
    sanitize(dirty: string | Node, cfg: Config & { RETURN_DOM: true }): HTMLBodyElement | HTMLElement;
  }
  
  const DOMPurify: DOMPurifyI;
  export default DOMPurify;
}