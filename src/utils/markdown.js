import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // 选择一款样式

// 配置 marked 使用 highlight.js 高亮代码
marked.setOptions({
  highlight: (code, language) => {
    const validLang = hljs.getLanguage(language) ? language : 'plaintext';
    return hljs.highlight(validLang, code).value;
  },
  langPrefix: 'hljs language-', // 高亮样式前缀
});

// 封装成 Vue 可用的函数
export const parseMarkdown = (content) => {
  return marked(content);
}
