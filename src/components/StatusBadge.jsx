import {
  Circle, Clock, CheckCircle2, AlertTriangle,
  PowerOff, Power, Diamond, Wrench, Ban, Layers,
} from 'lucide-react';
import { STATUS_CONFIG } from '../config/theme';

const ICONS = {
  Circle, Clock, CheckCircle2, AlertTriangle,
  PowerOff, Power, Diamond, Wrench, Ban, Layers,
};

export default function StatusBadge({ status, size = 'sm', showIcon = true }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Planned'];
  const Icon = ICONS[cfg.icon] || Circle;
  const iconSize = size === 'xs' ? 9 : size === 'sm' ? 11 : 13;
  const fontSize = size === 'xs' ? 10 : size === 'sm' ? 11 : 12;

  return (
    <span
      className="status-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'xs' ? '2px 6px' : '3px 8px',
        borderRadius: 20,
        fontSize,
        fontWeight: 500,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}30`,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {showIcon && <Icon size={iconSize} />}
      {cfg.label}
    </span>
  );
}
