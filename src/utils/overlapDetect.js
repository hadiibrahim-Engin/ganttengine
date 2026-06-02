// Overlap detection and track assignment for visual stacking of items within a row.

// Returns whether two items overlap in time.
function itemsOverlap(a, b) {
  return a.start <= b.end && b.start <= a.end;
}

// Greedy interval scheduling: assigns each item to the lowest track
// where it doesn't overlap with the last item in that track.
// Returns { trackMap: Map<itemId, trackIndex>, numTracks }
export function assignTracks(items) {
  if (!items || items.length === 0) return { trackMap: new Map(), numTracks: 1 };

  const sorted = [...items].sort((a, b) => {
    if (a.start < b.start) return -1;
    if (a.start > b.start) return 1;
    return 0;
  });

  const trackMap = new Map();
  // Each track holds the last item placed in it (for end-date comparison)
  const trackLastEnd = [];

  for (const item of sorted) {
    let placed = false;
    for (let t = 0; t < trackLastEnd.length; t++) {
      if (trackLastEnd[t] < item.start) {
        trackMap.set(item.id, t);
        trackLastEnd[t] = item.end;
        placed = true;
        break;
      }
    }
    if (!placed) {
      trackMap.set(item.id, trackLastEnd.length);
      trackLastEnd.push(item.end);
    }
  }

  return { trackMap, numTracks: Math.max(1, trackLastEnd.length) };
}

// Returns a Map<itemId, overlappingItemIds[]> across all items.
// Two items overlap if they share the same row entity (assetId or groupKey)
// and their date ranges intersect.
export function detectOverlaps(items, getGroupKey) {
  const overlapMap = new Map();
  items.forEach(i => overlapMap.set(i.id, []));

  // Group by whatever key determines the row
  const groups = new Map();
  for (const item of items) {
    const key = getGroupKey ? getGroupKey(item) : (item.assetId || item.projectId || '_');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  for (const groupItems of groups.values()) {
    for (let i = 0; i < groupItems.length; i++) {
      for (let j = i + 1; j < groupItems.length; j++) {
        const a = groupItems[i];
        const b = groupItems[j];
        if (itemsOverlap(a, b)) {
          overlapMap.get(a.id).push(b.id);
          overlapMap.get(b.id).push(a.id);
        }
      }
    }
  }

  return overlapMap;
}

// Returns whether a given item overlaps with any other item in the dataset.
export function hasOverlap(itemId, overlapMap) {
  return (overlapMap.get(itemId) || []).length > 0;
}
