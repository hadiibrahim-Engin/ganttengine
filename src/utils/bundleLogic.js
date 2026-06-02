import { shiftDate } from './dateUtils';

// Returns a new items array with all bundle members (and transitive dependents)
// shifted by deltaDays, preserving relative timing.
export function applyBundleMove(items, movedItemId, deltaDays) {
  const movedItem = items.find(i => i.id === movedItemId);
  if (!movedItem) return items;

  // Collect all IDs that must shift
  const idsToShift = getBundleIds(items, movedItem);

  return items.map(item => {
    if (!idsToShift.has(item.id)) return item;
    return {
      ...item,
      start: shiftDate(item.start, deltaDays),
      end:   shiftDate(item.end,   deltaDays),
    };
  });
}

// Collects all item IDs belonging to the same bundle as the given item.
// If the item has no bundleId, returns only the item itself.
function getBundleIds(items, movedItem) {
  const ids = new Set([movedItem.id]);

  if (movedItem.bundleId) {
    for (const item of items) {
      if (item.bundleId === movedItem.bundleId) {
        ids.add(item.id);
      }
    }
  }

  return ids;
}

// Returns all items that belong to the same bundle as the given bundleId.
export function getBundleMembers(items, bundleId) {
  if (!bundleId) return [];
  return items.filter(i => i.bundleId === bundleId);
}

// Returns all unique bundle IDs present in the items list.
export function getAllBundleIds(items) {
  const ids = new Set();
  for (const item of items) {
    if (item.bundleId) ids.add(item.bundleId);
  }
  return [...ids];
}
