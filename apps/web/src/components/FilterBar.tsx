import type { ReactNode } from "react";
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

/** Source document filter plus the quick "SRD only" toggle. Both write the `document` parameter. */
export function SourceFilter({
  kind,
  value,
  update,
}: {
  kind: RuleKind;
  value: string;
  update: (patch: ParamPatch) => void;
}) {
  const docs = useApi(() => getDocuments(), "documents");
  const options =
    docs.status === "ok"
      ? docs.data.items
          .filter((d) => d.counts[kind] > 0)
          .map((d) => ({ value: d.key, label: `${d.displayName} (${d.counts[kind]})` }))
      : [];
  return (
    <>
      <Check label="SRD only" checked={value === SRD_KEY} onChange={(on) => update({ document: on ? SRD_KEY : undefined })} />
      <Select label="Source" value={value} options={options} onChange={(v) => update({ document: v })} />
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
