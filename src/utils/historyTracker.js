let _idCounter = 1;

// Creates a history entry for a move operation.
export function createMoveEntry({ items, movedId, deltaDays, bundleId, affectedIds }) {
  const affectedItems = items
    .filter(i => affectedIds.has(i.id))
    .map(i => ({
      itemId: i.id,
      title: i.title,
      oldStart: i.start,
      oldEnd: i.end,
    }));

  const primary = items.find(i => i.id === movedId);

  return {
    id: `H-${String(_idCounter++).padStart(4, '0')}`,
    timestamp: Date.now(),
    action: bundleId ? 'bundle_move' : 'move',
    description: bundleId
      ? `Bundle "${bundleId}" shifted ${deltaDays > 0 ? '+' : ''}${deltaDays}d`
      : `"${primary?.title || movedId}" shifted ${deltaDays > 0 ? '+' : ''}${deltaDays}d`,
    deltaDays,
    bundleId: bundleId || null,
    affectedItems,
  };
}

// Creates a history entry for an add operation.
export function createAddEntry({ item }) {
  return {
    id: `H-${String(_idCounter++).padStart(4, '0')}`,
    timestamp: Date.now(),
    action: 'add',
    description: `Added "${item.title}"`,
    bundleId: null,
    affectedItems: [{ itemId: item.id, title: item.title, oldStart: null, oldEnd: null }],
  };
}

// Creates a history entry for an update operation.
export function createUpdateEntry({ itemId, title, changes }) {
  const descriptions = changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`);
  return {
    id: `H-${String(_idCounter++).padStart(4, '0')}`,
    timestamp: Date.now(),
    action: 'update',
    description: `Updated "${title}": ${descriptions.slice(0, 2).join(', ')}${descriptions.length > 2 ? ' …' : ''}`,
    bundleId: null,
    affectedItems: [{ itemId, title, changes }],
  };
}

// Creates a history entry for a delete operation.
export function createDeleteEntry({ item }) {
  return {
    id: `H-${String(_idCounter++).padStart(4, '0')}`,
    timestamp: Date.now(),
    action: 'delete',
    description: `Deleted "${item.title}"`,
    bundleId: null,
    affectedItems: [{ itemId: item.id, title: item.title, oldStart: item.start, oldEnd: item.end }],
  };
}

// Prepends an entry to the history array, capping at maxEntries.
export function pushHistory(history, entry, maxEntries = 100) {
  return [entry, ...history].slice(0, maxEntries);
}

export function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export const ACTION_LABELS = {
  move:        'Move',
  bundle_move: 'Bundle Move',
  add:         'Add',
  update:      'Update',
  delete:      'Delete',
};

export const ACTION_COLORS = {
  move:        '#3B82F6',
  bundle_move: '#F59E0B',
  add:         '#10B981',
  update:      '#6366F1',
  delete:      '#EF4444',
};
