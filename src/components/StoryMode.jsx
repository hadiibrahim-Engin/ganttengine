import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, X, Layers, GitFork, Diamond, AlertTriangle, BarChart3 } from 'lucide-react';
import { formatDateShort, parseDate, diffDays, getDuration } from '../utils/dateUtils';
import './StoryMode.css';

/* ── Slide generation ──────────────────────────────────────── */
export function buildSlides(data, lineGroups, colorMap) {
  const slides = [];
  const allDates = data.flatMap(t => [new Date(t.start_date + 'T00:00:00'), new Date(t.end_date + 'T00:00:00')]);
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const spanDays = diffDays(minDate, maxDate);
  const milestones = data.filter(t => t.start_date === t.end_date);
  const hasDeps = data.some(t => t.depends_on?.length > 0);

  // Conflicts: outages on same line that overlap
  const conflicts = [];
  lineGroups.forEach(({ lineName, tasks }) => {
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const a = tasks[i], b = tasks[j];
        if (a.start_date <= b.end_date && b.start_date <= a.end_date) {
          conflicts.push({ line: lineName, a, b });
        }
      }
    }
  });

  // Longest outage
  let longest = null;
  data.forEach(t => {
    const d = diffDays(parseDate(t.start_date), parseDate(t.end_date));
    if (!longest || d > longest.days) longest = { task: t, days: d };
  });

  // Slide 1: Overview
  slides.push({
    id: 'overview',
    type: 'overview',
    title: 'Outage Schedule Overview',
    subtitle: `${data.length} outages planned across ${lineGroups.length} lines — ${formatDateShort(minDate)} to ${formatDateShort(maxDate)}`,
    bullets: [
      `Timeline spans ${spanDays} days`,
      `${milestones.length} critical milestones`,
      hasDeps ? `${data.filter(t => t.depends_on?.length).length} dependency chains` : null,
      conflicts.length > 0 ? `${conflicts.length} scheduling conflict${conflicts.length > 1 ? 's' : ''} detected` : null,
    ].filter(Boolean),
    stats: [
      { value: data.length, label: 'Outages' },
      { value: lineGroups.length, label: 'Lines' },
      { value: milestones.length, label: 'Milestones' },
      { value: conflicts.length, label: 'Conflicts' },
    ],
    highlightLines: null, // all
  });

  // Per-line slides (max 10)
  lineGroups.slice(0, 10).forEach(({ lineName, tasks }) => {
    const taskDates = tasks.flatMap(t => [new Date(t.start_date + 'T00:00:00'), new Date(t.end_date + 'T00:00:00')]);
    const lineStart = new Date(Math.min(...taskDates));
    const lineEnd = new Date(Math.max(...taskDates));
    const totalLineDays = tasks.reduce((sum, t) => sum + diffDays(parseDate(t.start_date), parseDate(t.end_date)) + 1, 0);

    slides.push({
      id: `line-${lineName}`,
      type: 'line',
      title: lineName,
      subtitle: `${tasks.length} outage${tasks.length > 1 ? 's' : ''} — ${formatDateShort(lineStart)} to ${formatDateShort(lineEnd)}`,
      bullets: tasks.map(t => `${t.project_name}: ${getDuration(t.start_date, t.end_date)}`),
      highlightLines: [lineName],
      color: colorMap[tasks[0]?.project_name]?.primary,
    });
  });

  // Dependencies slide
  if (hasDeps) {
    const depTasks = data.filter(t => t.depends_on?.length > 0);
    slides.push({
      id: 'dependencies',
      type: 'dep',
      title: 'Outage Dependencies',
      subtitle: 'These outages are sequenced — moving one shifts all downstream outages automatically',
      bullets: depTasks.map(t =>
        `${t.depends_on.map(d => d.id || d).join(', ')} → ${t.project_name}${t.depends_on[0]?.lag ? ` (+${t.depends_on[0].lag}d lag)` : ''}`
      ),
      highlightLines: null,
    });
  }

  // Conflicts slide
  if (conflicts.length > 0) {
    slides.push({
      id: 'conflicts',
      type: 'conflict',
      title: 'Scheduling Conflicts',
      subtitle: `${conflicts.length} overlapping outage${conflicts.length > 1 ? 's' : ''} detected — review and reschedule`,
      bullets: conflicts.map(c => `${c.line}: "${c.a.project_name}" overlaps with "${c.b.project_name}"`),
      highlightLines: conflicts.map(c => c.line),
    });
  }

  // Milestones slide
  if (milestones.length > 0) {
    slides.push({
      id: 'milestones',
      type: 'ms',
      title: 'Key Milestones',
      subtitle: `${milestones.length} critical inspection and audit points`,
      bullets: milestones.map(t => `${t.project_name} — ${t.line_name} — ${formatDateShort(new Date(t.start_date + 'T00:00:00'))}`),
      highlightLines: milestones.map(t => t.line_name),
    });
  }

  // Summary slide
  const byStatus = data.reduce((acc, t) => {
    const s = t.status || 'planned';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  slides.push({
    id: 'summary',
    type: 'summary',
    title: 'Planning Summary',
    subtitle: 'Status breakdown of all scheduled outages',
    bullets: Object.entries(byStatus).map(([s, n]) => `${s.charAt(0).toUpperCase() + s.slice(1)}: ${n} outage${n > 1 ? 's' : ''}`),
    stats: Object.entries(byStatus).map(([s, n]) => ({ value: n, label: s })),
    highlightLines: null,
  });

  return slides;
}

/* ── Type icon ─────────────────────────────────────────────── */
function TypeIcon({ type }) {
  const props = { size: 12 };
  if (type === 'overview') return <BarChart3 {...props} />;
  if (type === 'line')     return <Layers {...props} />;
  if (type === 'dep')      return <GitFork {...props} />;
  if (type === 'ms')       return <Diamond {...props} />;
  if (type === 'conflict') return <AlertTriangle {...props} />;
  return <BarChart3 {...props} />;
}

const TYPE_LABEL = {
  overview: 'Overview',
  line:     'Line Focus',
  dep:      'Dependencies',
  ms:       'Milestones',
  conflict: 'Conflicts',
  summary:  'Summary',
};

/* ── Main StoryMode component ──────────────────────────────── */
export default function StoryMode({ slides, onClose, onHighlight }) {
  const [idx, setIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  const slide = slides[idx];
  const total = slides.length;

  // Apply highlight to chart
  useEffect(() => {
    onHighlight(slide?.highlightLines ?? null);
  }, [slide, onHighlight]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setIdx(i => {
        if (i >= total - 1) { setIsPlaying(false); return i; }
        return i + 1;
      });
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [isPlaying, total]);

  const go = useCallback((dir) => {
    setIdx(i => Math.max(0, Math.min(total - 1, i + dir)));
    setIsPlaying(false);
  }, [total]);

  const handleClose = useCallback(() => {
    onHighlight(null);
    onClose();
  }, [onClose, onHighlight]);

  return (
    <>
      {/* Dim overlay — click closes story */}
      <motion.div
        className="story-dim-mask"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleClose}
      />

      {/* Bottom panel */}
      <div className="story-panel">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            className="story-panel-inner"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Progress bar */}
            <div
              className="story-progress"
              style={{ width: `${((idx + 1) / total) * 100}%` }}
            />

            {/* Close */}
            <button className="story-close-btn" onClick={handleClose}>
              <X size={13} />
              Exit Story
            </button>

            {/* Content */}
            <div className="story-content">
              <div className={`story-type-badge story-type-${slide.type}`}>
                <TypeIcon type={slide.type} />
                {TYPE_LABEL[slide.type] || slide.type}
              </div>
              <div className="story-title">{slide.title}</div>
              <div className="story-subtitle">{slide.subtitle}</div>

              {slide.stats ? (
                <div className="story-stats">
                  {slide.stats.map((s, i) => (
                    <div key={i} className="story-stat">
                      <span className="story-stat-value">{s.value}</span>
                      <span className="story-stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                slide.bullets?.length > 0 && (
                  <div className="story-bullets">
                    {slide.bullets.slice(0, 4).map((b, i) => (
                      <div key={i} className="story-bullet">
                        <div
                          className="story-bullet-dot"
                          style={{ background: slide.color || '#6366F1' }}
                        />
                        {b}
                      </div>
                    ))}
                    {slide.bullets.length > 4 && (
                      <div className="story-bullet" style={{ color: '#64748B' }}>
                        + {slide.bullets.length - 4} more…
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Navigation */}
            <div className="story-nav">
              <div className="story-nav-btns">
                <button
                  className="story-nav-btn"
                  onClick={() => go(-1)}
                  disabled={idx === 0}
                  title="Previous"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  className="story-nav-btn play"
                  onClick={() => setIsPlaying(p => !p)}
                  title={isPlaying ? 'Pause' : 'Auto-play'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>

                <button
                  className="story-nav-btn"
                  onClick={() => go(1)}
                  disabled={idx === total - 1}
                  title="Next"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="story-counter">{idx + 1} / {total}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
