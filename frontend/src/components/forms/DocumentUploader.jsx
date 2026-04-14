import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, X, Sparkles } from 'lucide-react';
import { extractFieldFromDocument } from '../../api/documentExtractor';

const STATES = { IDLE: 'idle', SELECTED: 'file_selected', EXTRACTING: 'extracting', EXTRACTED: 'extracted', ERROR: 'error' };

export default function DocumentUploader({
  fieldName,
  label,
  extractionPrompt,
  acceptedFormats = 'image/*,application/pdf',
  setValue,
  currentValue,
  onExtracted,
}) {
  const [uiState, setUiState] = useState(STATES.IDLE);
  const [fileName, setFileName] = useState(null);
  const [extractedDisplay, setExtractedDisplay] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const fileObjRef = useRef(null); // store file temporarily during extraction only

  const handleFile = (file) => {
    if (!file) return;
    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) {
      setErrorMsg('File exceeds 5MB limit. Please choose a smaller file.');
      setUiState(STATES.ERROR);
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Unsupported format. Use JPG, PNG, WEBP, or PDF.');
      setUiState(STATES.ERROR);
      return;
    }
    fileObjRef.current = file;
    setFileName(file.name);
    setErrorMsg(null);
    setExtractedDisplay(null);
    setUiState(STATES.SELECTED);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const onFileChange = (e) => { handleFile(e.target.files[0]); };

  const handleExtract = async () => {
    if (!fileObjRef.current) return;
    setUiState(STATES.EXTRACTING);
    try {
      const result = await extractFieldFromDocument(fileObjRef.current, extractionPrompt);
      // Discard the file object after extraction to free memory
      fileObjRef.current = null;

      if (!result || result.value === undefined) {
        throw new Error('No value could be extracted from the document.');
      }
      if (result.confidence === 'low') {
        setErrorMsg(result.reason || 'Confidence too low to auto-fill. Please enter manually.');
        setUiState(STATES.ERROR);
        return;
      }

      // Auto-fill the form field
      const val = result.value;
      setValue(fieldName, val, { shouldValidate: true, shouldDirty: true });
      setValue(`source_${fieldName}`, 'document');
      setExtractedDisplay(result.display || String(val));
      setUiState(STATES.EXTRACTED);
      onExtracted?.(val, result);
    } catch (err) {
      fileObjRef.current = null;
      setErrorMsg(err.message || 'Extraction failed. Please try again or enter manually.');
      setUiState(STATES.ERROR);
    }
  };

  const reset = () => {
    fileObjRef.current = null;
    setFileName(null);
    setExtractedDisplay(null);
    setErrorMsg(null);
    setUiState(STATES.IDLE);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Shared container style ──
  const containerStyle = {
    marginTop: 10,
    borderRadius: 14,
    border: `1.5px dashed ${
      uiState === STATES.EXTRACTED ? 'rgba(16,185,129,0.4)' :
      uiState === STATES.ERROR    ? 'rgba(239,68,68,0.4)' :
      isDragging                  ? 'rgba(91,110,232,0.6)' :
                                    'rgba(91,110,232,0.25)'
    }`,
    background: `${
      uiState === STATES.EXTRACTED ? 'rgba(16,185,129,0.04)' :
      uiState === STATES.ERROR    ? 'rgba(239,68,68,0.04)' :
      isDragging                  ? 'rgba(91,110,232,0.06)' :
                                    'rgba(255,255,255,0.5)'
    }`,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    padding: '14px 18px',
    transition: 'border-color 0.2s, background 0.2s',
  };

  return (
    <div style={{ marginTop: 12 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Sparkles size={13} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 600,
          padding: '2px 10px', borderRadius: 999,
          background: 'rgba(167,139,250,0.1)', color: 'var(--color-accent)',
        }}>
          optional · AI reads document
        </span>
      </div>

      <div
        style={containerStyle}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <AnimatePresence mode="wait">

          {/* ── IDLE ── */}
          {uiState === STATES.IDLE && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ textAlign: 'center', paddingTop: 4, paddingBottom: 4 }}
            >
              <Upload size={22} style={{ color: 'var(--color-primary)', opacity: 0.6, marginBottom: 6 }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                Drop file here or{' '}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{ color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                >
                  click to browse
                </button>
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                JPG · PNG · WEBP · PDF &nbsp;|&nbsp; Max 5 MB
              </p>
              <input
                ref={fileRef}
                type="file"
                accept={acceptedFormats}
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
            </motion.div>
          )}

          {/* ── FILE SELECTED ── */}
          {uiState === STATES.SELECTED && (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
            >
              <FileText size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fileName}
              </span>
              <button
                type="button"
                onClick={handleExtract}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: 'var(--color-primary)', color: 'white',
                  fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(91,110,232,0.3)',
                  transition: 'background 0.2s',
                }}
              >
                <Sparkles size={13} /> Extract with AI
              </button>
              <button type="button" onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
                <X size={15} />
              </button>
            </motion.div>
          )}

          {/* ── EXTRACTING ── */}
          {uiState === STATES.EXTRACTING && (
            <motion.div
              key="extracting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <Loader size={18} style={{ color: 'var(--color-primary)', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Reading document with Claude AI…
              </span>
            </motion.div>
          )}

          {/* ── EXTRACTED ── */}
          {uiState === STATES.EXTRACTED && (
            <motion.div
              key="extracted"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
            >
              <CheckCircle size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#065F46' }}>
                  Extracted: {extractedDisplay}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  — review and edit the field above if needed
                </span>
              </div>
              <button type="button" onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, fontSize: '0.72rem' }}>
                Re-upload
              </button>
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {uiState === STATES.ERROR && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
            >
              <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-danger)', fontWeight: 600, margin: 0 }}>
                  {errorMsg || 'Extraction failed'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                  You can still enter the value manually in the field above.
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.78rem', padding: '2px 0', whiteSpace: 'nowrap' }}
              >
                Try again
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
