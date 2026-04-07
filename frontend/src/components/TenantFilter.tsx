import { useEffect, useRef, useState } from 'react';

interface Props {
  tenants: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function TenantFilter({ tenants, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (tenants.length === 0) return null;

  const allSelected = tenants.every(t => selected.has(t));
  const someSelected = tenants.some(t => selected.has(t));

  function toggleAll() {
    if (allSelected) {
      onChange(new Set());
    } else {
      onChange(new Set(tenants));
    }
  }

  function toggleOne(tenant: string) {
    const next = new Set(selected);
    if (next.has(tenant)) next.delete(tenant);
    else next.add(tenant);
    onChange(next);
  }

  const label = allSelected
    ? 'All Tenants'
    : selected.size === 0
      ? 'No Tenants'
      : `${selected.size} / ${tenants.length} Tenants`;

  return (
    <div className="tenant-filter" ref={ref}>
      <button
        className={`filter-btn ${open ? 'active' : ''} ${!allSelected ? 'filtered' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="filter-icon">▼</span> {label}
      </button>

      {open && (
        <div className="filter-dropdown">
          <label className="filter-option select-all">
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={toggleAll}
            />
            <span>Select All</span>
          </label>
          <div className="filter-divider" />
          <div className="filter-list">
            {tenants.map(t => (
              <label key={t} className="filter-option">
                <input
                  type="checkbox"
                  checked={selected.has(t)}
                  onChange={() => toggleOne(t)}
                />
                <span className="filter-tenant-name">{t}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
