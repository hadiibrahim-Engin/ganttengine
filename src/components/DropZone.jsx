import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileJson, AlertCircle, X, Play } from 'lucide-react';
import { validateGanttData } from '../utils/validateJson';
import './DropZone.css';

export default function DropZone({ onData, onError, error, onDismissError }) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      onError('Only JSON files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const { valid, error: ve } = validateGanttData(parsed);
        if (!valid) {
          onError(ve);
        } else {
          onData(parsed);
        }
      } catch {
        onError('Invalid JSON: file could not be parsed.');
      }
    };
    reader.readAsText(file);
  }, [onData, onError]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragging(false);
    }
  }, []);

  const handleFileChange = useCallback((e) => {
    processFile(e.target.files[0]);
    e.target.value = '';
  }, [processFile]);

  const loadExample = useCallback(() => {
    fetch('/example.json')
      .then(r => r.json())
      .then(data => {
        const { valid, error: ve } = validateGanttData(data);
        if (valid) onData(data);
        else onError(ve);
      })
      .catch(() => onError('Could not load example file.'));
  }, [onData, onError]);

  return (
    <div className="dropzone-wrapper">
      <motion.div
        className="dropzone-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence>
          {error && (
            <motion.div
              className="error-banner"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
              <span className="error-banner-text">{error}</span>
              <button className="error-banner-close" onClick={onDismissError}>
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={`dropzone-area${dragging ? ' dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="dropzone-file-input"
            onChange={handleFileChange}
          />

          <motion.div
            className="dropzone-icon-wrapper"
            animate={dragging ? { scale: 1.08 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {dragging ? <Upload size={36} color="white" /> : <FileJson size={36} color="white" />}
          </motion.div>

          <div>
            <div className="dropzone-title">
              {dragging ? 'Drop to Import' : 'Import Your Schedule'}
            </div>
          </div>

          <div className="dropzone-subtitle">
            Drag & drop a JSON file here<br />or click to browse
          </div>

          <div className="dropzone-divider">
            <div className="dropzone-divider-line" />
            <span className="dropzone-divider-text">or</span>
            <div className="dropzone-divider-line" />
          </div>

          <button className="dropzone-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            <Upload size={16} />
            Choose File
          </button>

          <span className="dropzone-hint">Supports .json files</span>
        </div>

        <div className="dropzone-info">
          <div className="dropzone-info-section">
            <div className="dropzone-info-title">Expected Format</div>
            <div className="dropzone-info-code">
              {`[{\n  "project_name": "...",\n  "line_name": "Line 1",\n  "start_date": "2028-01-10",\n  "end_date": "2028-03-15"\n}]`}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div className="dropzone-info-title">Quick Start</div>
            <button className="dropzone-demo-btn" onClick={(e) => { e.stopPropagation(); loadExample(); }}>
              <Play size={13} />
              Load Example
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
