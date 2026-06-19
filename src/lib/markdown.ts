import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

function ytId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Turn a paragraph that is just a YouTube link into a responsive embed. */
function embedMedia(html: string): string {
  return html.replace(
    /<p>\s*(?:<a[^>]*href="([^"]+)"[^>]*>[^<]*<\/a>|((?:https?:\/\/)[^\s<]+))\s*<\/p>/gi,
    (full, hrefUrl, bareUrl) => {
      const url = hrefUrl || bareUrl;
      const id = ytId(url);
      if (!id) return full;
      return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${id}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
    },
  );
}

/** Render trusted (admin-authored) markdown to HTML, embedding YouTube links. */
export function renderMarkdown(md: string): string {
  if (!md) return "";
  const html = marked.parse(md, { async: false }) as string;
  return embedMedia(html);
}

/** Strip markdown to a plain-text excerpt of ~`max` chars. */
export function excerptFrom(md: string, max = 160): string {
  const text = (md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
