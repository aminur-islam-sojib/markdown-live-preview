import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/parser/markdown-parser';

describe('parseMarkdown (Markdown Live Preview Parser)', () => {
  it('parses tables properly with data-line', () => {
    const md = `| Feature | Status |
| --- | --- |
| Math | Supported |
| Sync | Supported |`;
    const html = parseMarkdown(md);
    expect(html).toContain('<table data-line="1">');
    expect(html).toContain('Feature');
    expect(html).toContain('Supported');
  });

  it('parses lists with task checklists properly', () => {
    const md = `- [x] Task done\n- [ ] Task pending`;
    const html = parseMarkdown(md);
    expect(html).toContain('<ul data-line="1">');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked=""');
  });

  it('parses inline and block LaTeX math properly', () => {
    const md = `The formula $E = mc^2$ is cool.\n\n$$ a^2 + b^2 = c^2 $$`;
    const html = parseMarkdown(md);
    expect(html).toContain('katex');
    expect(html).toContain('katex-display');
    expect(html).toContain('data-line="3"');
  });

  it('parses code math (```math)', () => {
    const md = "```math\nx + y = z\n```";
    const html = parseMarkdown(md);
    expect(html).toContain('katex-display');
    expect(html).toContain('data-line="1"');
  });

  it('parses mermaid code blocks (```mermaid)', () => {
    const md = "```mermaid\ngraph TD;\nA-->B;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain('<pre class="mermaid" data-line="1">');
    expect(html).toContain('graph TD;');
  });

  it('parses default markdown without error', () => {
    const defaultMd = `# Welcome to Markview

A fast, distraction-free Markdown workspace with live preview, math, and diagrams.

> 💡 **Tip:** Press \`Ctrl + S\` to save your note, or \`Ctrl + O\` to open your notes drawer.

### What you can do here
- **Style text**: Use **bold**, *italic*, ~~strikethrough~~, or \`inline code\`
- **Interactive checklist**:
  - [x] Write on the left, watch live preview on the right
  - [ ] Toggle **Sync On** in the header to lock scrolling
  - [ ] Switch views anytime: **Split**, **Editor**, or **Preview**

### LaTeX Math
Write inline math like $E = mc^2$ or beautiful display equations:

$$ \\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi} $$

### Live Diagrams
Markview renders native Mermaid diagrams in real-time:

\`\`\`mermaid
graph LR
  A[Draft] --> B(Live Preview) --> C{Export}
  C -->|Save| D[Cloud / Local]
  C -->|Download| E[.md / PDF / HTML]
\`\`\`
`;
    const html = parseMarkdown(defaultMd);
    expect(html).toContain('Welcome to Markview');
    expect(html).toContain('data-line="1"');
    expect(html).toContain('katex');
    expect(html).toContain('class="mermaid"');
    expect(html).not.toContain('undefined');
  });

  it('gracefully handles empty content', () => {
    expect(parseMarkdown('')).toBe('');
  });

  it('parses without line numbers when requested', () => {
    const md = '# Header\nParagraph';
    const html = parseMarkdown(md, false);
    expect(html).toContain('<h1>Header</h1>');
    expect(html).not.toContain('data-line=');
  });
});
