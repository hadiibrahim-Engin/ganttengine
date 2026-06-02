import { PROJECT_PALETTE } from '../config/theme';

// Builds a stable color map from an array of project IDs or names.
export const createColorMap = (ids) => {
  const unique = [...new Set(ids)].sort();
  const map = {};
  unique.forEach((id, i) => {
    map[id] = PROJECT_PALETTE[i % PROJECT_PALETTE.length];
  });
  return map;
};
