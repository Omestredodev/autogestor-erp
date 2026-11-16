export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  counts,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          type="button"
          role="tab"
          aria-selected={value === tab}
          className={value === tab ? "active" : ""}
          key={tab}
          onClick={() => onChange(tab)}
        >
          {tab}
          {counts?.[tab] !== undefined && <span className="tab-count">{counts[tab]}</span>}
        </button>
      ))}
    </div>
  );
}
