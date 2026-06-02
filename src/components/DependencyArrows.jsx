import { useMemo } from 'react';
import { motion } from 'framer-motion';
import './DependencyArrows.css';

const ARROW_COLOR = '#6366F1';

function makePath(from, to) {
  const x1 = from.right;
  const y1 = from.centerY;
  const x2 = to.left;
  const y2 = to.centerY;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const curveR = Math.min(10, Math.abs(dy) / 2);

  if (Math.abs(dy) < 4) {
    const cy = y1 - 18;
    return `M${x1},${y1} Q${(x1 + x2) / 2},${cy} ${x2},${y2}`;
  }

  const elbowX = Math.max(x1 + 20, x2 - 20);
  const dir = dy > 0 ? 1 : -1;

  if (dx >= 40) {
    return [
      `M${x1},${y1}`,
      `H${elbowX - curveR}`,
      `Q${elbowX},${y1} ${elbowX},${y1 + dir * curveR}`,
      `V${y2 - dir * curveR}`,
      `Q${elbowX},${y2} ${elbowX + curveR},${y2}`,
      `H${x2}`,
    ].join(' ');
  }

  const loopX = x1 + 20;
  const midY  = (y1 + y2) / 2;
  return [
    `M${x1},${y1}`,
    `H${loopX + curveR}`,
    `Q${loopX + curveR + 8},${y1} ${loopX + curveR + 8},${y1 + dir * curveR}`,
    `V${midY - dir * curveR}`,
    `Q${loopX + curveR + 8},${midY} ${loopX},${midY}`,
    `V${y2 - dir * curveR}`,
    `Q${loopX},${y2} ${x2 - curveR},${y2}`,
    `H${x2}`,
  ].join(' ');
}

export default function DependencyArrows({ allItems, itemPositions, totalHeight, totalWidth }) {
  const arrows = useMemo(() => {
    const result = [];
    (allItems || []).forEach(item => {
      const toPos = itemPositions[item.id];
      if (!toPos) return;
      (item.dependsOn || []).forEach(dep => {
        const depId  = typeof dep === 'string' ? dep : dep.id;
        const fromPos = itemPositions[depId];
        if (!fromPos) return;
        result.push({
          key: `${depId}->${item.id}`,
          fromPos,
          toPos,
          depType: typeof dep === 'object' ? dep.type : 'FS',
        });
      });
    });
    return result;
  }, [allItems, itemPositions]);

  if (arrows.length === 0) return null;

  return (
    <svg className="dep-arrows-svg" style={{ width: totalWidth, height: totalHeight }}>
      <defs>
        <marker id="dep-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0.5 L5,3 L0,5.5 Z" fill={ARROW_COLOR} opacity="0.8" />
        </marker>
      </defs>
      {arrows.map(({ key, fromPos, toPos, depType }, i) => (
        <motion.path
          key={key}
          className="dep-arrow-path"
          d={makePath(fromPos, toPos)}
          stroke={ARROW_COLOR}
          strokeDasharray={depType === 'FS' ? 'none' : '5 3'}
          markerEnd="url(#dep-arrow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.55 }}
          transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
        />
      ))}
    </svg>
  );
}
