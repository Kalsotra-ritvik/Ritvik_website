import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { COLLECTIONS, isSafeHref, schemaFor, isSingleton, projectSchema, visualSchema } from "@/lib/content/schema";
import { SINGLETON_DEFAULTS, defaultContent, LIST_TEMPLATES } from "@/lib/content/defaults";
import { Inline, Rich } from "@/components/Markup";
import { FORMS } from "@/lib/admin/forms";

describe("content schemas", () => {
  it("all defaults are valid", () => {
    const c = defaultContent();
    for (const name of COLLECTIONS) {
      if (isSingleton(name)) expect(schemaFor(name).safeParse(SINGLETON_DEFAULTS[name]).success, name).toBe(true);
    }
    const lists = { education: c.education, experience: c.experience, project: c.projects, skillGroup: c.skillGroups, credential: c.credentials };
    for (const [name, items] of Object.entries(lists)) {
      for (const item of items) expect(schemaFor(name as never).safeParse(item).success, name).toBe(true);
    }
  });

  it("list templates are valid once required fields are filled", () => {
    const p = { ...LIST_TEMPLATES.project, title: "T", slug: "t" };
    expect(projectSchema.safeParse(p).success).toBe(true);
  });

  it("rejects unsafe links", () => {
    for (const bad of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", " javascript:alert(1)", "data:text/html,<b>", "vbscript:x", "//evil.example"]) {
      expect(isSafeHref(bad), bad).toBe(false);
    }
    for (const ok of ["https://example.org", "mailto:a@b.co", "/cv/file.pdf", "#projects", ""]) expect(isSafeHref(ok), ok).toBe(true);
    const r = projectSchema.safeParse({ ...LIST_TEMPLATES.project, title: "T", slug: "t", repoUrl: "javascript:alert(1)" });
    expect(r.success).toBe(false);
  });

  it("constrains visual settings to safe ranges", () => {
    const base = SINGLETON_DEFAULTS.visual;
    expect(visualSchema.safeParse({ ...base, bloom: 5 }).success).toBe(false);
    expect(visualSchema.safeParse({ ...base, colors: { ...base.colors, accent: "red;}" } }).success).toBe(false);
    expect(visualSchema.safeParse({ ...base, proteinMode: "wireframe" }).success).toBe(false);
  });

  it("every editor form field exists in its schema's defaults", () => {
    const missing: string[] = [];
    for (const name of COLLECTIONS) {
      const base = (isSingleton(name) ? SINGLETON_DEFAULTS[name] : LIST_TEMPLATES[name as keyof typeof LIST_TEMPLATES]) as Record<string, unknown>;
      const walk = (fields: (typeof FORMS)[typeof name][number]["fields"], obj: unknown, prefix: string) => {
        for (const f of fields) {
          const path = f.name.split(".");
          let v: unknown = obj;
          for (const k of path) v = v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
          if (v === undefined) missing.push(`${prefix}${f.name}`);
          if (f.kind === "group") walk(f.fields, v, `${prefix}${f.name}.`);
        }
      };
      for (const section of FORMS[name]) walk(section.fields, base, `${name}:`);
    }
    expect(missing).toEqual([]);
  });
});

describe("markup rendering", () => {
  it("never renders HTML from content", () => {
    const html = renderToStaticMarkup(<Rich text={'<script>alert(1)</script>\n\n<img src=x onerror=alert(1)> **bold** *it*'} />);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em");
  });

  it("drops unsafe link targets and hardens external links", () => {
    const bad = renderToStaticMarkup(<Inline text="[click](javascript:alert(1))" />);
    expect(bad).not.toContain("href");
    const ext = renderToStaticMarkup(<Inline text="[site](https://example.org)" />);
    expect(ext).toContain('href="https://example.org"');
    expect(ext).toContain('rel="noopener noreferrer"');
  });
});
