import { useRef, useCallback, useState, useEffect } from 'react';
import {
  Search, ZoomIn, ZoomOut, RotateCcw, Maximize2,
  Upload, Undo2, Redo2, Plus, Moon, Sun, History,
  SlidersHorizontal, X, Download,
  FileSpreadsheet, FileJson, FileText, Camera,
} from 'lucide-react';
import { parseJSON, parseCSV, exportJSON, exportCSV, exportExcel, exportPNG } from '../utils/importExport';
import { SNAP_OPTIONS, GROUPING_OPTIONS, ITEM_TYPE_CONFIG, STATUS_CONFIG } from '../config/theme';
import './Toolbar.css';

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 120;
const ZOOM_STEP = 1.5;

export default function Toolbar({
  ganttData,
  pixelsPerDay, onZoom, onZoomReset, onZoomFit,
  snapMode, onSnapMode,
  groupBy, onGroupBy,
  searchQuery, onSearch,
  filters, onFilter,
  isDark, onToggleDark,
  canUndo, onUndo, canRedo, onRedo,
  onData, onError, onAddItem, onShowHistory,
  chartRef,
}) {
  const fileInputRef    = useRef(null);
  const exportBtnRef    = useRef(null);
  const filterBtnRef    = useRef(null);
  const [showExport,  setShowExport]    = useState(false);
  const [showFilters, setShowFilters]   = useState(false);
  const [exportPos,   setExportPos]     = useState({ top: 0, right: 0 });
  const [filterPos,   setFilterPos]     = useState({ top: 0, left: 0 });

  // Calculate fixed positions when dropdowns open so they appear just below their buttons
  const openExport = useCallback(() => {
    if (exportBtnRef.current) {
      const r = exportBtnRef.current.getBoundingClientRect();
      setExportPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setShowExport(s => !s);
    setShowFilters(false);
  }, []);

  const openFilters = useCallback(() => {
    if (filterBtnRef.current) {
      const r = filterBtnRef.current.getBoundingClientRect();
      setFilterPos({ top: r.bottom + 6, left: r.left });
    }
    setShowFilters(s => !s);
    setShowExport(false);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!showExport && !showFilters) return;
    const close = (e) => {
      if (!e.target.closest('.filter-panel') && !e.target.closest('.export-dropdown') &&
          !e.target.closest('.icon-btn') && !e.target.closest('.action-btn')) {
        setShowExport(false);
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showExport, showFilters]);

  const zoomPct = Math.round((pixelsPerDay / 20) * 100);

  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = file.name.endsWith('.csv') ? parseCSV(ev.target.result) : parseJSON(ev.target.result);
        onData(parsed);
      } catch (err) { onError(err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [onData, onError]);

  const handleExportPNG = useCallback(async () => {
    if (chartRef?.current) await exportPNG(chartRef.current);
    setShowExport(false);
  }, [chartRef]);

  const items    = ganttData?.items    || [];
  const projects = ganttData?.projects || [];
  const assets   = ganttData?.assets   || [];

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="toolbar">

      {/* Search */}
      <label className="search-wrap">
        <Search size={12} />
        <input
          type="text"
          placeholder="Search items, projects, owners…"
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          className="search-input"
        />
        {searchQuery && <button onClick={() => onSearch('')} className="search-clear"><X size={10} /></button>}
      </label>

      <div className="tb-divider" />

      {/* Fine zoom */}
      <div className="tb-group">
        <button className="icon-btn" onClick={() => onZoom(Math.max(ZOOM_MIN, pixelsPerDay / ZOOM_STEP))} disabled={pixelsPerDay <= ZOOM_MIN} title="Zoom out">
          <ZoomOut size={12} />
        </button>
        <span className="zoom-pct">{zoomPct}%</span>
        <button className="icon-btn" onClick={() => onZoom(Math.min(ZOOM_MAX, pixelsPerDay * ZOOM_STEP))} disabled={pixelsPerDay >= ZOOM_MAX} title="Zoom in">
          <ZoomIn size={12} />
        </button>
        <button className="icon-btn" onClick={onZoomReset} title="Reset zoom"><RotateCcw size={12} /></button>
        <button className="icon-btn" onClick={onZoomFit} title="Fit to screen"><Maximize2 size={12} /></button>
      </div>

      <div className="tb-divider" />

      {/* Grouping + Snap */}
      <div className="tb-group">
        <select className="tb-select" value={groupBy} onChange={e => onGroupBy(e.target.value)} title="Group by">
          {GROUPING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="tb-select" value={snapMode} onChange={e => onSnapMode(e.target.value)} title="Snap mode">
          {SNAP_OPTIONS.map(o => <option key={o.value} value={o.value}>Snap: {o.label}</option>)}
        </select>
      </div>

      <div className="tb-divider" />

      {/* Filters */}
      <div className="tb-group">
        <button
          ref={filterBtnRef}
          className={`icon-btn${(showFilters || activeFilterCount > 0) ? ' active' : ''}`}
          onClick={openFilters}
          title={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
        >
          <SlidersHorizontal size={12} />
          {activeFilterCount > 0 && <span className="filter-dot" />}
        </button>
        {activeFilterCount > 0 && (
          <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, marginLeft: -2 }}>
            {activeFilterCount}
          </span>
        )}
        {showFilters && (
          <FilterPanel
            filters={filters}
            onFilter={onFilter}
            projects={projects}
            assets={assets}
            onClose={() => setShowFilters(false)}
            style={{ top: filterPos.top, left: filterPos.left }}
          />
        )}
      </div>

      <div className="tb-spacer" />

      {/* Undo / Redo */}
      <div className="tb-group">
        <button className="icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{ opacity: canUndo ? 1 : 0.35 }}>
          <Undo2 size={12} />
        </button>
        <button className="icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" style={{ opacity: canRedo ? 1 : 0.35 }}>
          <Redo2 size={12} />
        </button>
      </div>

      <div className="tb-divider" />

      {/* History */}
      <button className="icon-btn" onClick={onShowHistory} title="Change history">
        <History size={12} />
      </button>

      <div className="tb-divider" />

      {/* Add */}
      <button className="action-btn action-btn-primary" onClick={onAddItem}>
        <Plus size={12} /> Add
      </button>

      <div className="tb-divider" />

      {/* Export */}
      <div className="tb-group">
        <button
          ref={exportBtnRef}
          className={`action-btn action-btn-secondary${showExport ? ' active' : ''}`}
          onClick={openExport}
          title="Export"
        >
          <Download size={12} /> Export
        </button>
        {showExport && (
          <div className="export-dropdown" style={{ top: exportPos.top, right: exportPos.right }}>
            <button onClick={() => { exportJSON(ganttData); setShowExport(false); }}><FileJson size={12} /> JSON</button>
            <button onClick={() => { exportCSV(items, projects, assets); setShowExport(false); }}><FileText size={12} /> CSV</button>
            <button onClick={() => { exportExcel(items, projects, assets); setShowExport(false); }}><FileSpreadsheet size={12} /> Excel</button>
            <button onClick={handleExportPNG}><Camera size={12} /> PNG</button>
          </div>
        )}
      </div>

      {/* Import */}
      <div className="tb-group">
        <input ref={fileInputRef} type="file" accept=".json,.csv" style={{ display: 'none' }} onChange={handleFile} />
        <button className="action-btn action-btn-secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={12} /> Import
        </button>
      </div>

      <div className="tb-divider" />

      {/* Theme */}
      <button className="icon-btn" onClick={onToggleDark} title={isDark ? 'Light mode' : 'Dark mode'}>
        {isDark ? <Sun size={12} /> : <Moon size={12} />}
      </button>
    </div>
  );
}

function countActiveFilters(filters) {
  if (!filters) return 0;
  return (
    (filters.projects?.length || 0) +
    (filters.assets?.length || 0) +
    (filters.types?.length || 0) +
    (filters.statuses?.length || 0) +
    (filters.owners?.length || 0) +
    (filters.departments?.length || 0) +
    (filters.bundledOnly ? 1 : 0) +
    (filters.overlappingOnly ? 1 : 0)
  );
}

function FilterPanel({ filters, onFilter, projects, assets, onClose, style }) {
  const toggleArr = useCallback((key, value) => {
    onFilter(prev => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }, [onFilter]);

  const setAll = useCallback((key, values) => {
    onFilter(prev => ({ ...prev, [key]: values }));
  }, [onFilter]);

  const clearAll = useCallback(() => {
    onFilter({ projects: [], assets: [], types: [], statuses: [], owners: [], departments: [], bundledOnly: false, overlappingOnly: false });
  }, [onFilter]);

  const TYPES    = Object.entries(ITEM_TYPE_CONFIG).map(([k, v]) => ({ id: k, label: v.label }));
  const STATUSES = Object.entries(STATUS_CONFIG).map(([k, v]) => ({ id: k, label: v.label }));

  return (
    <div className="filter-panel" style={style}>
      <div className="filter-panel-header">
        <span className="filter-panel-title">Filters</span>
        <div className="filter-panel-actions">
          <button className="filter-reset-btn" onClick={clearAll}>Clear all</button>
          <button className="filter-close-btn" onClick={onClose}><X size={11} /></button>
        </div>
      </div>

      <FilterSection
        title="Project"
        items={projects.map(p => ({ id: p.id, label: p.name }))}
        active={filters.projects || []}
        onToggle={v => toggleArr('projects', v)}
        onSelectAll={() => setAll('projects', projects.map(p => p.id))}
        onClearAll={() => setAll('projects', [])}
      />
      <FilterSection
        title="Asset"
        items={assets.map(a => ({ id: a.id, label: a.name }))}
        active={filters.assets || []}
        onToggle={v => toggleArr('assets', v)}
        onSelectAll={() => setAll('assets', assets.map(a => a.id))}
        onClearAll={() => setAll('assets', [])}
      />
      <FilterSection
        title="Type"
        items={TYPES}
        active={filters.types || []}
        onToggle={v => toggleArr('types', v)}
        onSelectAll={() => setAll('types', TYPES.map(t => t.id))}
        onClearAll={() => setAll('types', [])}
      />
      <FilterSection
        title="Status"
        items={STATUSES}
        active={filters.statuses || []}
        onToggle={v => toggleArr('statuses', v)}
        onSelectAll={() => setAll('statuses', STATUSES.map(s => s.id))}
        onClearAll={() => setAll('statuses', [])}
      />

      <div className="filter-toggles">
        <label className="filter-toggle">
          <input type="checkbox" checked={!!filters.bundledOnly}   onChange={e => onFilter(p => ({ ...p, bundledOnly: e.target.checked }))} />
          Show bundled items only
        </label>
        <label className="filter-toggle">
          <input type="checkbox" checked={!!filters.overlappingOnly} onChange={e => onFilter(p => ({ ...p, overlappingOnly: e.target.checked }))} />
          Show overlapping items only
        </label>
      </div>
    </div>
  );
}

// If any label is longer than 28 chars, use a full-width list layout instead of chips
function FilterSection({ title, items, active, onToggle, onSelectAll, onClearAll, listMode }) {
  if (!items.length) return null;
  const allSelected  = items.every(i => active.includes(i.id));
  const noneSelected = active.length === 0 || items.every(i => !active.includes(i.id));
  const useList      = listMode || items.some(i => i.label.length > 26);
  return (
    <div className="filter-section">
      <div className="filter-section-header">
        <span className="filter-section-title">
          {title}
          {active.length > 0 && (
            <span className="filter-section-count">{active.length}</span>
          )}
        </span>
        <div className="filter-section-batch">
          <button className="filter-batch-btn" onClick={onSelectAll} disabled={allSelected}>All</button>
          <button className="filter-batch-btn" onClick={onClearAll}  disabled={noneSelected}>None</button>
        </div>
      </div>

      {useList ? (
        /* Full-width row list for long names */
        <div className="filter-list">
          {items.map(item => {
            const isActive = active.includes(item.id);
            return (
              <button
                key={item.id}
                className={`filter-list-row${isActive ? ' active' : ''}`}
                onClick={() => onToggle(item.id)}
                title={item.label}
              >
                <span className="filter-list-check">
                  {isActive ? '✓' : ''}
                </span>
                <span className="filter-list-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Compact chips for short labels (types, statuses) */
        <div className="filter-chips">
          {items.map(item => {
            const isActive = active.includes(item.id);
            return (
              <button
                key={item.id}
                className={`filter-chip${isActive ? ' active' : ''}`}
                onClick={() => onToggle(item.id)}
                title={item.label}
              >
                <span className="chip-check">{isActive ? '✓' : ''}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
