import { describe, expect, it } from 'vitest';
import { accent } from './accent';

describe('accent', () => {
  it('turns *word* into an em and escapes everything else', () => {
    expect(accent('Members-only poker, *run* like RIVR.')).toBe('Members-only poker, <em>run</em> like RIVR.');
    expect(accent('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
    expect(accent('No accent')).toBe('No accent');
  });
});
