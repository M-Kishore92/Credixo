import { motion } from 'framer-motion';
import { FileCheck, AlertTriangle } from 'lucide-react';
import DocumentSlot from '../ui/DocumentSlot';

const DOCUMENT_CONFIGS = [
  {
    name: 'Electricity Bill',
    description: 'Recent electricity bill showing payment history',
    prefix: 'doc_electricity',
    params: [
      { name: 'avg_bill', label: 'Avg Bill Amount (₹)', type: 'number', placeholder: 'e.g. 500' },
      { name: 'regularity', label: 'Payment Regularity', type: 'select', options: ['Always on time', 'Usually on time', 'Sometimes late', 'Often late'] },
    ],
  },
  {
    name: 'No Income Certificate',
    description: 'Certificate from local authority confirming income status',
    prefix: 'doc_income_cert',
    params: [
      { name: 'authority', label: 'Issuing Authority', type: 'text', placeholder: 'e.g. Village Officer' },
      { name: 'date_issued', label: 'Date of Issue', type: 'date' },
      { name: 'declared_income', label: 'Declared Income (₹)', type: 'number', placeholder: '0' },
    ],
  },
  {
    name: 'Ration Card',
    description: 'Government-issued ration card',
    prefix: 'doc_ration',
    params: [
      { name: 'card_type', label: 'Card Type', type: 'select', options: ['BPL', 'APL', 'Antyodaya'] },
    ],
  },
  {
    name: 'Land Document (Patta / Chitta)',
    description: 'Land ownership or cultivation document',
    prefix: 'doc_land',
    params: [
      { name: 'land_size', label: 'Land Size', type: 'select', options: ['Below 1 acre', '1-3 acres', 'Above 3 acres'] },
      { name: 'land_type', label: 'Land Type', type: 'select', options: ['Agricultural', 'Residential', 'Commercial'] },
    ],
  },
  {
    name: 'Bank Passbook',
    description: 'Recent bank passbook or statement',
    prefix: 'doc_passbook',
    params: [
      { name: 'avg_balance', label: 'Avg Monthly Balance (₹)', type: 'number', placeholder: 'e.g. 5000' },
      { name: 'account_since', label: 'Account Active Since (Year)', type: 'number', placeholder: 'e.g. 2018' },
    ],
  },
  {
    name: 'Aadhaar Card',
    description: 'Aadhaar identification card',
    prefix: 'doc_aadhaar',
    params: [
      { name: 'area_confirm', label: 'Area Type Confirmation', type: 'select', options: ['Urban', 'Semi-urban', 'Rural'] },
    ],
  },
];

export default function SectionDocuments({ register, errors, watch, setValue }) {
  const docsAvailable = DOCUMENT_CONFIGS.filter((d) => {
    const val = watch?.(`${d.prefix}.available`);
    return val === true || val === 'true';
  }).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>Document Upload</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
        Upload available documents to strengthen the application
      </p>

      {/* Document Summary Bar */}
      <div style={{
        padding: '14px 20px',
        borderRadius: 14,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: docsAvailable >= 3 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
        border: `1px solid ${docsAvailable >= 3 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
      }}>
        {docsAvailable >= 3 ? (
          <FileCheck size={20} style={{ color: 'var(--color-success)' }} />
        ) : (
          <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
        )}
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0, color: docsAvailable >= 3 ? '#065F46' : '#92400E' }}>
            {docsAvailable} of 6 documents submitted
          </p>
          <p style={{ fontSize: '0.8rem', margin: '2px 0 0', color: docsAvailable >= 3 ? '#065F46' : '#92400E', opacity: 0.8 }}>
            {docsAvailable >= 3
              ? 'Good document coverage'
              : 'Low document coverage — application will be routed to Human Review'}
          </p>
        </div>
      </div>

      {/* Document Slots */}
      {DOCUMENT_CONFIGS.map((doc) => (
        <DocumentSlot
          key={doc.prefix}
          docName={doc.name}
          description={doc.description}
          paramFields={doc.params}
          prefix={doc.prefix}
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
        />
      ))}
    </motion.div>
  );
}
