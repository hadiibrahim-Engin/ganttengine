import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import {
  diffDays, parseDate,
  generateMonths, generateQuarters, generateYears,
  generateWeeks, generateDays,
} from '../utils/dateUtils';
import { assignTracks } from '../utils/overlapDetect';
import { LAYOUT, ZOOM_PRESETS } from '../config/theme';
import GanttBar from './GanttBar';
import DependencyArrows from './DependencyArrows';
import './GanttChart.css';

const { TRACK_HEIGHT, ROW_PADDING, HEADER_MONTH, HEADER_SUB } = LAYOUT;
const DEFAULT_LEFT_WIDTH = 280;
const MIN_LEFT_WIDTH = 160;
const MAX_LEFT_WIDTH = 500;

function buildRowLayouts(rowGroups) {
  let cumTop = 0;
  return rowGroups.map(group => {
    const { trackMap, numTracks } = assignTracks(group.items);
    const height = numTracks * TRACK_HEIGHT + ROW_PADDING * 2;
    const layout = { ...group, trackMap, numTracks, height, top: cumTop };
    cumTop += height;
    return layout;
  });
}

function getZoomLevel(ppd) {
  if (ppd >= ZOOM_PRESETS.day.pixelsPerDay)     return 'day';
  if (ppd >= ZOOM_PRESETS.week.pixelsPerDay)    return 'week';
  if (ppd >= ZOOM_PRESETS.month.pixelsPerDay)   return 'month';
  if (ppd >= ZOOM_PRESETS.quarter.pixelsPerDay) return 'quarter';
  return 'year';
}

export default function GanttChart({
  rowGroups, allItems, projects, assets,
  timelineStart, timelineEnd, totalDays,
  pixelsPerDay, colorMap, overlapMap,
  onSelectItem, selectedItemId,
  onBodyRef, onBodyScrollRef, onFitWidthRef, onDragEnd, snapMode,
}) {
  const headerScrollRef = useRef(null);
  const bodyRef         = useRef(null);
  const outerRef        = useRef(null);
  const prevPpdRef      = useRef(pixelsPerDay);
  const resizeDragRef   = useRef(null);

  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const totalWidth  = totalDays * pixelsPerDay;
  const zoomLevel   = getZoomLevel(pixelsPerDay);
  const showSub     = pixelsPerDay >= 3;
  const showDays    = pixelsPerDay >= 20;
  const headerHeight = HEADER_MONTH + (showSub ? HEADER_SUB : 0);

  const months   = useMemo(() => generateMonths(timelineStart, timelineEnd),  [timelineStart, timelineEnd]);
  const quarters = useMemo(() => generateQuarters(timelineStart, timelineEnd), [timelineStart, timelineEnd]);
  const years    = useMemo(() => generateYears(timelineStart, timelineEnd),   [timelineStart, timelineEnd]);
  const weeks    = useMemo(() => generateWeeks(timelineStart, timelineEnd),   [timelineStart, timelineEnd]);
  const days     = useMemo(() => generateDays(timelineStart, totalDays),      [timelineStart, totalDays]);

  const rowLayouts  = useMemo(() => buildRowLayouts(rowGroups), [rowGroups]);
  const totalHeight = useMemo(() => rowLayouts.reduce((s, r) => s + r.height, 0), [rowLayouts]);

  const projectMap = useMemo(() => new Map((projects||[]).map(p=>[p.id,p])), [projects]);
  const assetMap   = useMemo(() => new Map((assets||[]).map(a=>[a.id,a])), [assets]);

  // Position map for dependency arrows
  const itemPositions = useMemo(() => {
    const pos = {};
    rowLayouts.forEach(row => {
      row.items.forEach(item => {
        const ti       = row.trackMap.get(item.id) ?? 0;
        const startD   = diffDays(timelineStart, parseDate(item.start));
        const endD     = diffDays(timelineStart, parseDate(item.end));
        const leftPx   = startD * pixelsPerDay;
        const rightPx  = item.start === item.end ? leftPx + LAYOUT.DIAMOND_SIZE : (endD + 1) * pixelsPerDay;
        const centerY  = row.top + ROW_PADDING + ti * TRACK_HEIGHT + TRACK_HEIGHT / 2;
        pos[item.id] = { left: leftPx, right: rightPx, centerY };
      });
    });
    return pos;
  }, [rowLayouts, timelineStart, pixelsPerDay]);

  // Sync header with body horizontal scroll
  const handleBodyScroll = useCallback(() => {
    if (headerScrollRef.current && bodyRef.current) {
      headerScrollRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  }, []);

  // Preserve scroll center when fine-zooming (preset changes are handled by App.jsx)
  useEffect(() => {
    const prevPpd = prevPpdRef.current;
    if (prevPpd === pixelsPerDay) { prevPpdRef.current = pixelsPerDay; return; }
    const body = bodyRef.current;
    if (!body) { prevPpdRef.current = pixelsPerDay; return; }

    // Capture center day BEFORE updating the ref (we still need prevPpd)
    const visCenter = body.scrollLeft + body.clientWidth / 2;
    const centerDay = visCenter / prevPpd;
    prevPpdRef.current = pixelsPerDay;

    requestAnimationFrame(() => {
      if (!body) return;
      body.scrollLeft = Math.max(0, centerDay * pixelsPerDay - body.clientWidth / 2);
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = body.scrollLeft;
      }
    });
  }, [pixelsPerDay]);

  useEffect(() => { if (onBodyRef) onBodyRef(outerRef); }, [onBodyRef]);
  useEffect(() => { if (onBodyScrollRef) onBodyScrollRef(bodyRef); }, [onBodyScrollRef]);

  useEffect(() => {
    if (!onFitWidthRef || !outerRef.current) return;
    const obs = new ResizeObserver(() => {
      const w = (outerRef.current?.clientWidth || 0) - leftWidth;
      if (w > 0) onFitWidthRef(w);
    });
    obs.observe(outerRef.current);
    return () => obs.disconnect();
  }, [onFitWidthRef, leftWidth]);

  const todayOffset = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    if (today < timelineStart || today > timelineEnd) return null;
    return diffDays(timelineStart, today) * pixelsPerDay;
  }, [timelineStart, timelineEnd, pixelsPerDay]);

  // Scroll helpers exposed to buttons and parent
  const scrollStep = useCallback((direction) => {
    const body = bodyRef.current;
    if (!body) return;
    body.scrollLeft += direction * body.clientWidth * 0.6;
  }, []);

  const scrollToToday = useCallback(() => {
    const body = bodyRef.current;
    if (!body || todayOffset === null) return;
    body.scrollLeft = Math.max(0, todayOffset - body.clientWidth / 2);
  }, [todayOffset]);

  const scrollToStart = useCallback(() => {
    if (bodyRef.current) bodyRef.current.scrollLeft = 0;
  }, []);

  // Resizable left column
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeDragRef.current = { startX: e.clientX, startWidth: leftWidth };
    const move = (e) => {
      if (!resizeDragRef.current) return;
      const delta = e.clientX - resizeDragRef.current.startX;
      setLeftWidth(Math.max(MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, resizeDragRef.current.startWidth + delta)));
    };
    const up = () => {
      setIsResizing(false);
      resizeDragRef.current = null;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [leftWidth]);

  const bandProps = useCallback((startDate, endDate) => {
    const sOff = Math.max(0, diffDays(timelineStart, startDate));
    const eOff = Math.min(totalDays - 1, diffDays(timelineStart, endDate));
    return { left: sOff * pixelsPerDay, width: (eOff - sOff + 1) * pixelsPerDay };
  }, [timelineStart, totalDays, pixelsPerDay]);

  // Choose which units to show in top header row
  const topUnits = zoomLevel === 'year' ? years : zoomLevel === 'quarter' ? quarters : months;

  return (
    <div className="gantt-outer" ref={outerRef}>

      {/* ── Sticky Header ── */}
      <div className="gantt-header-row" style={{ height: headerHeight }}>
        <div className="gantt-corner" style={{ width: leftWidth, height: headerHeight }}>
          <span className="corner-label">Asset / Group</span>
        </div>

        <div ref={headerScrollRef} className="gantt-header-scroll">
          <div className="gantt-header-inner" style={{ width: totalWidth, height: headerHeight }}>

            {/* Month / Quarter / Year band */}
            <div className="timeline-row" style={{ height: HEADER_MONTH }}>
              {topUnits.map((u, i) => {
                const { left, width } = bandProps(u.startDate, u.endDate);
                const label = width < 44 ? '' : width < 90
                  ? (u.tinyLabel || u.shortLabel || u.label).slice(0, 6)
                  : width < 160 ? (u.shortLabel || u.label)
                  : u.label;
                return (
                  <div key={i} className={`timeline-cell month-cell ${zoomLevel}`} style={{ left, width }}>
                    {label}
                  </div>
                );
              })}
            </div>

            {/* Week / Day band */}
            {showSub && (
              <div className="timeline-row" style={{ height: HEADER_SUB }}>
                {showDays
                  ? days.map((d, i) => (
                      <div
                        key={i}
                        className={`timeline-cell day-cell${d.isWeekend ? ' weekend' : ''}`}
                        style={{ left: i * pixelsPerDay, width: pixelsPerDay }}
                      >
                        {pixelsPerDay > 20 ? d.label : ''}
                      </div>
                    ))
                  : weeks.map((w, i) => {
                      const { left, width } = bandProps(w.startDate, w.endDate);
                      return (
                        <div key={i} className="timeline-cell week-cell" style={{ left, width }}>
                          {width > 22 ? `CW${w.isoWeek}` : ''}
                        </div>
                      );
                    })
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div ref={bodyRef} className="gantt-body" onScroll={handleBodyScroll}>

        {/* Sticky left label column */}
        <div className="gantt-left-col" style={{ width: leftWidth }}>
          <AnimatePresence mode="popLayout">
            {rowLayouts.map(row => (
              <motion.div
                key={row.id}
                className="row-label-cell"
                style={{ height: row.height }}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                title={row.label}
              >
                <div className="row-label-primary">{row.label}</div>
                {row.sublabel && <div className="row-label-secondary">{row.sublabel}</div>}
                <div className="row-item-count">
                  {row.items.length} item{row.items.length !== 1 ? 's' : ''}
                  {row.numTracks > 1 && (
                    <span className="row-overlap-badge">{row.numTracks} tracks</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Column resize handle */}
          <div
            className={`col-resize-handle${isResizing ? ' resizing' : ''}`}
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          />
        </div>

        {/* Chart area – explicit dimensions for scroll */}
        <div
          className="gantt-chart-area"
          style={{ width: totalWidth, height: Math.max(totalHeight, 120) }}
        >
          {/* Grid layer */}
          <div className="gantt-grid-layer" style={{ height: Math.max(totalHeight, 120) }}>
            {/* Alternating row tint */}
            {rowLayouts.map((row, i) => i % 2 === 1 && (
              <div key={i} className="grid-row-even" style={{ top: row.top, height: row.height }} />
            ))}
            {months.map((m, i) => {
              const off = Math.max(0, diffDays(timelineStart, m.startDate)) * pixelsPerDay;
              return <div key={i} className="grid-month-line" style={{ left: off }} />;
            })}
            {showDays && days.map((d, i) => d.isWeekend && (
              <div key={i} className="grid-weekend-col" style={{ left: i * pixelsPerDay, width: pixelsPerDay }} />
            ))}
            {rowLayouts.map((row, i) => (
              <div key={i} className="grid-row-line" style={{ top: row.top + row.height }} />
            ))}
            {todayOffset !== null && (
              <div className="grid-today-line" style={{ left: todayOffset }}>
                <div className="today-label">Today</div>
              </div>
            )}
          </div>

          {/* Dependency arrows */}
          {allItems?.some(i => i.dependsOn?.length > 0) && (
            <DependencyArrows
              allItems={allItems}
              itemPositions={itemPositions}
              totalHeight={Math.max(totalHeight, 120)}
              totalWidth={totalWidth}
            />
          )}

          {/* Rows */}
          <AnimatePresence mode="popLayout">
            {rowLayouts.length === 0 ? (
              <div className="gantt-empty">
                <div className="gantt-empty-icon">🔍</div>
                <div className="gantt-empty-text">No items match your filters</div>
              </div>
            ) : (
              rowLayouts.map((row, ri) => (
                <motion.div
                  key={row.id}
                  className="gantt-row"
                  style={{ height: row.height, top: row.top }}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(ri * 0.015, 0.2) }}
                >
                  {/* Overlap zone indicators */}
                  {row.numTracks > 1 && (
                    <OverlapZones row={row} timelineStart={timelineStart} pixelsPerDay={pixelsPerDay} />
                  )}

                  {row.items.map((item, ii) => {
                    const ti        = row.trackMap.get(item.id) ?? 0;
                    const startDate = parseDate(item.start);
                    const endDate   = parseDate(item.end);
                    const hasDate   = startDate !== null && endDate !== null;

                    // Items with no valid date span the full timeline as a gray placeholder
                    const startD = hasDate ? diffDays(timelineStart, startDate) : 0;
                    const endD   = hasDate ? diffDays(timelineStart, endDate)   : totalDays - 1;
                    const leftPx = startD * pixelsPerDay;
                    const wPx    = hasDate
                      ? (item.start === item.end ? 0 : (endD - startD + 1) * pixelsPerDay)
                      : totalDays * pixelsPerDay;

                    return (
                      <GanttBar
                        key={item.id}
                        item={item}
                        left={leftPx}
                        width={wPx}
                        trackIndex={ti}
                        projectName={projectMap.get(item.projectId)?.name}
                        assetName={assetMap.get(item.assetId)?.name}
                        overlapCount={(overlapMap?.get(item.id)||[]).length}
                        isSelected={selectedItemId === item.id}
                        onClick={() => onSelectItem(item)}
                        animDelay={Math.min(ri * 0.04 + ii * 0.04, 0.5)}
                        pixelsPerDay={pixelsPerDay}
                        snapMode={snapMode}
                        onDragEnd={onDragEnd}
                        color={colorMap[item.projectId]}
                        noDate={!hasDate}
                      />
                    );
                  })}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Floating scroll navigation ── */}
      <div className="gantt-scroll-nav">
        <button className="gantt-scroll-btn" onClick={scrollToStart} title="Go to beginning">
          <span className="scroll-btn-bar">|</span>
          <ChevronLeft size={14} />
        </button>
        <button className="gantt-scroll-btn" onClick={() => scrollStep(-1)} title="Scroll left">
          <ChevronLeft size={15} />
        </button>
        {todayOffset !== null && (
          <button className="gantt-scroll-btn gantt-scroll-today" onClick={scrollToToday} title="Jump to today">
            <CalendarClock size={13} />
            <span>Today</span>
          </button>
        )}
        <button className="gantt-scroll-btn" onClick={() => scrollStep(1)} title="Scroll right">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function OverlapZones({ row, timelineStart, pixelsPerDay }) {
  const zones = useMemo(() => {
    if (row.numTracks < 2) return [];
    const result = [];
    const items = row.items;
    const seen = new Set();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (a.start <= b.end && b.start <= a.end) {
          const os = a.start > b.start ? a.start : b.start;
          const oe = a.end   < b.end   ? a.end   : b.end;
          const key = `${os}-${oe}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const sd = diffDays(timelineStart, parseDate(os));
          const ed = diffDays(timelineStart, parseDate(oe));
          result.push({ left: sd * pixelsPerDay, width: (ed - sd + 1) * pixelsPerDay, key });
        }
      }
    }
    return result.slice(0, 15);
  }, [row, timelineStart, pixelsPerDay]);

  return <>
    {zones.map(z => (
      <div key={z.key} className="overlap-zone" style={{ left: z.left, width: z.width, height: row.height }} />
    ))}
  </>;
}
