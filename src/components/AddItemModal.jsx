import { useState, useCallback } from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { X, Plus, Package, Server, LayoutList, GripHorizontal } from 'lucide-react';
import { ITEM_TYPE_CONFIG, STATUS_CONFIG } from '../config/theme';
import './AddItemModal.css';

const TABS = [
  { id: 'item',    label: 'Item',    icon: <LayoutList size={14} /> },
  { id: 'project', label: 'Project', icon: <Package size={14} /> },
  { id: 'asset',   label: 'Asset',   icon: <Server size={14} /> },
];

const ITEM_TYPES = Object.keys(ITEM_TYPE_CONFIG);
const STATUSES   = Object.keys(STATUS_CONFIG);
const PRIORITIES = ['High', 'Medium', 'Low'];

const blankItem = () => ({
  title: '', projectId: '', assetId: '', type: 'Task', status: 'Planned',
  start: '', end: '', owner: '', department: '', priority: 'Medium',
  bundleId: '', notes: '',
});

const blankProject = () => ({
  name: '', owner: '', department: '', priority: 'Medium',
});

const blankAsset = () => ({
  name: '', type: '', status: 'In Operation',
});

export default function AddItemModal({ projects, assets, onAdd, onClose, defaults }) {
  const [tab, setTab] = useState(defaults?.tab || 'item');
  const [itemForm,    setItemForm]    = useState({ ...blankItem(),    ...(defaults?.item    || {}) });
  const [projectForm, setProjectForm] = useState({ ...blankProject(), ...(defaults?.project || {}) });
  const [assetForm,   setAssetForm]   = useState({ ...blankAsset(),   ...(defaults?.asset   || {}) });
  const [error, setError] = useState(null);

  // Framer Motion drag — dragging is initiated only from the header grip
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const setField = useCallback((setter, field, value) => {
    setter(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (tab === 'item') {
      if (!itemForm.title.trim()) { setError('Title is required.'); return; }
      if (!itemForm.start)        { setError('Start date is required.'); return; }
      if (!itemForm.end)          { setError('End date is required.'); return; }
      if (itemForm.start > itemForm.end) { setError('Start must be ≤ end.'); return; }
      onAdd('item', { ...itemForm, id: `ITEM-${Date.now()}`, bundleId: itemForm.bundleId.trim() || null, dependsOn: [] });
    } else if (tab === 'project') {
      if (!projectForm.name.trim()) { setError('Project name is required.'); return; }
      onAdd('project', { ...projectForm, id: `PRJ-${Date.now()}` });
    } else {
      if (!assetForm.name.trim()) { setError('Asset name is required.'); return; }
      onAdd('asset', { ...assetForm, id: `AST-${Date.now()}` });
    }
  }, [tab, itemForm, projectForm, assetForm, onAdd]);

  return (
    <>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/*
        Keep centering inside Framer Motion's generated transform. CSS transform
        would be overwritten by the scale/drag animation on first render.
      */}
      <motion.div
        className="modal"
        drag
        dragControls={dragControls}
        dragListener={false}      /* only the grip header starts the drag */
        dragMomentum={false}
        dragElastic={0}
        style={{ x, y }}
        transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated === 'none' ? '' : generated}`}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.75 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          {/* Grip area — pointer-down here starts the drag */}
          <div
            className="modal-title"
            onPointerDown={(e) => dragControls.start(e)}
            style={{ cursor: 'grab', userSelect: 'none', flex: 1 }}
          >
            <GripHorizontal size={13} style={{ color: 'var(--text-muted)', marginRight: 4, flexShrink: 0 }} />
            <Plus size={14} style={{ flexShrink: 0 }} />
            Add New
          </div>
          <button className="modal-close" onClick={onClose}><X size={13} /></button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`modal-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tab === 'item' && (
            <ItemForm
              form={itemForm}
              projects={projects}
              assets={assets}
              onChange={(f, v) => setField(setItemForm, f, v)}
            />
          )}
          {tab === 'project' && (
            <ProjectForm form={projectForm} onChange={(f, v) => setField(setProjectForm, f, v)} />
          )}
          {tab === 'asset' && (
            <AssetForm form={assetForm} onChange={(f, v) => setField(setAssetForm, f, v)} />
          )}

          {error && <div className="modal-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn-submit" onClick={handleSubmit}>
            <Plus size={13} /> Add {TABS.find(t => t.id === tab)?.label}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder }) {
  return (
    <input
      className="form-input"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select className="form-input" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— select —</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function ItemForm({ form, projects, assets, onChange }) {
  return (
    <div className="form-grid">
      <Field label="Title *">
        <Input value={form.title} onChange={v => onChange('title', v)} placeholder="e.g. Transformer outage prep" />
      </Field>

      <div className="form-row">
        <Field label="Type">
          <Select
            value={form.type}
            onChange={v => onChange('type', v)}
            options={Object.entries(ITEM_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={v => onChange('status', v)}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </Field>
      </div>

      <div className="form-row">
        <Field label="Start Date *">
          <Input type="date" value={form.start} onChange={v => onChange('start', v)} />
        </Field>
        <Field label="End Date *">
          <Input type="date" value={form.end} onChange={v => onChange('end', v)} />
        </Field>
      </div>

      <div className="form-row">
        <Field label="Project">
          <Select
            value={form.projectId}
            onChange={v => onChange('projectId', v)}
            options={(projects || []).map(p => ({ value: p.id, label: p.name }))}
          />
        </Field>
        <Field label="Asset">
          <Select
            value={form.assetId}
            onChange={v => onChange('assetId', v)}
            options={(assets || []).map(a => ({ value: a.id, label: a.name }))}
          />
        </Field>
      </div>

      <div className="form-row">
        <Field label="Owner">
          <Input value={form.owner} onChange={v => onChange('owner', v)} placeholder="Name" />
        </Field>
        <Field label="Department">
          <Input value={form.department} onChange={v => onChange('department', v)} placeholder="Dept" />
        </Field>
      </div>

      <div className="form-row">
        <Field label="Priority">
          <Select
            value={form.priority}
            onChange={v => onChange('priority', v)}
            options={PRIORITIES.map(p => ({ value: p, label: p }))}
          />
        </Field>
        <Field label="Bundle ID">
          <Input value={form.bundleId} onChange={v => onChange('bundleId', v)} placeholder="e.g. BUNDLE-001" />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          className="form-input form-textarea"
          value={form.notes}
          onChange={e => onChange('notes', e.target.value)}
          placeholder="Optional notes or description…"
          rows={2}
        />
      </Field>
    </div>
  );
}

function ProjectForm({ form, onChange }) {
  return (
    <div className="form-grid">
      <Field label="Project Name *">
        <Input value={form.name} onChange={v => onChange('name', v)} placeholder="e.g. Substation Upgrade" />
      </Field>
      <div className="form-row">
        <Field label="Owner">
          <Input value={form.owner} onChange={v => onChange('owner', v)} placeholder="Name" />
        </Field>
        <Field label="Department">
          <Input value={form.department} onChange={v => onChange('department', v)} placeholder="Dept" />
        </Field>
      </div>
      <Field label="Priority">
        <Select
          value={form.priority}
          onChange={v => onChange('priority', v)}
          options={PRIORITIES.map(p => ({ value: p, label: p }))}
        />
      </Field>
    </div>
  );
}

function AssetForm({ form, onChange }) {
  const ASSET_STATUSES = ['In Operation', 'Out of Operation', 'Maintenance', 'Decommissioned'];
  return (
    <div className="form-grid">
      <Field label="Asset Name *">
        <Input value={form.name} onChange={v => onChange('name', v)} placeholder="e.g. Transformer T3" />
      </Field>
      <div className="form-row">
        <Field label="Type">
          <Input value={form.type} onChange={v => onChange('type', v)} placeholder="e.g. Power Transformer" />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={v => onChange('status', v)}
            options={ASSET_STATUSES.map(s => ({ value: s, label: s }))}
          />
        </Field>
      </div>
    </div>
  );
}
