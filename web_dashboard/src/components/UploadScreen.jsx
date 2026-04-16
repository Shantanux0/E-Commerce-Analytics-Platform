import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, X, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { processRetailData } from '../utils/processData';

export default function UploadScreen({ onData }) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | parsing | error
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      setStatus('error');
      return;
    }
    setFileName(file.name);
    setStatus('parsing');
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const analytics = processRetailData(results.data);
          if (analytics.rowCount === 0) {
            setError('No valid sales rows found. Make sure the CSV has InvoiceNo, Quantity, UnitPrice, CustomerID columns.');
            setStatus('error');
          } else {
            onData(analytics, file.name);
          }
        } catch (e) {
          setError('Failed to process the file: ' + e.message);
          setStatus('error');
        }
      },
      error: (err) => {
        setError('CSV parse error: ' + err.message);
        setStatus('error');
      }
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="upload-page">
      {/* Animated background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <motion.div
        className="upload-card"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Logo / Title */}
        <div className="upload-header">
          <div className="logo-badge">
            <FileText size={28} />
          </div>
          <h1 className="upload-title">Nexus Analytics</h1>
          <p className="upload-subtitle">
            Upload your e-commerce CSV to generate instant business intelligence
          </p>
        </div>

        {/* Drop Zone */}
        <motion.div
          className={`drop-zone ${dragging ? 'dragging' : ''} ${status === 'error' ? 'error' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current.click()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden-input"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <AnimatePresence mode="wait">
            {status === 'parsing' ? (
              <motion.div key="parsing" className="drop-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="spinner" />
                <p className="drop-title">Processing <strong>{fileName}</strong>…</p>
                <p className="drop-sub">Cleaning data & computing insights</p>
              </motion.div>
            ) : (
              <motion.div key="idle" className="drop-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <UploadCloud size={52} className="drop-icon" />
                <p className="drop-title">Drop your CSV here</p>
                <p className="drop-sub">or <span className="drop-link">click to browse</span></p>
                <div className="drop-badge">Supports: InvoiceNo, CustomerID, Quantity, UnitPrice, Country…</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              className="upload-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <X size={16} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expected columns */}
        <div className="columns-hint">
          <p className="hint-title">Expected CSV Columns</p>
          <div className="hint-tags">
            {['InvoiceNo','StockCode','Description','Quantity','InvoiceDate','UnitPrice','CustomerID','Country'].map(c => (
              <span key={c} className="hint-tag">{c}</span>
            ))}
          </div>
        </div>

        {/* Try with demo note */}
        <p className="demo-note">
          <CheckCircle size={14} /> Works with the standard&nbsp;<strong>Online Retail UCI dataset</strong>
        </p>
      </motion.div>
    </div>
  );
}
