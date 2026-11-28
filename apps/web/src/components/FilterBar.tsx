import type { ReactNode } from "react";
import { CORE_RULES_DOCUMENT_KEYS } from "@table-forge/shared";
import { getDocuments } from "../api/rules.js";
import type { RuleKind } from "../api/rules.js";
import { useDebouncedParam, type ParamPatch } from "../hooks/useQueryParams.js";
import { useApi } from "../hooks/useApi.js";

export const SRD_KEY = "srd-2014";

export function SearchBox({ value, onCommit, label }: { value: string; onCommit: (v: string) => void; label: string }) {
  const [text, setText] = useDebouncedParam(value, onCommit);
  return (
    <input
      className="search"
      type="search"
      aria-label={label}
      placeholder={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      autoComplete="off"
      enterKeyHint="search"
    />
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

const CORE_KEYS: readonly string[] = CORE_RULES_DOCUMENT_KEYS;

/** Whether the URL has the "Core rules" tickbox on. */
export function coreParam(params: URLSearchParams): boolean {
  return params.get("core") === "true";
}

/**
 * Source document filter plus the quick "Core rules" toggle (the SRD and the owner's PHB, MM and DMG).
 * They write `core` and `document`, and never both at once with a conflicting value: ticking "Core rules"
 * clears a non-core source, and choosing a non-core source clears "Core rules".
 */
export function SourceFilter({
  kind,
  value,
  core,
  update,
  showCounts = true,
}: {
  kind: RuleKind;
  value: string;
  core: boolean;
  update: (patch: ParamPatch) => void;
  /** Turn off when the list shows only part of the table (one reference kind), as the counts cover the whole table. */
  showCounts?: boolean;
}) {
  const docs = useApi(() => getDocuments(), "documents");
  // Keep the selected source in the list even when "Core rules" would hide it, so a conflicting URL
  // (core=true plus a non-core document) shows why the list is empty and lets the user change it.
  const options =
    docs.status === "ok"
      ? docs.data.items
          .filter((d) => d.key === value || (d.counts[kind] > 0 && (!core || CORE_KEYS.includes(d.key))))
          .map((d) => ({ value: d.key, label: showCounts ? `${d.displayName} (${d.counts[kind]})` : d.displayName }))
      : [];
  const onCore = (on: boolean) =>
    update({ core: on ? "true" : undefined, ...(on && value !== "" && !CORE_KEYS.includes(value) ? { document: undefined } : {}) });
  const onSource = (v: string) => update({ document: v, ...(v !== "" && !CORE_KEYS.includes(v) ? { core: undefined } : {}) });
  return (
    <>
      <Check label="Core rules" checked={core} onChange={onCore} />
      <Select label="Source" value={value} options={options} onChange={onSource} />
    </>
  );
}

export function Filters({ children }: { children: ReactNode }) {
  return (
    <div className="filters" role="search">
      {children}
    </div>
  );
}
