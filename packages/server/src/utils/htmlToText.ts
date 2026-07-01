// Extract searchable plain text from an archived page's HTML (SingleFile output).
//
// SingleFile inlines fonts/images/CSS as huge data: URIs inside <style>/<script>
// and element attributes. We strip those blocks first (which removes the bulk of
// the payload), then drop remaining tags, decode a few common entities, collapse
// whitespace, and cap the length to keep the FTS index and Worker CPU bounded.
export function htmlToText(html: string, maxLen = 200_000): string {
  if (!html)
    return ''

  let text = html
    // Blocks whose text content is not page content (also removes inlined data: URIs in CSS/JS).
    .replace(/<(script|style|noscript|template|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    // HTML comments.
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Any remaining tags (base64 data: URIs live in attributes and contain no '>').
    .replace(/<[^>]+>/g, ' ')

  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, '\'')
    .replace(/&#0*160;/g, ' ')

  text = text.replace(/\s+/g, ' ').trim()

  if (text.length > maxLen)
    text = text.slice(0, maxLen)

  return text
}

// Build a safe FTS5 MATCH argument: wrap the user keyword as a quoted string so
// FTS5 operators/punctuation in the input can't break the query or inject syntax.
// With the trigram tokenizer a quoted string performs a substring match.
export function ftsMatchQuery(keyword: string): string {
  return `"${keyword.trim().replace(/"/g, '""')}"`
}

// trigram needs at least 3 characters to match anything.
export const FTS_MIN_KEYWORD_LEN = 3
