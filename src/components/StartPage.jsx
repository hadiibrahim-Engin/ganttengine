import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Plus, PlayCircle, CalendarDays, Link2, Layers, GitMerge, FileInput } from 'lucide-react';
import { parseJSON, parseCSV } from '../utils/importExport';
import './StartPage.css';

const FEATURE_CARDS = [
  { icon: <CalendarDays size={18} />, title: 'Calendar Week Timeline', desc: 'ISO CW labels, multi-level zoom from day to year.' },
  { icon: <Link2 size={18} />,        title: 'Bundled Actions',         desc: 'Move linked items together as a group.' },
  { icon: <Layers size={18} />,       title: 'Asset Operation Planning', desc: 'Track out-of-operation events with visual indicators.' },
  { icon: <GitMerge size={18} />,     title: 'Overlap Visualization',   desc: 'See overlapping items as stacked tracks without false conflicts.' },
  { icon: <FileInput size={18} />,    title: 'Import & Export',         desc: 'Load JSON or CSV; export to JSON, CSV, Excel, or PNG.' },
];

export default function StartPage({ onData, onError }) {
  const fileInputRef = useRef(null);

  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const parsed = file.name.endsWith('.csv')
          ? parseCSV(text)
          : parseJSON(text);
        onData(parsed);
      } catch (err) {
        onError(err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [onData, onError]);

  return (
    <div className="start-page">
      {/* Animated background */}
      <div className="start-bg">
        <div className="start-orb start-orb-1" />
        <div className="start-orb start-orb-2" />
        <div className="start-orb start-orb-3" />
        <div className="start-grid" />
      </div>

      <div className="start-content">
        {/* Hero */}
        <motion.div
          className="start-hero"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="start-logo">
            <CalendarDays size={28} />
          </div>
          <h1 className="start-title">Gantt Planning Tool</h1>
          <p className="start-subtitle">
            Plan projects, assets, milestones, operation windows, and bundled actions
            in one interactive timeline.
          </p>

          {/* CTA Buttons */}
          <div className="start-ctas">
            <motion.button
              className="start-btn start-btn-primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              Upload Data
            </motion.button>

            <motion.button
              className="start-btn start-btn-secondary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onData('new')}
            >
              <Plus size={16} />
              Create Project
            </motion.button>

            <motion.button
              className="start-btn start-btn-accent"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onData('demo')}
            >
              <PlayCircle size={16} />
              Load Demo Data
            </motion.button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          className="start-features"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {FEATURE_CARDS.map((card, i) => (
            <motion.div
              key={i}
              className="start-feature-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
            >
              <div className="feature-icon">{card.icon}</div>
              <div>
                <div className="feature-title">{card.title}</div>
                <div className="feature-desc">{card.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mini Gantt Preview */}
        <motion.div
          className="start-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <MiniGanttPreview />
        </motion.div>
      </div>
    </div>
  );
}

function MiniGanttPreview() {
  const bars = [
    { label: 'Transformer T1',  color: '#6366F1', tracks: [{ x: 5,  w: 25, type: 'task' }, { x: 22, w: 18, type: 'out' }] },
    { label: 'Line L4',         color: '#10B981', tracks: [{ x: 15, w: 35, type: 'task' }] },
    { label: 'Relay Panel',     color: '#F59E0B', tracks: [{ x: 30, w: 20, type: 'maintenance' }, { x: 32, w: 10, type: 'out' }] },
    { label: 'SCADA Unit',      color: '#06B6D4', tracks: [{ x: 2,  w: 55, type: 'task' }] },
  ];

  const TYPE_COLOR = {
    task:        'var(--accent)',
    out:         '#EF4444',
    maintenance: '#F59E0B',
  };

  return (
    <div className="mini-gantt">
      <div className="mini-gantt-header">
        <div style={{ width: 90 }} />
        {['CW1','CW2','CW3','CW4','CW5','CW6','CW7','CW8'].map(w => (
          <div key={w} className="mini-cw">{w}</div>
        ))}
      </div>
      {bars.map((row, ri) => (
        <div key={ri} className="mini-gantt-row">
          <div className="mini-row-label" style={{ color: row.color }}>{row.label}</div>
          <div className="mini-row-area">
            {row.tracks.map((bar, bi) => (
              <div
                key={bi}
                className="mini-bar"
                style={{
                  left: `${bar.x}%`,
                  width: `${bar.w}%`,
                  background: TYPE_COLOR[bar.type] || '#6366F1',
                  opacity: bar.type === 'out' ? 0.75 : 0.9,
                  top: bi > 0 ? 6 : 0,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
