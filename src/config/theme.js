export const ITEM_TYPE_CONFIG = {
  Task: {
    label: 'Task',
    color: '#5B8FF9',
    gradient: 'linear-gradient(90deg, #3B74F0 0%, #6FA3FF 100%)',
    glow: '#5B8FF960',
    light: '#5B8FF918',
    shape: 'bar',
    icon: 'Layers',
    order: 1,
  },
  Milestone: {
    label: 'Milestone',
    color: '#B06FFF',
    gradient: 'linear-gradient(135deg, #8B3FF5 0%, #C87AFF 100%)',
    glow: '#B06FFF60',
    light: '#B06FFF18',
    shape: 'diamond',
    icon: 'Diamond',
    order: 2,
  },
  OutOfOperation: {
    label: 'Out of Operation',
    color: '#FF4D5B',
    gradient: 'linear-gradient(90deg, #D62839 0%, #FF6270 100%)',
    glow: '#FF4D5B60',
    light: '#FF4D5B18',
    shape: 'bar-striped',
    icon: 'PowerOff',
    order: 3,
  },
  BackInOperation: {
    label: 'Back in Operation',
    color: '#1ECC8A',
    gradient: 'linear-gradient(90deg, #0FAF72 0%, #3DDBA0 100%)',
    glow: '#1ECC8A60',
    light: '#1ECC8A18',
    shape: 'bar-event',
    icon: 'Power',
    order: 4,
  },
  Maintenance: {
    label: 'Maintenance',
    color: '#F5A524',
    gradient: 'linear-gradient(90deg, #D98B0A 0%, #FFB940 100%)',
    glow: '#F5A52460',
    light: '#F5A52418',
    shape: 'bar',
    icon: 'Wrench',
    order: 5,
  },
};

export const STATUS_CONFIG = {
  Planned:           { color: '#8DA4C4', bg: '#8DA4C418', label: 'Planned',           icon: 'Circle' },
  'In Progress':     { color: '#5B8FF9', bg: '#5B8FF918', label: 'In Progress',       icon: 'Clock' },
  Done:              { color: '#1ECC8A', bg: '#1ECC8A18', label: 'Done',              icon: 'CheckCircle2' },
  Delayed:           { color: '#FF4D5B', bg: '#FF4D5B18', label: 'Delayed',           icon: 'AlertTriangle' },
  'Out of Operation':{ color: '#FF4D5B', bg: '#FF4D5B18', label: 'Out of Operation',  icon: 'PowerOff' },
  'Back in Operation':{ color:'#1ECC8A', bg: '#1ECC8A18', label:'Back in Operation',  icon: 'Power' },
  Milestone:         { color: '#B06FFF', bg: '#B06FFF18', label: 'Milestone',         icon: 'Diamond' },
  Maintenance:       { color: '#F5A524', bg: '#F5A52418', label: 'Maintenance',       icon: 'Wrench' },
  Blocked:           { color: '#FF4D5B', bg: '#FF4D5B18', label: 'Blocked',           icon: 'Ban' },
};

export const PROJECT_PALETTE = [
  { primary: '#7C8DF7', gradient: 'linear-gradient(90deg,#5B6CF8,#9AABFF)', glow: '#7C8DF760', light: '#7C8DF718' },
  { primary: '#5B8FF9', gradient: 'linear-gradient(90deg,#3B74F0,#7AABFF)', glow: '#5B8FF960', light: '#5B8FF918' },
  { primary: '#1ECC8A', gradient: 'linear-gradient(90deg,#0FAF72,#3DDBA0)', glow: '#1ECC8A60', light: '#1ECC8A18' },
  { primary: '#F5A524', gradient: 'linear-gradient(90deg,#D98B0A,#FFB940)', glow: '#F5A52460', light: '#F5A52418' },
  { primary: '#F06292', gradient: 'linear-gradient(90deg,#E91E63,#FF8FB1)', glow: '#F0629260', light: '#F0629218' },
  { primary: '#26C6DA', gradient: 'linear-gradient(90deg,#0097A7,#4DD0E1)', glow: '#26C6DA60', light: '#26C6DA18' },
  { primary: '#AB47BC', gradient: 'linear-gradient(90deg,#8E24AA,#CE93D8)', glow: '#AB47BC60', light: '#AB47BC18' },
  { primary: '#8BC34A', gradient: 'linear-gradient(90deg,#689F38,#AED581)', glow: '#8BC34A60', light: '#8BC34A18' },
  { primary: '#FF7043', gradient: 'linear-gradient(90deg,#E64A19,#FF8A65)', glow: '#FF704360', light: '#FF704318' },
  { primary: '#26A69A', gradient: 'linear-gradient(90deg,#00796B,#4DB6AC)', glow: '#26A69A60', light: '#26A69A18' },
];

export const ZOOM_PRESETS = {
  day:     { label: 'Day',     pixelsPerDay: 48,   subUnit: 'day' },
  week:    { label: 'Week',    pixelsPerDay: 20,   subUnit: 'week' },
  month:   { label: 'Month',   pixelsPerDay: 6,    subUnit: 'week' },
  quarter: { label: 'Quarter', pixelsPerDay: 2,    subUnit: 'month' },
  year:    { label: 'Year',    pixelsPerDay: 0.55, subUnit: 'month' },
};

export const SNAP_OPTIONS = [
  { value: 'none',  label: 'Free' },
  { value: 'day',   label: 'Day' },
  { value: 'week',  label: 'Week' },
  { value: 'month', label: 'Month' },
];

export const GROUPING_OPTIONS = [
  { value: 'asset',      label: 'By Asset' },
  { value: 'project',    label: 'By Project' },
  { value: 'department', label: 'By Department' },
  { value: 'owner',      label: 'By Owner' },
  { value: 'status',     label: 'By Status' },
];

export const ANIM = {
  spring: { type: 'spring', stiffness: 320, damping: 28 },
  smooth: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  fast:   { duration: 0.15 },
  modal:  { type: 'spring', stiffness: 380, damping: 28, mass: 0.75 },
};

export const LAYOUT = {
  LEFT_WIDTH:    280,
  TRACK_HEIGHT:  38,
  ROW_PADDING:   8,
  BAR_HEIGHT:    26,
  DIAMOND_SIZE:  22,
  HEADER_MONTH:  34,
  HEADER_SUB:    26,
};
