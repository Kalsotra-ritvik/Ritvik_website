"use client";

import { useId, useState, type ReactNode } from "react";
import type { Field } from "@/lib/admin/forms";
import { btnGhost, btnSecondary, input } from "./ui";
import AssetField from "./AssetField";

export type Data = Record<string, unknown>;
export type Issues = Record<string, string>;

export function splitPath(name: string) {
  return name.split(".").filter(Boolean);
}

export function getAt(obj: unknown, path: (string | number)[]): unknown {
  let cur = obj;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[p];
  }
  return cur;
}

export function setAt<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const base: Record<string | number, unknown> | unknown[] = Array.isArray(obj) ? [...obj] : { ...((obj ?? {}) as object) };
  (base as Record<string | number, unknown>)[head] = setAt((base as Record<string | number, unknown>)[head], rest, value);
  return base as T;
}

interface FieldProps {
  field: Field;
  path: (string | number)[];
  data: Data;
  onChange: (path: (string | number)[], value: unknown) => void;
  issues: Issues;
}

function Label({ htmlFor, children, help, error }: { htmlFor?: string; children: ReactNode; help?: string; error?: string }) {
  return (
    <>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-mist-200">
        {children}
      </label>
      {help && <p className="-mt-1 mb-1.5 text-xs text-mist-400">{help}</p>}
      {error && (
        <p className="mb-1.5 text-xs font-medium text-coral-400" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

const keyOf = (path: (string | number)[]) => path.join(".");

export function FieldView({ field, path, data, onChange, issues }: FieldProps) {
  const id = useId();
  const value = getAt(data, path);
  const error = issues[keyOf(path)];
  const set = (v: unknown) => onChange(path, v);
  const invalid = error ? true : undefined;

  switch (field.kind) {
    case "text":
    case "email":
    case "url":
      return (
        <div>
          <Label htmlFor={id} help={field.help} error={error}>
            {field.label}
            {field.kind === "text" && field.required && <span className="text-coral-400"> *</span>}
          </Label>
          <input
            id={id}
            type={field.kind === "email" ? "email" : field.kind === "url" ? "url" : "text"}
            inputMode={field.kind === "url" ? "url" : undefined}
            className={input}
            value={typeof value === "string" ? value : ""}
            placeholder={field.kind === "text" ? field.placeholder : field.kind === "url" ? "https://" : undefined}
            onChange={(e) => set(e.target.value)}
            aria-invalid={invalid}
          />
        </div>
      );
    case "textarea":
      return (
        <div>
          <Label htmlFor={id} help={field.help ?? (field.markup ? "Supports *italic*, **bold** and [link text](https://…)." : undefined)} error={error}>
            {field.label}
          </Label>
          <textarea
            id={id}
            rows={field.rows ?? 3}
            className={`${input} resize-y leading-relaxed`}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => set(e.target.value)}
            aria-invalid={invalid}
          />
        </div>
      );
    case "lines":
      return <LinesField id={id} field={field} value={Array.isArray(value) ? (value as string[]) : []} onChange={set} error={error ?? firstNested(issues, path)} />;
    case "select":
      return (
        <div>
          <Label htmlFor={id} help={field.help} error={error}>
            {field.label}
          </Label>
          <select id={id} className={input} value={String(value ?? "")} onChange={(e) => set(e.target.value)} aria-invalid={invalid}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "checkbox":
      return (
        <div>
          <label className="flex min-h-10 cursor-pointer items-start gap-3 text-sm text-mist-200">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-amber-300" checked={Boolean(value)} onChange={(e) => set(e.target.checked)} />
            <span>
              {field.label}
              {field.help && <span className="block text-xs text-mist-400">{field.help}</span>}
            </span>
          </label>
          {error && <p className="text-xs text-coral-400">{error}</p>}
        </div>
      );
    case "slider": {
      const n = typeof value === "number" ? value : field.min;
      return (
        <div>
          <Label htmlFor={id} help={field.help} error={error}>
            {field.label} <span className="font-mono text-xs text-amber-300">{n.toFixed(2).replace(/\.?0+$/, "")}{field.unit ?? ""}</span>
          </Label>
          <input
            id={id}
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={n}
            onChange={(e) => set(Number(e.target.value))}
            className="h-10 w-full accent-amber-300"
          />
        </div>
      );
    }
    case "color": {
      const v = typeof value === "string" ? value : "#000000";
      return (
        <div>
          <Label htmlFor={id} error={error}>
            {field.label}
          </Label>
          <div className="flex items-center gap-2">
            <input type="color" aria-label={`${field.label} picker`} value={/^#[0-9a-f]{6}$/i.test(v) ? v : "#000000"} onChange={(e) => set(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded border border-ink-600 bg-ink-900" />
            <input id={id} className={`${input} font-mono`} value={v} maxLength={7} onChange={(e) => set(e.target.value)} aria-invalid={invalid} />
          </div>
        </div>
      );
    }
    case "asset":
      return <AssetField field={field} value={value} onChange={set} error={error ?? firstNested(issues, path)} />;
    case "group":
      return (
        <fieldset className="rounded-xl border border-ink-700 p-4">
          <legend className="px-1 text-sm font-medium text-mist-200">{field.label}</legend>
          {field.help && <p className="mb-3 text-xs text-mist-400">{field.help}</p>}
          <div className="grid gap-4">
            {field.fields.map((f) => (
              <FieldView key={f.name} field={f} path={[...path, ...splitPath(f.name)]} data={data} onChange={onChange} issues={issues} />
            ))}
          </div>
        </fieldset>
      );
    case "repeater":
      return <RepeaterField field={field} path={path} data={data} onChange={onChange} issues={issues} />;
    case "checklist": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-mist-200">{field.label}</legend>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {field.options.map((o) => (
              <label key={o.value} className="flex min-h-9 items-center gap-2 text-sm text-mist-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-amber-300"
                  checked={list.includes(o.value)}
                  onChange={(e) => set(e.target.checked ? [...list, o.value] : list.filter((x) => x !== o.value))}
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }
    case "order": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const labelOf = (v: string) => field.options.find((o) => o.value === v)?.label ?? v;
      const move = (i: number, d: number) => {
        const next = [...list];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        set(next);
      };
      return (
        <div>
          <p className="mb-2 text-sm font-medium text-mist-200">{field.label}</p>
          <ol className="space-y-1.5">
            {list.map((v, i) => (
              <li key={v} className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm">
                <span className="w-5 font-mono text-xs text-mist-400">{i + 1}</span>
                <span className="flex-1">{labelOf(v)}</span>
                <button type="button" className={btnGhost} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${labelOf(v)} up`}>
                  ↑
                </button>
                <button type="button" className={btnGhost} disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${labelOf(v)} down`}>
                  ↓
                </button>
              </li>
            ))}
          </ol>
        </div>
      );
    }
  }
}

function firstNested(issues: Issues, path: (string | number)[]) {
  const prefix = keyOf(path) + ".";
  const hit = Object.entries(issues).find(([k]) => k.startsWith(prefix));
  return hit ? hit[1] : undefined;
}

function LinesField({ id, field, value, onChange, error }: { id: string; field: Extract<Field, { kind: "lines" }>; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  // Keep the raw text locally so blank lines can be typed; store trimmed, non-empty lines.
  const [text, setText] = useState(value.join("\n"));
  return (
    <div>
      <Label htmlFor={id} help={field.help} error={error}>
        {field.label}
      </Label>
      <textarea
        id={id}
        rows={field.rows ?? Math.min(10, Math.max(3, value.length + 1))}
        className={`${input} resize-y leading-relaxed`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean),
          );
        }}
        aria-invalid={error ? true : undefined}
      />
    </div>
  );
}

function RepeaterField({ field, path, data, onChange, issues }: FieldProps & { field: Extract<Field, { kind: "repeater" }> }) {
  const items = (getAt(data, path) as Data[] | undefined) ?? [];
  const set = (next: Data[]) => onChange(path, next);
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set(next);
  };
  const full = field.max != null && items.length >= field.max;
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-mist-200">{field.label}</p>
      {field.help && <p className="mb-2 text-xs text-mist-400">{field.help}</p>}
      <ol className="space-y-3">
        {items.map((_, i) => (
          <li key={i} className="rounded-xl border border-ink-700 bg-ink-900/60 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-mist-400">
                {field.itemLabel} {i + 1}
              </span>
              <div className="flex gap-1">
                <button type="button" className={btnGhost} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${field.itemLabel} ${i + 1} up`}>
                  ↑
                </button>
                <button type="button" className={btnGhost} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${field.itemLabel} ${i + 1} down`}>
                  ↓
                </button>
                <button
                  type="button"
                  className={`${btnGhost} text-coral-400`}
                  onClick={() => set(items.filter((__, j) => j !== i))}
                  aria-label={`Remove ${field.itemLabel} ${i + 1}`}
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {field.fields.map((f) => (
                <div key={f.name} className={f.kind === "textarea" || f.kind === "asset" || f.kind === "group" ? "sm:col-span-2" : ""}>
                  <FieldView field={f} path={[...path, i, ...splitPath(f.name)]} data={data} onChange={onChange} issues={issues} />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className={`${btnSecondary} mt-3`} disabled={full} onClick={() => set([...items, structuredClone(field.newItem)])}>
        + Add {field.itemLabel.toLowerCase()}
      </button>
      {full && <p className="mt-1 text-xs text-mist-400">Maximum of {field.max} reached.</p>}
    </div>
  );
}
