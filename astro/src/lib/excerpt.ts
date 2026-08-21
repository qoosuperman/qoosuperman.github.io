/**
 * Build a plain-text preview from raw markdown.
 *
 * Only the home page uses this — everywhere else lists titles alone, so the
 * stripping rules stay simple on purpose: drop the syntax, keep the words,
 * in the order they appear (headings included, like the old Hexo theme did).
 */
export function excerpt(body: string | undefined, length = 150): string {
  if (!body) return '';

  const text = body
    .replace(/```[\s\S]*?```/g, '') // fenced code blocks
    .replace(/^\s{4,}.*$/gm, '') // indented code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> their text
    .replace(/<[^>]+>/g, '') // raw HTML tags
    .replace(/^\s*(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // heading / quote / list markers
    .replace(/^\s*([-*_]\s*){3,}$/gm, '') // horizontal rules
    .replace(/[*_~`]/g, '') // leftover emphasis and inline code marks
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > length ? `${text.slice(0, length)}……` : text;
}
