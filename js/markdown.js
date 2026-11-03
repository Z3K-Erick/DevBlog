/**
 * DevBlog — Renderizador Markdown mínimo + resaltado de sintaxis
 * ---------------------------------------------------------------
 * Soporta: ## / ### encabezados, párrafos, **negrita**, *cursiva*,
 * `código`, [enlaces](url), ![imágenes](url), listas (- / 1.),
 * > citas/tips y bloques ```lenguaje nombre-archivo```.
 *
 * Todo el texto se escapa antes de convertirse a HTML, así que el
 * contenido de los posts nunca puede inyectar etiquetas o scripts.
 */
(function () {
  'use strict';

  const { escapeHtml: esc, slugify } = window.DevBlog.Utils;

  /* ---------------------------------------------------------------
   * URLs seguras
   * ------------------------------------------------------------- */
  const RELATIVE_URL = /^[\w\-./#?=&%~]+$/;

  function safeLink(url) {
    const u = String(url).trim();
    return /^(https?:|mailto:)/i.test(u) || RELATIVE_URL.test(u) ? u : '#';
  }

  function safeImage(url) {
    const u = String(url).trim();
    return /^(https?:|data:image\/)/i.test(u) || RELATIVE_URL.test(u) ? u : '';
  }

  /* ---------------------------------------------------------------
   * Resaltado de sintaxis
   * ------------------------------------------------------------- */
  const KEYWORDS = {
    js: 'const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw typeof instanceof null undefined true false this of in',
    py: 'def return if elif else for while in not and or is import from as class try except finally raise with lambda None True False pass yield async await self',
  };

  const LANG_ALIAS = {
    js: 'js', javascript: 'js', jsx: 'js', ts: 'js', tsx: 'js', typescript: 'js',
    py: 'py', python: 'py',
  };

  const STRING_RE = '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`';

  function buildHighlighter(key) {
    const comment = key === 'py' ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
    // Etiquetas JSX (<div, </Column). "(?!)" nunca coincide (para Python).
    const tag = key === 'js' ? '<\\/?[A-Za-z][\\w.]*' : '(?!)';
    const kw = KEYWORDS[key].split(' ').join('|');
    return new RegExp(
      `(${comment})|(${STRING_RE})|(${tag})|\\b(${kw})\\b|\\b(\\d+(?:\\.\\d+)?)\\b|(@?[A-Za-z_$][\\w$]*)(?=\\s*\\()`,
      'g'
    );
  }

  const TOKEN_CLASSES = [null, 'tok-comment', 'tok-string', 'tok-tag', 'tok-keyword', 'tok-number', 'tok-fn'];

  function highlight(code, lang) {
    const key = LANG_ALIAS[String(lang).toLowerCase()];
    if (!key) return esc(code);

    const re = buildHighlighter(key);
    let html = '';
    let last = 0;
    let match;

    while ((match = re.exec(code))) {
      const group = match.findIndex((m, i) => i > 0 && m !== undefined);
      html += esc(code.slice(last, match.index));
      html += `<span class="${TOKEN_CLASSES[group]}">${esc(match[0])}</span>`;
      last = re.lastIndex;
    }
    return html + esc(code.slice(last));
  }

  /* ---------------------------------------------------------------
   * Inline
   * ------------------------------------------------------------- */
  function inline(raw) {
    const slots = [];
    const put = (html) => `\u0000${slots.push(html) - 1}\u0000`;

    let s = String(raw)
      // Imágenes dentro de párrafos o en cualquier lugar
      .replace(/!\[([^\]]*)\]\((.+?)\)/g, (_, alt, url) => {
        const src = safeImage(url.trim().replace(/^["']|["']$/g, ''));
        if (!src) return '';
        const title = alt || 'Vista previa';
        const caption = alt ? `<figcaption>${esc(alt)}</figcaption>` : '';
        return put(
          `<figure class="prose-figure">` +
            `<div class="prose-figure-bar"><span class="win-dots"><i></i><i></i><i></i></span><span>${esc(title)}</span></div>` +
            `<div class="prose-figure-body"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"></div>` +
            caption +
          `</figure>`
        );
      })
      .replace(/`([^`]+)`/g, (_, c) => put(`<code>${esc(c)}</code>`))
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
        const href = safeLink(url);
        const external = /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
        return put(`<a href="${esc(href)}"${external}>${esc(text)}</a>`);
      });

    s = esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[Number(i)]);
  }

  /* ---------------------------------------------------------------
   * Bloques
   * ------------------------------------------------------------- */
  function codeBlock(code, lang, filename) {
    const label = filename || lang || 'código';
    const rawLines = String(code || '').split('\n');
    const numbered = rawLines
      .map(
        (line, idx) =>
          `<span class="code-line"><span class="code-ln">${idx + 1}</span><span class="code-src">${highlight(line, lang)}</span></span>`
      )
      .join('\n');
    return (
      '<div class="code-block">' +
      `<div class="code-block-head"><span class="code-block-name">${esc(label)}</span>` +
      '<button type="button" class="code-copy" data-copy-code>Copiar</button></div>' +
      `<pre><code>${numbered}</code></pre>` +
      '</div>'
    );
  }

  function render(markdown) {
    const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    const headings = [];
    const usedIds = new Set();
    let paragraph = [];
    let i = 0;

    const flush = () => {
      if (paragraph.length) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    };

    const uniqueId = (text) => {
      let base = slugify(text) || 'seccion';
      let id = base;
      let n = 2;
      while (usedIds.has(id)) id = `${base}-${n++}`;
      usedIds.add(id);
      return id;
    };

    const collect = (pattern) => {
      const items = [];
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(lines[i].replace(pattern, ''));
        i++;
      }
      return items;
    };

    while (i < lines.length) {
      const line = lines[i];
      let m;

      // Bloque de código ```lang archivo
      if ((m = line.match(/^```\s*([\w+#.-]*)\s*(.*)$/))) {
        flush();
        const buffer = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) buffer.push(lines[i++]);
        i++; // cierre
        out.push(codeBlock(buffer.join('\n'), m[1], m[2].trim()));
        continue;
      }

      if (!line.trim()) {
        flush();
        i++;
        continue;
      }

      // Encabezados (# y ## -> h2, ### -> h3)
      if ((m = line.match(/^(#{1,3})\s+(.+)$/))) {
        flush();
        const level = m[1].length === 3 ? 3 : 2;
        const text = m[2].trim();
        const id = uniqueId(text);
        if (level === 2) headings.push({ id, text: text.replace(/[*`]/g, '') });
        out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
        i++;
        continue;
      }

      // Imagen en su propia línea -> figura con barra superior estilo ventana
      if ((m = line.match(/^!\[([^\]]*)\]\((.+?)\)\s*$/))) {
        flush();
        const src = safeImage(m[2].trim().replace(/^["']|["']$/g, ''));
        if (src) {
          const title = m[1] || 'Vista previa';
          const caption = m[1] ? `<figcaption>${esc(m[1])}</figcaption>` : '';
          out.push(
            `<figure class="prose-figure">` +
              `<div class="prose-figure-bar"><span class="win-dots"><i></i><i></i><i></i></span><span>${esc(title)}</span></div>` +
              `<div class="prose-figure-body"><img src="${esc(src)}" alt="${esc(m[1])}" loading="lazy"></div>` +
              caption +
            `</figure>`
          );
        }
        i++;
        continue;
      }

      // Cita / Tip
      if (/^>\s?/.test(line)) {
        flush();
        const items = collect(/^>\s?/);
        out.push(`<blockquote class="callout">${items.map(inline).join('<br>')}</blockquote>`);
        continue;
      }

      // Listas
      if (/^[-*]\s+/.test(line)) {
        flush();
        out.push(`<ul>${collect(/^[-*]\s+/).map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        flush();
        out.push(`<ol>${collect(/^\d+\.\s+/).map((t) => `<li>${inline(t)}</li>`).join('')}</ol>`);
        continue;
      }

      paragraph.push(line.trim());
      i++;
    }

    flush();
    return { html: out.join('\n'), headings };
  }

  window.DevBlog.Markdown = { render, highlight };
})();
