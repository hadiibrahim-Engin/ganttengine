import { motion } from 'framer-motion';
import { X, Clock, Package, Move, Plus, Edit2, Trash2 } from 'lucide-react';
import { ACTION_LABELS, ACTION_COLORS, formatTimestamp } from '../utils/historyTracker';
import { ANIM } from '../config/theme';
import './HistoryPanel.css';

const ACTION_ICONS = {
  move:        Move,
  bundle_move: Package,
  add:         Plus,
  update:      Edit2,
  delete:      Trash2,
};

export default function HistoryPanel({ history, onClose, onUndo, canUndo }) {
  return (
    <>
      <motion.div
        className="history-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="history-panel"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '110%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <div className="history-header">
          <div className="history-title">
            <Clock size={15} />
            Change History
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canUndo && (
              <button className="history-undo-btn" onClick={onUndo} title="Undo last action">
                Undo
              </button>
            )}
            <button className="history-close" onClick={onClose}><X size={14} /></button>
          </div>
        </div>

        <div className="history-body">
          {history.length === 0 ? (
            <div className="history-empty">
              <Clock size={28} color="var(--text-muted)" />
              <span>No changes recorded yet.</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Move, add, or edit items to see history.
              </span>
            </div>
          ) : (
            history.map((entry) => {
              const Icon = ACTION_ICONS[entry.action] || Edit2;
              const color = ACTION_COLORS[entry.action] || '#6366F1';
              return (
                <div key={entry.id} className="history-entry">
                  <div className="history-entry-icon" style={{ color, background: `${color}18` }}>
                    <Icon size={13} />
                  </div>
                  <div className="history-entry-body">
                    <div className="history-entry-label">
                      <span className="history-action-badge" style={{ color, background: `${color}18` }}>
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                      {entry.bundleId && (
                        <span className="history-bundle-tag">{entry.bundleId}</span>
                      )}
                    </div>
                    <div className="history-entry-desc">{entry.description}</div>
                    {entry.affectedItems?.length > 1 && (
                      <div className="history-affected">
                        {entry.affectedItems.length} items affected
                      </div>
                    )}
                    <div className="history-timestamp">{formatTimestamp(entry.timestamp)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
}
