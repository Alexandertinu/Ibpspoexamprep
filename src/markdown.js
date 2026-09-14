function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function renderInline(value) {
  return escapeHTML(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function cells(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|')) value = value.slice(0, -1);
  return value.split('|').map((cell) => cell.trim());
}

export function renderMarkdown(value) {
  const lines = String(value || '').replace(/\r/g, '').split('\n');
  const out = [];

  for (let i = 0; i < lines.length;) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      const language = line.trim().slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      if (i < lines.length) i += 1;
      out.push(`<pre><code${language ? ` data-language="${escapeHTML(language)}"` : ''}>${escapeHTML(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const headers = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push(`<div class="chat-table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((_, index) => `<td>${renderInline(row[index] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }

    if (/^#{1,4}\s+/.test(line)) {
      const level = Math.min(4, line.match(/^#+/)[0].length);
      out.push(`<h${level}>${renderInline(line.replace(/^#{1,4}\s+/, ''))}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(`<li>${renderInline(lines[i++].replace(/^\s*[-*]\s+/, ''))}</li>`);
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(`<li>${renderInline(lines[i++].replace(/^\s*\d+[.)]\s+/, ''))}</li>`);
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const paragraph = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim()
      && !/^(```|#{1,4}\s+|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])
      && !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1]))) {
      paragraph.push(lines[i++].trim());
    }
    out.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`);
  }

  return out.join('');
}
