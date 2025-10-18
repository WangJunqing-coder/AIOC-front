// Markdown 渲染工具：markdown-it + highlight.js + DOMPurify
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

// 初始化 markdown-it
const md = new MarkdownIt({
  html: false,      // 不信任外来 HTML
  linkify: true,    // 自动识别链接
  breaks: true,     // 将换行视作 <br>
  highlight(str, lang) {
    try {
      if (lang && hljs.getLanguage(lang)) {
        const out = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        return `<pre class="hljs"><code class="language-${lang}">${out}</code></pre>`
      }
      // 未知语言时尝试自动检测
      const out = hljs.highlightAuto(str).value
      return `<pre class="hljs"><code>${out}</code></pre>`
    } catch (_) {
      // 失败则进行简单转义
      const esc = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `<pre class="hljs"><code>${esc}</code></pre>`
    }
  }
})

export function renderMarkdown(raw = '') {
  if (!raw) return ''
  const dirty = md.render(String(raw))
  // 使用 DOMPurify 清理可能的 XSS
  return DOMPurify.sanitize(dirty)
}

export default renderMarkdown
