import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface LessonContentProps {
  content: string;
}

/**
 * Рендерит markdown с визуально насыщенным дизайном.
 *
 * rehypeRaw — плагин, который разрешает рендерить HTML внутри markdown.
 * Без него <svg>, <rect>, <text> и прочие теги просто исчезают,
 * потому что react-markdown по умолчанию игнорирует сырой HTML
 * (защита от XSS). В нашем случае контент — свой, не пользовательский,
 * поэтому это безопасно.
 */
export function LessonContent({ content }: LessonContentProps) {
  return (
    <article className="lesson-content">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: () => null,
          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 border-t border-border/15 pt-6 text-[18px] font-bold leading-snug first:mt-0 first:border-0 first:pt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-[16px] font-semibold">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="my-3 text-[15px] leading-[1.7] text-foreground/90">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 space-y-2 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 ml-5 list-decimal space-y-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex gap-2.5 text-[15px] leading-[1.6]">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          // Блоки кода (```) — отличаем от инлайн-кода по наличию className
          // react-markdown ставит className="language-js" на блоки кода
          code: ({ children, className }) => {
            // Если есть className — это блок кода (```js ... ```),
            // оборачиваем в <pre> будет снаружи через компонент pre
            if (className) {
              return (
                <code className={`text-[13px] font-mono ${className}`}>
                  {children}
                </code>
              );
            }
            // Инлайн-код (`something`)
            return (
              <code className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[13px] font-mono text-accent">
                {children}
              </code>
            );
          },
          // Обёртка блока кода — стилизованный контейнер
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-xl bg-secondary-bg p-4 text-[13px] leading-relaxed">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <div className="my-4 rounded-xl border-l-[3px] border-accent bg-accent/5 px-4 py-3">
              {children}
            </div>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="font-medium text-accent underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-border/15" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
