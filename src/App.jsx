import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

import { createColorMap } from './utils/colorUtils';
import { parseDate, diffDays } from './utils/dateUtils';
import { detectOverlaps }     from './utils/overlapDetect';
import { applyBundleMove }    from './utils/bundleLogic';
import {
  createMoveEntry, createAddEntry, createUpdateEntry,
  createDeleteEntry, pushHistory,
} from './utils/historyTracker';

import { demoData }    from './data/demoData';
import StartPage    from './components/StartPage';
import GanttChart   from './components/GanttChart';
import Toolbar      from './components/Toolbar';
import SidePanel    from './components/SidePanel';
import HistoryPanel from './components/HistoryPanel';
import AddItemModal from './components/AddItemModal';

import './App.css';

const MAX_UNDO = 50;
const DEFAULT_PIXELS_PER_DAY = 20;

// Build row groups from items based on grouping mode.
function buildRowGroups(items, assets, projects, groupMode) {
  const groups = new Map();

  const getOrCreate = (key, label, sublabel) => {
    if (!groups.has(key)) groups.set(key, { id: key, label, sublabel, items: [] });
    return groups.get(key);
  };

  for (const item of items) {
    switch (groupMode) {
      case 'asset': {
        const asset = assets?.find(a => a.id === item.assetId);
        const key   = item.assetId || '_no_asset';
        const label = asset?.name || 'No Asset';
        const sub   = asset?.type || '';
        getOrCreate(key, label, sub).items.push(item);
        break;
      }
      case 'project': {
        const proj = projects?.find(p => p.id === item.projectId);
        const key  = item.projectId || '_no_project';
        getOrCreate(key, proj?.name || 'No Project', proj?.department || '').items.push(item);
        break;
      }
      case 'department': {
        const key = item.department || 'Other';
        getOrCreate(key, key, '').items.push(item);
        break;
      }
      case 'owner': {
        const key = item.owner || 'Unassigned';
        getOrCreate(key, key, '').items.push(item);
        break;
      }
      case 'status': {
        const key = item.status || 'Unknown';
        getOrCreate(key, key, '').items.push(item);
        break;
      }
      default: {
        const asset = assets?.find(a => a.id === item.assetId);
        const key   = item.assetId || '_no_asset';
        getOrCreate(key, asset?.name || 'No Asset', asset?.type || '').items.push(item);
      }
    }
  }

  return Array.from(groups.values()).filter(g => g.items.length > 0);
}

export default function App() {
  const [ganttData, setGanttData] = useState(null);
  const [error,     setError]     = useState(null);

  // UI state
  const [isDark,          setIsDark]          = useState(true);
  const [selectedItemId,  setSelectedItemId]  = useState(null);
  const [showHistory,     setShowHistory]     = useState(false);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [addDefaults,     setAddDefaults]     = useState(null);

  // View config
  const [groupBy,     setGroupBy]     = useState('asset');
  const [pixelsPerDay, setPixelsPerDay] = useState(DEFAULT_PIXELS_PER_DAY);
  const [snapMode,    setSnapMode]    = useState('day');

  // Filters
  const [filters,      setFilters]      = useState({ projects: [], assets: [], types: [], statuses: [], owners: [], departments: [], bundledOnly: false, overlappingOnly: false });
  const [searchQuery,  setSearchQuery]  = useState('');

  // History / undo-redo
  const [changeHistory, setChangeHistory] = useState([]);
  const [undoStack,     setUndoStack]     = useState([]);
  const [redoStack,     setRedoStack]     = useState([]);

  const chartRef      = useRef(null);
  const fitWidthRef   = useRef(null);
  const ganttBodyRef  = useRef(null); // direct ref to the scrollable body inside GanttChart

  // Theme — use .dark class (matches provided CSS spec)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Keep the browser Back button from leaving or rewinding the current planner view.
  useEffect(() => {
    const guardKey = '__ganttToolHistoryGuard';
    const pushGuard = () => {
      window.history.pushState({ ...(window.history.state || {}), [guardKey]: true }, '', window.location.href);
    };

    if (!window.history.state?.[guardKey]) pushGuard();

    const handlePopState = () => {
      pushGuard();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auto-scroll to the first item (or today if in range) whenever data loads
  useEffect(() => {
    if (!ganttData?.items?.length) return;
    // Wait two frames so the chart has painted with the new totalWidth
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      const body = ganttBodyRef.current;
      if (!body) return;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (today >= timelineStart && today <= timelineEnd) {
        // Today is in range — show today in the left third of the screen
        const todayPx = diffDays(timelineStart, today) * pixelsPerDay;
        body.scrollLeft = Math.max(0, todayPx - body.clientWidth / 4);
      } else {
        // Data is past or future — start at the very first item
        body.scrollLeft = 0;
      }
    }));
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganttData]); // only re-run when data changes, not on every zoom/filter

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
      if (e.key === 'Escape') { setSelectedItemId(null); setShowHistory(false); setShowAddModal(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Data load ────────────────────────────────────────────────────
  const handleData = useCallback((raw) => {
    if (raw === 'demo') {
      setGanttData(demoData);
    } else if (raw === 'new') {
      setGanttData({ projects: [], assets: [], items: [], dependencies: [] });
      setShowAddModal(true);
    } else {
      setGanttData(raw);
    }
    setError(null);
    setSelectedItemId(null);
    setSearchQuery('');
    setFilters({ projects: [], assets: [], types: [], statuses: [], owners: [], departments: [], bundledOnly: false, overlappingOnly: false });
    setUndoStack([]);
    setRedoStack([]);
    setChangeHistory([]);
  }, []);

  // ── Undo / Redo ──────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    setUndoStack(stack => {
      if (!stack.length) return stack;
      const prev = stack[stack.length - 1];
      setRedoStack(rs => [...rs, ganttData]);
      setGanttData(prev);
      return stack.slice(0, -1);
    });
  }, [ganttData]);

  const handleRedo = useCallback(() => {
    setRedoStack(stack => {
      if (!stack.length) return stack;
      const next = stack[stack.length - 1];
      setUndoStack(us => [...us.slice(-(MAX_UNDO - 1)), ganttData]);
      setGanttData(next);
      return stack.slice(0, -1);
    });
  }, [ganttData]);

  const pushUndo = useCallback(() => {
    setUndoStack(s => [...s.slice(-(MAX_UNDO - 1)), ganttData]);
    setRedoStack([]);
  }, [ganttData]);

  // ── Item drag / move ─────────────────────────────────────────────
  const handleDragEnd = useCallback((item, deltaDays) => {
    if (!ganttData) return;
    pushUndo();

    const affectedIds = new Set();
    const newItems = applyBundleMove(ganttData.items, item.id, deltaDays);

    // Collect affected item IDs
    newItems.forEach((ni, idx) => {
      if (ni.start !== ganttData.items[idx]?.start) affectedIds.add(ni.id);
    });

    const entry = createMoveEntry({
      items: ganttData.items,
      movedId: item.id,
      deltaDays,
      bundleId: item.bundleId,
      affectedIds,
    });

    setChangeHistory(h => pushHistory(h, entry));
    setGanttData(prev => ({ ...prev, items: newItems }));
  }, [ganttData, pushUndo]);

  // ── Add item / project / asset ───────────────────────────────────
  const handleAdd = useCallback((type, payload) => {
    if (!ganttData) return;
    pushUndo();

    if (type === 'item') {
      const entry = createAddEntry({ item: payload });
      setChangeHistory(h => pushHistory(h, entry));
      setGanttData(prev => ({ ...prev, items: [...prev.items, payload] }));
    } else if (type === 'project') {
      setGanttData(prev => ({ ...prev, projects: [...prev.projects, payload] }));
    } else if (type === 'asset') {
      setGanttData(prev => ({ ...prev, assets: [...prev.assets, payload] }));
    }

    setShowAddModal(false);
  }, [ganttData, pushUndo]);

  // ── Update item ──────────────────────────────────────────────────
  const handleUpdate = useCallback((updatedItem) => {
    if (!ganttData) return;
    pushUndo();

    const original = ganttData.items.find(i => i.id === updatedItem.id);
    const changes  = [];
    for (const key of ['title', 'status', 'start', 'end', 'notes', 'projectId', 'assetId']) {
      if (original?.[key] !== updatedItem[key]) {
        changes.push({ field: key, oldValue: original?.[key], newValue: updatedItem[key] });
      }
    }

    const entry = createUpdateEntry({ itemId: updatedItem.id, title: updatedItem.title, changes });
    setChangeHistory(h => pushHistory(h, entry));
    setGanttData(prev => ({ ...prev, items: prev.items.map(i => i.id === updatedItem.id ? updatedItem : i) }));
    setSelectedItemId(updatedItem.id);
  }, [ganttData, pushUndo]);

  // ── Delete item ──────────────────────────────────────────────────
  const handleDelete = useCallback((item) => {
    if (!ganttData) return;
    pushUndo();

    const entry = createDeleteEntry({ item });
    setChangeHistory(h => pushHistory(h, entry));
    setGanttData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }));
    setSelectedItemId(null);
  }, [ganttData, pushUndo]);

  // ── Derived data ─────────────────────────────────────────────────
  const colorMap = useMemo(() => {
    if (!ganttData) return {};
    return createColorMap(ganttData.projects.map(p => p.id));
  }, [ganttData]);

  const processedItems = useMemo(() => {
    if (!ganttData) return [];
    // Keep ALL items — ones without valid dates will be rendered as full-width gray bars
    let items = [...ganttData.items];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const projectMap = new Map(ganttData.projects.map(p => [p.id, p]));
      const assetMap   = new Map(ganttData.assets.map(a => [a.id, a]));
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        projectMap.get(i.projectId)?.name.toLowerCase().includes(q) ||
        assetMap.get(i.assetId)?.name.toLowerCase().includes(q) ||
        i.owner?.toLowerCase().includes(q) ||
        i.department?.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filters.projects?.length)    items = items.filter(i => filters.projects.includes(i.projectId));
    if (filters.assets?.length)      items = items.filter(i => filters.assets.includes(i.assetId));
    if (filters.types?.length)       items = items.filter(i => filters.types.includes(i.type));
    if (filters.statuses?.length)    items = items.filter(i => filters.statuses.includes(i.status));
    if (filters.owners?.length)      items = items.filter(i => filters.owners.includes(i.owner));
    if (filters.departments?.length) items = items.filter(i => filters.departments.includes(i.department));
    if (filters.bundledOnly)         items = items.filter(i => !!i.bundleId);

    return items;
  }, [ganttData, searchQuery, filters]);

  // Overlap map for the processed items, keyed by asset/project group
  const overlapMap = useMemo(() => {
    if (!ganttData) return new Map();
    const getKey = (item) => {
      switch (groupBy) {
        case 'project':    return item.projectId    || '_';
        case 'department': return item.department   || '_';
        case 'owner':      return item.owner        || '_';
        default:           return item.assetId      || '_';
      }
    };
    return detectOverlaps(processedItems, getKey);
  }, [processedItems, groupBy, ganttData]);

  // Filter overlapping-only after computing overlap map
  const filteredItems = useMemo(() => {
    if (!filters.overlappingOnly) return processedItems;
    return processedItems.filter(i => (overlapMap.get(i.id) || []).length > 0);
  }, [processedItems, overlapMap, filters.overlappingOnly]);

  const rowGroups = useMemo(() => {
    if (!ganttData) return [];
    return buildRowGroups(filteredItems, ganttData.assets, ganttData.projects, groupBy);
  }, [filteredItems, ganttData, groupBy]);

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const fallback = () => {
      const now = new Date();
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 5, 0);
      return { timelineStart: s, timelineEnd: e, totalDays: diffDays(s, e) + 1 };
    };

    const allItems = ganttData?.items || [];
    if (!allItems.length) return fallback();

    // Only consider items that have valid, parseable dates
    const validDates = allItems
      .flatMap(i => [parseDate(i.start), parseDate(i.end)])
      .filter(d => d !== null);

    if (!validDates.length) return fallback();

    const minTs = Math.min(...validDates.map(d => d.getTime()));
    const maxTs = Math.max(...validDates.map(d => d.getTime()));
    if (isNaN(minTs) || isNaN(maxTs)) return fallback();

    const minDate = new Date(minTs);
    const maxDate = new Date(maxTs);
    const s = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate() - 7);
    const e = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate() + 7);
    return { timelineStart: s, timelineEnd: e, totalDays: diffDays(s, e) + 1 };
  }, [ganttData]);

  const handleZoomFit = useCallback(() => {
    const w = fitWidthRef.current;
    if (w && totalDays > 0) setPixelsPerDay(Math.max(0.3, w / totalDays));
  }, [totalDays]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId || !ganttData) return null;
    return ganttData.items.find(i => i.id === selectedItemId) || null;
  }, [selectedItemId, ganttData]);

  const itemCount   = ganttData?.items?.length || 0;
  const assetCount  = ganttData?.assets?.length || 0;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">
            <BarChart3 size={16} color="white" />
          </div>
          <div>
            <div className="header-title">Gantt Planning Tool</div>
            {ganttData && (
              <div className="header-sub">
                {itemCount} items · {assetCount} assets
                {ganttData.projects?.length > 0 && ` · ${ganttData.projects.length} projects`}
              </div>
            )}
          </div>
        </div>
        <div className="header-right">
          {ganttData && (
            <button
              className="header-clear-btn"
              onClick={() => { setGanttData(null); setSelectedItemId(null); }}
              title="Clear workspace"
            >
              Clear workspace
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="app-error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      )}

      <main className="app-main">
        {/* Toolbar sits OUTSIDE the overflow-hidden chart area so its
            dropdowns are never clipped by the chart's scroll container */}
        {ganttData && (
          <Toolbar
            ganttData={ganttData}
            pixelsPerDay={pixelsPerDay}
            onZoom={setPixelsPerDay}
            onZoomReset={() => { setPixelsPerDay(DEFAULT_PIXELS_PER_DAY); }}
            onZoomFit={handleZoomFit}
            snapMode={snapMode}
            onSnapMode={setSnapMode}
            groupBy={groupBy}
            onGroupBy={setGroupBy}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            filters={filters}
            onFilter={setFilters}
            isDark={isDark}
            onToggleDark={() => setIsDark(d => !d)}
            canUndo={undoStack.length > 0}
            onUndo={handleUndo}
            canRedo={redoStack.length > 0}
            onRedo={handleRedo}
            onData={handleData}
            onError={setError}
            onAddItem={() => { setAddDefaults(null); setShowAddModal(true); }}
            onShowHistory={() => setShowHistory(s => !s)}
            chartRef={chartRef}
          />
        )}

        {/* Chart area is separately overflow-hidden */}
        <div className="app-chart-area">
          <AnimatePresence mode="wait">
            {!ganttData ? (
              <motion.div
                key="start"
                style={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <StartPage onData={handleData} onError={setError} />
              </motion.div>
            ) : (
              <motion.div
                key="chart"
                style={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <GanttChart
                  rowGroups={rowGroups}
                  allItems={filteredItems}
                  projects={ganttData.projects}
                  assets={ganttData.assets}
                  timelineStart={timelineStart}
                  timelineEnd={timelineEnd}
                  totalDays={totalDays}
                  pixelsPerDay={pixelsPerDay}
                  colorMap={colorMap}
                  overlapMap={overlapMap}
                  onSelectItem={(item) => setSelectedItemId(item.id)}
                  selectedItemId={selectedItemId}
                  onBodyRef={(ref) => { chartRef.current = ref.current; }}
                  onBodyScrollRef={(ref) => { ganttBodyRef.current = ref.current; }}
                  onFitWidthRef={(w) => { fitWidthRef.current = w; }}
                  onDragEnd={handleDragEnd}
                  snapMode={snapMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {selectedItem && (
            <SidePanel
              key="side"
              item={selectedItem}
              ganttData={ganttData}
              changeHistory={changeHistory}
              colorMap={colorMap}
              onClose={() => setSelectedItemId(null)}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          )}
        </AnimatePresence>

        {/* History panel */}
        <AnimatePresence>
          {showHistory && (
            <HistoryPanel
              key="history"
              history={changeHistory}
              onClose={() => setShowHistory(false)}
              onUndo={handleUndo}
              canUndo={undoStack.length > 0}
            />
          )}
        </AnimatePresence>

        {/* Add item modal */}
        <AnimatePresence>
          {showAddModal && (
            <AddItemModal
              key="add-modal"
              projects={ganttData?.projects || []}
              assets={ganttData?.assets || []}
              onAdd={handleAdd}
              onClose={() => setShowAddModal(false)}
              defaults={addDefaults}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
