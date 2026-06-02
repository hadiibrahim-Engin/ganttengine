// ── DATE NORMALISATION ────────────────────────────────────────────────────────
// Accept YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, MM/DD/YYYY (US), ISO strings.
// Always returns YYYY-MM-DD string or empty string if unparseable.
function normaliseDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // DD.MM.YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // Try native Date parse as last resort
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2,'0');
    const d = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

// ── VALIDATION ───────────────────────────────────────────────────────────────

function validateNewFormat(data) {
  if (!Array.isArray(data.items) || data.items.length === 0)
    return { valid: false, error: 'items array is empty or missing.' };

  const noDate = data.items.filter(it => !it.start || !it.end);
  if (noDate.length === data.items.length)
    return { valid: false, error: 'No items have start/end dates.' };

  return { valid: true, error: null };
}

function normalizeLegacyFormat(data) {
  if (!Array.isArray(data)) throw new Error('Expected array or {items,...} object.');

  const projectNames = [...new Set(data.map(t => t.project_name).filter(Boolean))];
  const assetNames   = [...new Set(data.map(t => t.line_name).filter(Boolean))];

  const projects = projectNames.map((name, i) => ({
    id: `PRJ-${String(i + 1).padStart(3, '0')}`,
    name,
    owner: '',
    department: '',
    priority: 'Medium',
  }));

  const assets = assetNames.map((name, i) => ({
    id: `AST-${String(i + 1).padStart(3, '0')}`,
    name,
    type: 'Line',
    status: 'In Operation',
  }));

  const projectIdMap = new Map(projectNames.map((n, i) => [n, projects[i].id]));
  const assetIdMap   = new Map(assetNames.map((n, i) => [n, assets[i].id]));

  const legacyStatusMap = {
    completed:    'Done',
    'in-progress': 'In Progress',
    approved:     'Planned',
    planned:      'Planned',
  };

  const items = data.map((t, i) => {
    const start = normaliseDate(t.start_date || t.start || t.StartDate || t.start_dt || '');
    const end   = normaliseDate(t.end_date   || t.end   || t.EndDate   || t.end_dt   || start);
    const type  = start === end ? 'Milestone' : 'Task';
    return {
      id:         t.id || `ITEM-${String(i + 1).padStart(3, '0')}`,
      title:      t.project_name || t.title || `Item ${i + 1}`,
      projectId:  projectIdMap.get(t.project_name) || null,
      assetId:    assetIdMap.get(t.line_name) || null,
      type,
      status:     legacyStatusMap[t.status] || t.status || 'Planned',
      start,
      end,
      owner:      t.owner || '',
      department: t.department || '',
      priority:   t.priority || 'Medium',
      bundleId:   t.bundle_id || null,
      notes:      t.notes || '',
      dependsOn:  (t.depends_on || []).map(d => ({
        id:   typeof d === 'string' ? d : d.id,
        type: typeof d === 'object' ? (d.type || 'FS') : 'FS',
      })),
    };
  });

  return { projects, assets, items, dependencies: [] };
}

// Parses raw JSON (string or parsed object) into the canonical format.
export function parseJSON(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (Array.isArray(data)) {
    return normalizeLegacyFormat(data);
  }

  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    const { valid, error } = validateNewFormat(data);
    if (!valid) throw new Error(error);
    // Normalise dates on every item so the app always gets YYYY-MM-DD
    const items = data.items.map(it => ({
      ...it,
      start: normaliseDate(it.start),
      end:   normaliseDate(it.end),
    }));
    return {
      projects:     data.projects     || [],
      assets:       data.assets       || [],
      items,
      dependencies: data.dependencies || [],
    };
  }

  throw new Error('Unknown format. Provide a flat JSON array or {projects,assets,items,dependencies} object.');
}

// ── CSV IMPORT ───────────────────────────────────────────────────────────────

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const raw = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });

  // Map CSV columns to the new format — normalise dates regardless of format
  const items = raw.map((row, i) => {
    const start = normaliseDate(row.start || row.start_date || row.startdate || row.von || row.begin || '');
    const end   = normaliseDate(row.end   || row.end_date   || row.enddate   || row.bis || row.finish || start);
    return {
      id:         row.id || `CSV-${String(i + 1).padStart(3, '0')}`,
      title:      row.title || row.name || row.project_name || `Item ${i + 1}`,
      projectId:  row.project_id || row.projectid || null,
      assetId:    row.asset_id   || row.assetid   || null,
      type:       row.type       || 'Task',
      status:     row.status     || 'Planned',
      start,
      end,
      owner:      row.owner      || '',
      department: row.department || '',
      priority:   row.priority   || 'Medium',
      bundleId:   row.bundle_id  || row.bundleid  || null,
      notes:      row.notes      || '',
      dependsOn:  [],
    };
  }).filter(i => i.start && DATE_RE.test(i.start));

  if (items.length === 0) throw new Error('No valid rows found. Ensure start/end columns are YYYY-MM-DD.');

  // Infer projects and assets from the data
  return buildFromItems(items);
}

function parseCSVLine(line) {
  const result = [];
  let inQuote = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function buildFromItems(items) {
  const projectIds = [...new Set(items.map(i => i.projectId).filter(Boolean))];
  const assetIds   = [...new Set(items.map(i => i.assetId).filter(Boolean))];

  const projects = projectIds.map(id => ({ id, name: id, owner: '', department: '', priority: 'Medium' }));
  const assets   = assetIds.map(id =>   ({ id, name: id, type: 'Asset', status: 'In Operation' }));

  return { projects, assets, items, dependencies: [] };
}

// ── JSON EXPORT ──────────────────────────────────────────────────────────────

export function exportJSON(ganttData) {
  const blob = new Blob([JSON.stringify(ganttData, null, 2)], { type: 'application/json' });
  download(blob, 'gantt-export.json');
}

// ── CSV EXPORT ───────────────────────────────────────────────────────────────

export function exportCSV(items, projects, assets) {
  const projectMap = new Map((projects || []).map(p => [p.id, p]));
  const assetMap   = new Map((assets   || []).map(a => [a.id, a]));

  const headers = ['id','title','type','status','start','end','owner','department','priority','bundleId','notes','projectName','assetName'];

  const rows = items.map(item => [
    item.id,
    item.title,
    item.type,
    item.status,
    item.start,
    item.end,
    item.owner || '',
    item.department || '',
    item.priority || '',
    item.bundleId || '',
    item.notes || '',
    projectMap.get(item.projectId)?.name || '',
    assetMap.get(item.assetId)?.name || '',
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  download(blob, 'gantt-export.csv');
}

// ── EXCEL EXPORT ─────────────────────────────────────────────────────────────

export function exportExcel(items, projects, assets) {
  const projectMap = new Map((projects || []).map(p => [p.id, p]));
  const assetMap   = new Map((assets   || []).map(a => [a.id, a]));

  const itemRows = (items || []).map(item => [
    item.id,
    item.title,
    item.type,
    item.status,
    item.start,
    item.end,
    item.owner || '',
    item.department || '',
    item.priority || '',
    item.bundleId || '',
    item.notes || '',
    projectMap.get(item.projectId)?.name || '',
    assetMap.get(item.assetId)?.name || '',
  ]);

  const projectRows = (projects || []).map(project => [
    project.id,
    project.name,
    project.owner || '',
    project.department || '',
    project.priority || '',
  ]);

  const assetRows = (assets || []).map(asset => [
    asset.id,
    asset.name,
    asset.type || '',
    asset.status || '',
  ]);

  const workbook = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head><meta charset="utf-8"><xml><x:ExcelWorkbook><x:ExcelWorksheets>',
    excelSheetMeta('Items'),
    excelSheetMeta('Projects'),
    excelSheetMeta('Assets'),
    '</x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body>',
    excelTable('Items', ['ID','Title','Type','Status','Start','End','Owner','Department','Priority','BundleID','Notes','Project','Asset'], itemRows),
    excelTable('Projects', ['ID','Name','Owner','Department','Priority'], projectRows),
    excelTable('Assets', ['ID','Name','Type','Status'], assetRows),
    '</body></html>',
  ].join('');

  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  download(blob, 'gantt-export.xls');
}

// ── IMAGE EXPORT ─────────────────────────────────────────────────────────────

export async function exportPNG(element, options = {}) {
  return exportChartImage(element, { ...options, format: 'png' });
}

export async function exportChartImage(element, {
  mode = 'snapshot',
  format = 'png',
  filename,
} = {}) {
  if (!element) throw new Error('Nothing to export yet.');

  const { toPng, toJpeg } = await import('html-to-image');
  const toImage = format === 'jpeg' || format === 'jpg' ? toJpeg : toPng;
  const cleanup = mode === 'full' ? prepareFullChartExport(element) : prepareSnapshotExport(element);

  await waitForPaint();

  try {
    const dataUrl = await toImage(element, {
      quality: 0.96,
      pixelRatio: 2,
      backgroundColor: getExportBackground(),
      cacheBust: true,
    });

    const ext = format === 'jpeg' || format === 'jpg' ? 'jpg' : 'png';
    downloadDataUrl(dataUrl, filename || `gantt-${mode}-${timestampForFilename()}.${ext}`);
  } finally {
    cleanup();
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function prepareSnapshotExport(element) {
  element.classList.add('exporting', 'exporting-snapshot');
  return () => element.classList.remove('exporting', 'exporting-snapshot');
}

function prepareFullChartExport(element) {
  const body = element.querySelector('.gantt-body');
  const headerScroll = element.querySelector('.gantt-header-scroll');
  const leftCol = element.querySelector('.gantt-left-col');
  const corner = element.querySelector('.gantt-corner');
  const scrollNav = element.querySelector('.gantt-scroll-nav');
  const restore = [];

  const remember = (node, styles) => {
    if (!node) return;
    const previous = {};
    for (const key of styles) previous[key] = node.style[key];
    restore.push(() => {
      for (const key of styles) node.style[key] = previous[key];
    });
  };

  remember(element, ['width', 'height', 'minWidth', 'minHeight', 'overflow']);
  remember(body, ['height', 'overflow', 'overflowX', 'overflowY']);
  remember(headerScroll, ['overflow']);
  remember(leftCol, ['width', 'minWidth']);
  remember(corner, ['width', 'minWidth']);
  remember(scrollNav, ['display']);

  const originalScroll = body ? { left: body.scrollLeft, top: body.scrollTop } : null;
  const exportLabelWidth = Math.min(500, Math.max(420, leftCol?.getBoundingClientRect().width || 0));

  if (leftCol) {
    leftCol.style.width = `${exportLabelWidth}px`;
    leftCol.style.minWidth = `${exportLabelWidth}px`;
  }
  if (corner) {
    corner.style.width = `${exportLabelWidth}px`;
    corner.style.minWidth = `${exportLabelWidth}px`;
  }

  const fullWidth = Math.max(element.scrollWidth, body?.scrollWidth || 0, element.clientWidth);
  const fullBodyHeight = Math.max(body?.scrollHeight || 0, body?.clientHeight || 0);
  const fullHeight = Math.max(element.scrollHeight, fullBodyHeight + (element.querySelector('.gantt-header-row')?.offsetHeight || 0), element.clientHeight);

  element.classList.add('exporting', 'exporting-full');
  element.style.width = `${fullWidth}px`;
  element.style.height = `${fullHeight}px`;
  element.style.minWidth = `${fullWidth}px`;
  element.style.minHeight = `${fullHeight}px`;
  element.style.overflow = 'visible';

  if (body) {
    body.scrollLeft = 0;
    body.scrollTop = 0;
    body.style.height = `${fullBodyHeight}px`;
    body.style.overflow = 'visible';
    body.style.overflowX = 'visible';
    body.style.overflowY = 'visible';
  }
  if (headerScroll) {
    headerScroll.scrollLeft = 0;
    headerScroll.style.overflow = 'visible';
  }
  if (scrollNav) scrollNav.style.display = 'none';

  return () => {
    if (body && originalScroll) {
      body.scrollLeft = originalScroll.left;
      body.scrollTop = originalScroll.top;
    }
    restore.reverse().forEach(fn => fn());
    element.classList.remove('exporting', 'exporting-full');
  };
}

async function waitForPaint() {
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => setTimeout(r, 80));
}

function getExportBackground() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  return value || '#0F172A';
}

function timestampForFilename() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

function excelSheetMeta(name) {
  return `<x:ExcelWorksheet><x:Name>${escapeXml(name)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>`;
}

function excelTable(name, headers, rows) {
  const headerCells = headers.map(value => `<th>${escapeHtml(value)}</th>`).join('');
  const bodyRows = rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('');

  return [
    `<table x:str><caption>${escapeHtml(name)}</caption>`,
    `<thead><tr>${headerCells}</tr></thead>`,
    `<tbody>${bodyRows}</tbody>`,
    '</table>',
    '<br>',
  ].join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}
