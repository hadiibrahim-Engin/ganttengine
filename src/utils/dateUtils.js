export const parseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
};

export const diffDays = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((e - s) / 86400000);
};

export const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const getDaysInMonth = (year, month) =>
  new Date(year, month + 1, 0).getDate();

export const formatDate = (date) =>
  date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

export const formatDateShort = (date) =>
  date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });

export const formatDateISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ISO 8601 calendar week number
export const getISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// ISO week year (may differ from calendar year in Jan/Dec)
export const getISOWeekYear = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
};

export const getQuarter = (date) => Math.floor(date.getMonth() / 3) + 1;

export const generateMonths = (start, end) => {
  const months = [];
  let d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    months.push({
      date: new Date(d),
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      shortLabel: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      tinyLabel: d.toLocaleDateString('en-GB', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      startDate: new Date(d),
      endDate: new Date(monthEnd),
      daysInMonth: getDaysInMonth(d.getFullYear(), d.getMonth()),
    });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return months;
};

export const generateQuarters = (start, end) => {
  const quarters = [];
  let y = start.getFullYear();
  let q = getQuarter(start);
  while (true) {
    const qStartMonth = (q - 1) * 3;
    const qStart = new Date(y, qStartMonth, 1);
    const qEnd = new Date(y, qStartMonth + 3, 0);
    if (qStart > end) break;
    quarters.push({
      label: `Q${q} ${y}`,
      shortLabel: `Q${q}`,
      startDate: qStart,
      endDate: qEnd,
      year: y,
      quarter: q,
    });
    q++;
    if (q > 4) { q = 1; y++; }
  }
  return quarters;
};

export const generateYears = (start, end) => {
  const years = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    years.push({
      label: String(y),
      startDate: new Date(y, 0, 1),
      endDate: new Date(y, 11, 31),
      year: y,
    });
  }
  return years;
};

export const generateWeeks = (start, end) => {
  const weeks = [];
  let weekStart = new Date(start);
  // Align to Monday
  const dayOfWeek = weekStart.getDay();
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysBack);

  while (weekStart <= end) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const cw = getISOWeek(weekStart);
    const yr = getISOWeekYear(weekStart);
    weeks.push({
      date: new Date(weekStart),
      label: `CW ${cw}`,
      shortLabel: `${cw}`,
      isoWeek: cw,
      isoYear: yr,
      startDate: new Date(weekStart),
      endDate: new Date(weekEnd),
    });
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
  }
  return weeks;
};

export const generateDays = (start, totalDays) => {
  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(start, i);
    days.push({
      date: d,
      label: d.getDate().toString(),
      dayOfWeek: d.getDay(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }
  return days;
};

export const shiftDate = (dateStr, deltaDays) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + deltaDays);
  return formatDateISO(date);
};

export const snapDelta = (deltaDays, snapMode, referenceDate) => {
  switch (snapMode) {
    case 'none':  return deltaDays;
    case 'day':   return Math.round(deltaDays);
    case 'week':  return Math.round(deltaDays / 7) * 7;
    case 'month': {
      const ref = typeof referenceDate === 'string' ? parseDate(referenceDate) : referenceDate;
      const target = addDays(ref, deltaDays);
      const snapped = new Date(target.getFullYear(), target.getMonth(), 1);
      return diffDays(ref, snapped);
    }
    default: return Math.round(deltaDays);
  }
};

export const getTaskId = (task) =>
  task.id || `${task.project_name || task.projectId}|${task.line_name || task.assetId}|${task.start_date || task.start}`;

export const getDuration = (startStr, endStr) => {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const days = diffDays(start, end);
  if (days === 0) return 'Single day';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  if (rem === 0) return weeks === 1 ? '1 week' : `${weeks} weeks`;
  return `${weeks}w ${rem}d`;
};
