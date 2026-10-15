/**
 * Safe renderer for editable text. Supports *italic*, **bold**, [label](href)
 * and blank-line paragraphs. Output is built from React elements, so stored
 * text can never inject HTML or script; links are re-validated at render time.
 */
import { Fragment, type ReactNode } from "react";
import { isSafeHref } from "@/lib/content/schema";

const TOKEN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g;

export function renderInline(text: string, keyPrefix = "i", italicClass?: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const tok = m[0];
    const key = `${keyPrefix}-${n++}`;
    if (tok.startsWith("**")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("*")) out.push(<em key={key} className={italicClass}>{tok.slice(1, -1)}</em>);
    else {
      const close = tok.indexOf("](");
      const label = tok.slice(1, close);
      const href = tok.slice(close + 2, -1);
      if (isSafeHref(href)) {
        const external = /^https?:/i.test(href);
        out.push(
          <a key={key} href={href} className="underline decoration-1 underline-offset-4 hover:opacity-80" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {label}
            {external && <span className="sr-only"> (opens in a new tab)</span>}
          </a>,
        );
      } else out.push(label);
    }
    last = at + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Inline({ text, italicClass }: { text: string; italicClass?: string }) {
  return <>{renderInline(text, "i", italicClass)}</>;
}

export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function Rich({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {paragraphs(text).map((p, i) => (
        <p key={i} className={className}>
          {p.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {renderInline(line, `p${i}-${j}`)}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}

/** Strip markup for plain-text contexts (metadata, aria labels). */
export function plainText(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
