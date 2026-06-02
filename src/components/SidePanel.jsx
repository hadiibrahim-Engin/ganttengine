import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, Calendar, Clock, Tag, User, Building2, Flag,
  Link2, FileText, Package, Edit2, Check, Trash2,
} from 'lucide-react';
import { formatDate, getDuration, diffDays, parseDate, getISOWeek } from '../utils/dateUtils';
import { ITEM_TYPE_CONFIG, STATUS_CONFIG, ANIM } from '../config/theme';
import { getBundleMembers } from '../utils/bundleLogic';
import StatusBadge from './StatusBadge';
import './SidePanel.css';

export default function SidePanel({ item, ganttData, changeHistory, colorMap, onClose, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm,  setEditForm]  = useState(null);

  if (!item) return null;

  const project  = ganttData?.projects?.find(p => p.id === item.projectId);
  const asset    = ganttData?.assets?.find(a => a.id === item.assetId);
  const allItems = ganttData?.items || [];
  const typeCfg  = ITEM_TYPE_CONFIG[item.type] || ITEM_TYPE_CONFIG.Task;
  const isMilestone = item.type === 'Milestone';
  const bundleMembers = getBundleMembers(allItems, item.bundleId).filter(m => m.id !== item.id);
  const projColor = colorMap[item.projectId];

  const itemHistory = (changeHistory || []).filter(e =>
    e.affectedItems?.some(ai => ai.itemId === item.id)
  );

  const startDate = parseDate(item.start);
  const endDate   = parseDate(item.end);
  const cwStart   = getISOWeek(startDate);
  const cwEnd     = getISOWeek(endDate);

  const startEdit = () => {
    setEditForm({ ...item });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditForm(null);
    setIsEditing(false);
  };

  const submitEdit = () => {
    if (!editForm.title?.trim() || !editForm.start || !editForm.end) return;
    onUpdate(editForm);
    setIsEditing(false);
    setEditForm(null);
  };

  return (
    <>
      <motion.div
        className="sp-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="side-panel"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '110%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        {/* Header */}
        <div className="sp-header" style={{ borderTopColor: typeCfg.color }}>
          <div className="sp-header-left">
            <div
              className="sp-type-badge"
              style={{ color: typeCfg.color, background: typeCfg.light, border: `1px solid ${typeCfg.color}40` }}
            >
              {typeCfg.label}
            </div>
            <div className="sp-title">{item.title}</div>
            {item.bundleId && (
              <div className="sp-bundle-tag">
                <Link2 size={10} /> {item.bundleId}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {!isEditing && (
              <button className="sp-icon-btn" onClick={startEdit} title="Edit">
                <Edit2 size={13} />
              </button>
            )}
            <button className="sp-icon-btn" onClick={onClose} title="Close">
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="sp-body">

          {/* Edit form */}
          {isEditing ? (
            <EditForm
              form={editForm}
              projects={ganttData?.projects || []}
              assets={ganttData?.assets || []}
              onChange={(f, v) => setEditForm(prev => ({ ...prev, [f]: v }))}
              onSubmit={submitEdit}
              onCancel={cancelEdit}
            />
          ) : (
            <>
              {/* Status */}
              <div className="sp-section">
                <StatusBadge status={item.status} size="md" />
              </div>

              {/* Schedule */}
              <Section title="Schedule" icon={<Calendar size={13} />}>
                <Row label="Start">
                  <span>{formatDate(startDate)}</span>
                  <span className="sp-cw">CW {cwStart}</span>
                </Row>
                {!isMilestone && (
                  <Row label="End">
                    <span>{formatDate(endDate)}</span>
                    <span className="sp-cw">CW {cwEnd}</span>
                  </Row>
                )}
                {!isMilestone && (
                  <Row label="Duration">
                    <span>{getDuration(item.start, item.end)}</span>
                    <span className="sp-muted">{diffDays(startDate, endDate) + 1} calendar days</span>
                  </Row>
                )}
              </Section>

              {/* Project / Asset */}
              <Section title="Project & Asset" icon={<Tag size={13} />}>
                {project && (
                  <Row label="Project">
                    <span>{project.name}</span>
                    {projColor && <span className="sp-dot" style={{ background: projColor.primary }} />}
                  </Row>
                )}
                {asset && <Row label="Asset"><span>{asset.name}</span></Row>}
                {asset && <Row label="Asset Type"><span className="sp-muted">{asset.type}</span></Row>}
              </Section>

              {/* People */}
              {(item.owner || item.department) && (
                <Section title="People & Team" icon={<User size={13} />}>
                  {item.owner      && <Row label="Owner"><span>{item.owner}</span></Row>}
                  {item.department && <Row label="Department"><span>{item.department}</span></Row>}
                  {item.priority   && <Row label="Priority"><PriorityBadge priority={item.priority} /></Row>}
                </Section>
              )}

              {/* Bundle members */}
              {bundleMembers.length > 0 && (
                <Section title={`Bundle: ${item.bundleId}`} icon={<Link2 size={13} />}>
                  {bundleMembers.slice(0, 5).map(m => (
                    <div key={m.id} className="sp-bundle-member">
                      <span
                        className="sp-type-dot"
                        style={{ background: (ITEM_TYPE_CONFIG[m.type] || ITEM_TYPE_CONFIG.Task).color }}
                      />
                      <span className="sp-member-title">{m.title}</span>
                      <span className="sp-muted">{m.start}</span>
                    </div>
                  ))}
                  {bundleMembers.length > 5 && (
                    <div className="sp-muted" style={{ fontSize: 11, padding: '2px 0' }}>
                      +{bundleMembers.length - 5} more
                    </div>
                  )}
                </Section>
              )}

              {/* Dependencies */}
              {item.dependsOn?.length > 0 && (
                <Section title="Dependencies" icon={<Package size={13} />}>
                  {item.dependsOn.map((dep, i) => {
                    const depId = typeof dep === 'string' ? dep : dep.id;
                    const depType = typeof dep === 'object' ? dep.type : 'FS';
                    const depItem = allItems.find(it => it.id === depId);
                    return (
                      <div key={i} className="sp-dep-row">
                        <span className="sp-dep-type">{depType}</span>
                        <span>{depItem?.title || depId}</span>
                      </div>
                    );
                  })}
                </Section>
              )}

              {/* Notes */}
              {item.notes && (
                <Section title="Notes" icon={<FileText size={13} />}>
                  <p className="sp-notes">{item.notes}</p>
                </Section>
              )}

              {/* Item history */}
              {itemHistory.length > 0 && (
                <Section title="Recent Changes" icon={<Clock size={13} />}>
                  {itemHistory.slice(0, 4).map(e => (
                    <div key={e.id} className="sp-history-row">
                      <span>{e.description}</span>
                      <span className="sp-muted" style={{ fontSize: 10 }}>
                        {new Date(e.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </Section>
              )}

              {/* Delete */}
              <div className="sp-delete-row">
                <button className="sp-delete-btn" onClick={() => onDelete(item)}>
                  <Trash2 size={12} /> Delete item
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="sp-section">
      <div className="sp-section-title">
        {icon}
        {title}
      </div>
      <div className="sp-section-body">{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="sp-row">
      <span className="sp-row-label">{label}</span>
      <span className="sp-row-value">{children}</span>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const colors = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };
  return (
    <span style={{ color: colors[priority] || '#94A3B8', fontWeight: 600, fontSize: 12 }}>
      {priority}
    </span>
  );
}

function EditForm({ form, projects, assets, onChange, onSubmit, onCancel }) {
  const ALL_STATUSES = Object.keys(STATUS_CONFIG);
  const ALL_TYPES    = Object.keys(ITEM_TYPE_CONFIG);

  return (
    <div className="sp-edit-form">
      <div className="sp-edit-title">Edit Item</div>

      <label className="sp-field">
        <span>Title</span>
        <input className="sp-input" value={form.title} onChange={e => onChange('title', e.target.value)} />
      </label>

      <div className="sp-edit-row">
        <label className="sp-field">
          <span>Type</span>
          <select className="sp-input" value={form.type} onChange={e => onChange('type', e.target.value)}>
            {ALL_TYPES.map(t => <option key={t} value={t}>{ITEM_TYPE_CONFIG[t].label}</option>)}
          </select>
        </label>
        <label className="sp-field">
          <span>Status</span>
          <select className="sp-input" value={form.status} onChange={e => onChange('status', e.target.value)}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </label>
      </div>

      <div className="sp-edit-row">
        <label className="sp-field">
          <span>Start</span>
          <input type="date" className="sp-input" value={form.start} onChange={e => onChange('start', e.target.value)} />
        </label>
        <label className="sp-field">
          <span>End</span>
          <input type="date" className="sp-input" value={form.end} onChange={e => onChange('end', e.target.value)} />
        </label>
      </div>

      <div className="sp-edit-row">
        <label className="sp-field">
          <span>Project</span>
          <select className="sp-input" value={form.projectId || ''} onChange={e => onChange('projectId', e.target.value)}>
            <option value="">— none —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="sp-field">
          <span>Asset</span>
          <select className="sp-input" value={form.assetId || ''} onChange={e => onChange('assetId', e.target.value)}>
            <option value="">— none —</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </div>

      <label className="sp-field">
        <span>Notes</span>
        <textarea className="sp-input sp-textarea" value={form.notes || ''} onChange={e => onChange('notes', e.target.value)} rows={2} />
      </label>

      <div className="sp-edit-actions">
        <button className="sp-btn sp-btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="sp-btn sp-btn-save" onClick={onSubmit}>
          <Check size={12} /> Save
        </button>
      </div>
    </div>
  );
}
