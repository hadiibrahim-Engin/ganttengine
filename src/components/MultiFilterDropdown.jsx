import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import './MultiFilterDropdown.css';

/**
 * filter shape: { mode: 'all' | 'include' | 'exclude', items: Set<string> }
 *
 * mode='all'     → show everything  (items is ignored)
 * mode='include' → show only items in the set
 * mode='exclude' → show everything except items in the set
 */

export function emptyFilter() {
  return { mode: 'all', items: new Set() };
}

export function applyFilter(filter, taskList, getField) {
  if (filter.mode === 'all' || filter.items.size === 0) return taskList;
  if (filter.mode === 'include') return taskList.filter(t => filter.items.has(getField(t)));
  if (filter.mode === 'exclude') return taskList.filter(t => !filter.items.has(getField(t)));
  return taskList;
}

function triggerLabel(filter, noun) {
  if (filter.mode === 'all' || filter.items.size === 0) return `All ${noun}s`;
  if (filter.mode === 'include') {
    if (filter.items.size === 1) return [...filter.items][0];
    return `${filter.items.size} ${noun}s`;
  }
  return `All except ${filter.items.size}`;
}

export default function MultiFilterDropdown({ noun, options, filter, onChange }) {
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState('');
  const wrapRef                 = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const isActive = filter.mode !== 'all' && filter.items.size > 0;
  const isExclude = filter.mode === 'exclude';

  const setMode = useCallback((mode) => {
    onChange({ mode, items: filter.items.size > 0 ? filter.items : new Set() });
  }, [filter, onChange]);

  const toggle = useCallback((item) => {
    const next = new Set(filter.items);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    const mode = next.size === 0 ? 'all' : filter.mode === 'all' ? 'include' : filter.mode;
    onChange({ mode, items: next });
  }, [filter, onChange]);

  const selectAll = useCallback(() => {
    onChange({ mode: filter.mode === 'exclude' ? 'exclude' : 'include', items: new Set(options) });
  }, [filter.mode, options, onChange]);

  const reset = useCallback(() => {
    onChange({ mode: 'all', items: new Set() });
    setSearch('');
    setOpen(false);
  }, [onChange]);

  const label  = triggerLabel(filter, noun);
  const active = isActive;
  const itemMode = filter.mode === 'exclude' ? 'exclude' : 'include';

  return (
    <div className="mfd-wrapper" ref={wrapRef}>
      <button
        className={`mfd-trigger${active ? (isExclude ? ' exclude-active' : ' active') : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="mfd-label">{label}</span>
        {active && (
          <span className={`mfd-badge ${isExclude ? 'exclude' : 'include'}`}>
            {filter.items.size}
          </span>
        )}
        <ChevronDown size={12} className={`mfd-chevron${open ? ' open' : ''}`} />
      </button>

      {open && (
        <div className="mfd-panel">

          {/* Mode toggle */}
          <div className="mfd-mode-toggle">
            <button
              className={`mfd-mode-btn${filter.mode !== 'exclude' ? ' active-include' : ''}`}
              onClick={() => setMode(filter.items.size ? 'include' : 'all')}
            >
              ✓ Include only
            </button>
            <button
              className={`mfd-mode-btn${filter.mode === 'exclude' ? ' active-exclude' : ''}`}
              onClick={() => setMode('exclude')}
            >
              ✕ Exclude
            </button>
          </div>

          {/* Search */}
          <div className="mfd-search">
            <Search size={12} color="var(--text-muted)" />
            <input
              className="mfd-search-input"
              placeholder={`Search ${noun}s…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ display: 'flex' }}>
                <X size={11} color="var(--text-muted)" />
              </button>
            )}
          </div>

          {/* Bulk actions */}
          <div className="mfd-actions">
            <button className="mfd-action-btn" onClick={selectAll}>
              Select all
            </button>
            {filter.items.size > 0 && (
              <button className="mfd-action-btn clear" onClick={() => onChange({ mode: 'all', items: new Set() })}>
                Clear
              </button>
            )}
          </div>

          {/* List */}
          <div className="mfd-list">
            {filtered.length === 0 ? (
              <div className="mfd-empty">No results</div>
            ) : (
              filtered.map(item => {
                const checked = filter.items.has(item);
                const cls = checked ? (isExclude ? 'selected-exclude' : 'selected-include') : '';
                return (
                  <div
                    key={item}
                    className={`mfd-item ${cls}`}
                    onClick={() => toggle(item)}
                  >
                    <div className="mfd-checkbox">
                      {checked && (
                        <span className="mfd-check-mark">
                          {isExclude ? '✕' : '✓'}
                        </span>
                      )}
                    </div>
                    <span className="mfd-item-label">{item}</span>
                    {checked && (
                      <span className={`mfd-item-indicator ${isExclude ? 'exc' : 'inc'}`}>
                        {isExclude ? 'EXC' : 'INC'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="mfd-footer">
            <span>
              {filter.items.size > 0
                ? `${filter.items.size} of ${options.length} selected`
                : `${options.length} ${noun}s`}
            </span>
            {isActive && (
              <button className="mfd-reset-btn" onClick={reset}>
                Reset filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
