import ReactMarkdown from "react-markdown";

interface LessonContentProps {
  content: string;
}

/**
 * Рендерит markdown по Design_System.md:
 * - Размеры из типографики (22/18/16/14px)
 * - Отступы по шкале Tailwind
 * - Инлайн-код с фоном secondary-bg
 */
export function LessonContent({ content }: LessonContentProps) {
  return (
    <article>
      <ReactMarkdown
        components={{
          // Заголовок H1 скрыт — он уже отображается в page.tsx отдельно.
          // В markdown-файле h1 используется как структурный элемент,
          // но на странице мы рендерим lesson.title в своём стиле.
          h1: ({ children }) => (
            <h1 className="mb-4 text-[22px] font-bold leading-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-6 text-[18px] font-semibold leading-snug">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-[16px] font-semibold">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="my-3 text-[16px] leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 ml-5 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 ml-5 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[16px] leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          // Инлайн-код
          code: ({ children }) => (
            <code className="rounded-md bg-secondary-bg px-1.5 py-0.5 text-[14px] font-mono">
              {children}
            </code>
          ),
          // Ссылки — акцентный цвет
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-accent underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Горизонтальная линия
          hr: () => <hr className="my-6 border-border/20" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
