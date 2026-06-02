import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2 } from 'lucide-react';
import { formatDateShort, getDuration, snapDelta } from '../utils/dateUtils';
import { ITEM_TYPE_CONFIG, STATUS_CONFIG, LAYOUT } from '../config/theme';
import StatusBadge from './StatusBadge';
import './GanttBar.css';

const { BAR_HEIGHT, TRACK_HEIGHT, DIAMOND_SIZE, ROW_PADDING } = LAYOUT;

function Tooltip({ item, projectName, assetName, overlapCount, pos, isDragging, previewDays, pixelsPerDay }) {
  const cfg = ITEM_TYPE_CONFIG[item.type] || ITEM_TYPE_CONFIG.Task;
  const tooltipRef = useRef(null);
  const [placement, setPlacement] = useState({
    left: pos.x + 14,
    top: pos.y - 14,
  });

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;

    const gap = 14;
    const margin = 12;
    const rect = el.getBoundingClientRect();

    let left = pos.x + gap;
    if (left + rect.width > window.innerWidth - margin) {
      left = pos.x - rect.width - gap;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));

    let top = pos.y - gap;
    if (top + rect.height > window.innerHeight - margin) {
      top = pos.y - rect.height - gap;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));

    setPlacement({ left, top });
  }, [pos.x, pos.y, item.id, isDragging, previewDays, overlapCount]);

  return (
    <motion.div
      ref={tooltipRef}
      className="bar-tooltip"
      style={placement}
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
    >
      <div className="tooltip-type-row">
        <span className="tooltip-type-dot" style={{ background: cfg.color }} />
        <span className="tooltip-type">{cfg.label}</span>
        {item.bundleId && (
          <span className="tooltip-bundle"><Link2 size={9} /> {item.bundleId}</span>
        )}
      </div>
      <div className="tooltip-title">{item.title}</div>
      {projectName && <div className="tooltip-meta">{projectName}</div>}
      {assetName   && <div className="tooltip-meta">{assetName}</div>}

      <div className="tooltip-dates">
        <span style={{ color: isDragging ? '#A78BFA' : undefined }}>
          {formatDateShort(new Date(item.start + 'T00:00:00'))}
        </span>
        {item.start !== item.end && (
          <>
            <span style={{ color: 'var(--text-muted)' }}>→</span>
            <span style={{ color: isDragging ? '#A78BFA' : undefined }}>
              {formatDateShort(new Date(item.end + 'T00:00:00'))}
            </span>
          </>
        )}
      </div>

      {isDragging && previewDays !== 0 && (
        <div className="tooltip-drag-delta">
          {previewDays > 0 ? '+' : ''}{previewDays} days
        </div>
      )}

      {overlapCount > 0 && !isDragging && (
        <div className="tooltip-overlap">
          overlaps with {overlapCount} other item{overlapCount > 1 ? 's' : ''}
        </div>
      )}

      {!isDragging && <div className="tooltip-hint">Drag to reschedule · Click for details</div>}
    </motion.div>
  );
}

export default function GanttBar({
  item, left, width, trackIndex,
  projectName, assetName, overlapCount,
  isSelected, onClick, animDelay,
  pixelsPerDay, snapMode, onDragEnd,
  noDate,
  totalChartWidth,
}) {
  const cfg        = ITEM_TYPE_CONFIG[item.type] || ITEM_TYPE_CONFIG.Task;
  const isMilestone = item.type === 'Milestone';
  const isOoO       = item.type === 'OutOfOperation';
  const isBiO       = item.type === 'BackInOperation';

  const [hovered,    setHovered]    = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta,  setDragDelta]  = useState(0);
  const [mousePos,   setMousePos]   = useState({ x: 0, y: 0 });

  const wrapRef  = useRef(null);
  const rafRef   = useRef(null);
  const dragRef  = useRef(null);

  const topOffset = LAYOUT.ROW_PADDING + trackIndex * TRACK_HEIGHT + (TRACK_HEIGHT - BAR_HEIGHT) / 2;

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, hasMoved: false };
    setDragDelta(0);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    if (!dragRef.current.hasMoved && Math.abs(dx) > 5) {
      dragRef.current.hasMoved = true;
      setIsDragging(true);
      setHovered(false);
    }
    if (!dragRef.current.hasMoved) return;
    setDragDelta(dx);
    if (wrapRef.current) {
      wrapRef.current.style.setProperty('--dx', `${dx}px`);
    }
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (!dragRef.current) return;
    const { hasMoved } = dragRef.current;
    dragRef.current = null;

    if (!hasMoved) {
      setIsDragging(false);
      onClick?.();
      return;
    }

    const rawDx = parseFloat(wrapRef.current?.style.getPropertyValue('--dx') || '0');
    const rawDays = rawDx / (pixelsPerDay || 1);
    const deltaDays = snapDelta(rawDays, snapMode, item.start);

    if (wrapRef.current) wrapRef.current.style.setProperty('--dx', '0px');
    setIsDragging(false);
    setDragDelta(0);

    if (deltaDays !== 0) onDragEnd?.(item, deltaDays);
  }, [pixelsPerDay, snapMode, item, onDragEnd, onClick]);

  const handlePointerCancel = useCallback(() => {
    dragRef.current = null;
    if (wrapRef.current) wrapRef.current.style.setProperty('--dx', '0px');
    setIsDragging(false);
    setDragDelta(0);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setMousePos({ x: e.clientX, y: e.clientY });
    });
  }, []);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const previewDays = Math.round(dragDelta / (pixelsPerDay || 1));
  const overlapHighlight = overlapCount > 0 && !isDragging;

  // ── No-date placeholder: gray bar spanning full timeline ─────────
  if (noDate) {
    return (
      <motion.div
        className="gantt-bar-wrap no-date-wrap"
        style={{ left, width, top: topOffset, height: BAR_HEIGHT }}
        title={`${item.title} — no dates set`}
        onClick={onClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: animDelay }}
      >
        <div className="gantt-bar no-date-bar">
          <div className="bar-content">
            <span className="bar-label no-date-label">
              {item.title}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Milestone (diamond) ──────────────────────────────────────────
  if (isMilestone) {
    const cx = left;
    const cy = topOffset + BAR_HEIGHT / 2;
    return (
      <>
        <motion.div
          ref={wrapRef}
          className={`ms-wrap${isDragging ? ' is-dragging' : ''}`}
          style={{
            left: cx - DIAMOND_SIZE / 2,
            top: cy - DIAMOND_SIZE / 2,
            '--dx': '0px',
            transform: 'translateX(var(--dx, 0px))',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: animDelay, type: 'spring', stiffness: 280, damping: 18 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onMouseEnter={() => !isDragging && setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onMouseMove={handleMouseMove}
        >
          <div
            className={`ms-diamond${isSelected ? ' selected' : ''}`}
            style={{
              background: cfg.gradient,
              boxShadow: isSelected
                ? `0 0 0 2px white, 0 4px 16px ${cfg.glow}`
                : `0 2px 12px ${cfg.glow}`,
            }}
          />
          {item.bundleId && <span className="bar-bundle-dot" />}
        </motion.div>

        <AnimatePresence>
          {(hovered || isDragging) && (
            <Tooltip
              item={item}
              projectName={projectName}
              assetName={assetName}
              overlapCount={overlapCount}
              pos={mousePos}
              isDragging={isDragging}
              previewDays={previewDays}
              pixelsPerDay={pixelsPerDay}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Regular bar ──────────────────────────────────────────────────
  return (
    <>
      <motion.div
        ref={wrapRef}
        className={`gantt-bar-wrap${isDragging ? ' is-dragging' : ''}${overlapHighlight ? ' has-overlap' : ''}`}
        style={{
          left,
          top: topOffset,
          width,
          '--dx': '0px',
          transform: 'translateX(var(--dx, 0px))',
          transformOrigin: 'left center',
        }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: animDelay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMouseEnter={() => !isDragging && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Drag delta badge */}
        {isDragging && previewDays !== 0 && (
          <div className="drag-badge">{previewDays > 0 ? '+' : ''}{previewDays}d</div>
        )}

        <div
          className={`gantt-bar type-${item.type.toLowerCase()}${isSelected ? ' selected' : ''}${isBiO ? ' bio' : ''}`}
          style={{
            height: BAR_HEIGHT,
            background: isOoO ? undefined : cfg.gradient,
            boxShadow: isDragging
              ? `0 8px 32px ${cfg.glow}, 0 0 0 2px ${cfg.color}`
              : hovered || isSelected
              ? `0 4px 20px ${cfg.glow}`
              : `0 2px 8px ${cfg.glow}60`,
          }}
        >
          {/* Shine overlay */}
          <div className="bar-shine" />

          {/* Out-of-operation stripe pattern */}
          {isOoO && <div className="bar-stripe" style={{ '--stripe-color': cfg.color }} />}

          {/* Content */}
          <div className="bar-content" style={{ maxWidth: width - 28 }}>
            {width > 40 && (
              <span className="bar-label">{item.title}</span>
            )}
          </div>

          {/* Bundle icon */}
          {item.bundleId && width > 24 && (
            <div className="bar-bundle-icon"><Link2 size={9} /></div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {(hovered || isDragging) && (
          <Tooltip
            item={item}
            projectName={projectName}
            assetName={assetName}
            overlapCount={overlapCount}
            pos={mousePos}
            isDragging={isDragging}
            previewDays={previewDays}
            pixelsPerDay={pixelsPerDay}
          />
        )}
      </AnimatePresence>
    </>
  );
}
