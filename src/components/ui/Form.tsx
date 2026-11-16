import type { ReactNode } from "react";
import { Search, X } from "lucide-react";

export function Field({
  label,
  children,
  className = "",
  error,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className={`field ${error ? "invalid" : ""} ${className}`}>
      <span>
        {label}
        {required && <b className="required-mark"> *</b>}
      </span>
      {children}
      {error ? (
        <small className="field-error">{error}</small>
      ) : hint ? (
        <small className="field-hint">{hint}</small>
      ) : null}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-row ${disabled ? "disabled" : ""}`}>
      <div>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="search-field">
      <Search size={17} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
      />
      {value && (
        <button
          type="button"
          className="clear-search"
          onClick={() => onChange("")}
          aria-label="Limpar pesquisa"
        >
          <X size={14} />
        </button>
      )}
    </label>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly (T | { value: T; label: string })[];
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      aria-label={label}
    >
      {options.map((option) =>
        typeof option === "string" ? (
          <option key={option} value={option}>
            {option}
          </option>
        ) : (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ),
      )}
    </select>
  );
}
