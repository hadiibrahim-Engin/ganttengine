const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED = ['project_name', 'line_name', 'start_date', 'end_date'];

export const validateGanttData = (data) => {
  if (!Array.isArray(data)) {
    return { valid: false, error: 'Root element must be a JSON array.' };
  }
  if (data.length === 0) {
    return { valid: false, error: 'Array must contain at least one task.' };
  }

  for (let i = 0; i < data.length; i++) {
    const task = data[i];

    if (typeof task !== 'object' || Array.isArray(task) || task === null) {
      return { valid: false, error: `Item at index ${i} must be an object.` };
    }

    for (const field of REQUIRED) {
      if (!task[field] || typeof task[field] !== 'string' || !task[field].trim()) {
        return {
          valid: false,
          error: `Item [${i}]: missing or empty required field "${field}".`,
        };
      }
    }

    if (!DATE_RE.test(task.start_date)) {
      return {
        valid: false,
        error: `Item [${i}]: start_date "${task.start_date}" must be YYYY-MM-DD.`,
      };
    }
    if (!DATE_RE.test(task.end_date)) {
      return {
        valid: false,
        error: `Item [${i}]: end_date "${task.end_date}" must be YYYY-MM-DD.`,
      };
    }

    const start = new Date(task.start_date);
    const end = new Date(task.end_date);

    if (isNaN(start.getTime())) {
      return { valid: false, error: `Item [${i}]: start_date is not a valid date.` };
    }
    if (isNaN(end.getTime())) {
      return { valid: false, error: `Item [${i}]: end_date is not a valid date.` };
    }
    if (start > end) {
      return {
        valid: false,
        error: `Item [${i}]: start_date must not be after end_date.`,
      };
    }
  }

  return { valid: true, error: null };
};
