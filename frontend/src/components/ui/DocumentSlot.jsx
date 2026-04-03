import { useState } from 'react';
import { Upload, FileText, Image, X, Check } from 'lucide-react';

export default function DocumentSlot({ docName, description, paramFields = [], register, errors, prefix, watch, setValue }) {
  const availableField = `${prefix}.available`;
  const isAvailable = watch ? watch(availableField) : false;
  const [fileName, setFileName] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
      if (setValue) setValue(`${prefix}.file`, file);
    }
  };

  const clearFile = () => {
    setFileName(null);
    setPreview(null);
    if (setValue) setValue(`${prefix}.file`, null);
  };

  return (
    <div style={{
      border: '1.5px solid var(--color-border)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      background: isAvailable ? 'white' : 'rgba(241, 245, 249, 0.5)',
      transition: 'all 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{docName}</h4>
          {description && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>{description}</p>}
        </div>

        {/* Radio toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999,
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            background: isAvailable ? 'var(--color-success)' : 'transparent',
            color: isAvailable ? 'white' : 'var(--color-text-muted)',
            border: isAvailable ? 'none' : '1px solid var(--color-border)',
            transition: 'all 0.2s ease',
          }}>
            <input
              type="radio"
              value="true"
              {...(register ? register(availableField) : {})}
              style={{ display: 'none' }}
              onChange={() => setValue && setValue(availableField, true)}
            />
            <Check size={12} /> Available
          </label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999,
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            background: isAvailable === false || isAvailable === undefined || isAvailable === 'false' ? 'var(--color-text-muted)' : 'transparent',
            color: isAvailable === false || isAvailable === undefined || isAvailable === 'false' ? 'white' : 'var(--color-text-muted)',
            border: isAvailable === false || isAvailable === undefined || isAvailable === 'false' ? 'none' : '1px solid var(--color-border)',
            transition: 'all 0.2s ease',
          }}>
            <input
              type="radio"
              value="false"
              {...(register ? register(availableField) : {})}
              style={{ display: 'none' }}
              onChange={() => setValue && setValue(availableField, false)}
            />
            <X size={12} /> N/A
          </label>
        </div>
      </div>

      {/* Content when available */}
      {(isAvailable === true || isAvailable === 'true') && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          {/* File upload */}
          <div style={{ marginBottom: 16 }}>
            {!fileName ? (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '20px', borderRadius: 12, cursor: 'pointer',
                border: '2px dashed var(--color-border)', background: 'rgba(238, 240, 253, 0.5)',
                transition: 'all 0.2s ease',
              }}>
                <Upload size={24} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Click to upload document
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  PDF, JPG, PNG up to 5MB
                </span>
                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
              </label>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: 12, background: 'var(--color-primary-soft)',
              }}>
                {preview ? (
                  <img src={preview} alt="preview" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                )}
                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                  {fileName}
                </span>
                <button onClick={clearFile} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'var(--color-text-muted)',
                }}>
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Param fields */}
          {paramFields.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: paramFields.length > 1 ? '1fr 1fr' : '1fr', gap: 12 }}>
              {paramFields.map((field, idx) => (
                <div key={idx}>
                  <label className="form-label" htmlFor={`${prefix}.${field.name}`}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      id={`${prefix}.${field.name}`}
                      className="form-input"
                      {...(register ? register(`${prefix}.${field.name}`) : {})}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`${prefix}.${field.name}`}
                      type={field.type || 'text'}
                      className="form-input"
                      placeholder={field.placeholder || ''}
                      {...(register ? register(`${prefix}.${field.name}`) : {})}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
