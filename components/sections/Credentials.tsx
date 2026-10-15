import { credentials } from "@/data/profile";
import { ChapterHeader } from "@/components/ui";

function List({ items }: { items: typeof credentials }) {
  return (
    <ul className="mt-6 divide-y divide-umber-900/10 border-y border-umber-900/10">
      {items.map((c) => (
        <li key={c.title + c.issuer} data-reveal className="grid gap-1 py-5 sm:grid-cols-[7rem_1fr] sm:gap-6">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-taupe-500">
            {c.kind}
            {c.date ? ` · ${c.date}` : ""}
          </p>
          <div>
            <p className="text-umber-900">{c.title}</p>
            <p className="text-sm text-taupe-700">{c.issuer}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Credentials() {
  const talks = credentials.filter((c) => c.kind === "Poster" || c.kind === "Conference");
  const learning = credentials.filter((c) => c.kind === "Certificate" || c.kind === "Workshop");
  return (
    <section id="credentials" data-chapter="credentials" className="on-light border-t border-umber-900/10 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <ChapterHeader index="11" label="Conferences" title={<>Presentations</>} light />
          <List items={talks} />
        </div>
        <div>
          <ChapterHeader index="12" label="Learning" title={<>Certificates &amp; workshops</>} light />
          <List items={learning} />
        </div>
      </div>
    </section>
  );
}
