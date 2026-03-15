import { useState } from 'react';
import type { ServiceRecord, ServiceRecordInput } from '../types';
import { SERVICE_TYPES } from '../types';

interface Props {
  initial?: ServiceRecord;
  onSubmit: (data: ServiceRecordInput) => Promise<void>;
  onCancel: () => void;
}

export default function ServiceRecordForm({
  initial,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<ServiceRecordInput>({
    service_type: initial?.service_type ?? 'oil_change',
    description: initial?.description ?? '',
    date: initial?.date ?? new Date().toISOString().slice(0, 10),
    mileage: initial?.mileage ?? undefined,
    cost: initial?.cost ?? undefined,
    notes: initial?.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof ServiceRecordInput>(
    field: K,
    value: ServiceRecordInput[K]
  ) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        notes: form.notes || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>{initial ? 'Edit Service Record' : 'Add Service Record'}</h2>
      {error && <p className="form-error">{error}</p>}

      <div className="form-row">
        <div className="form-group">
          <label>Service Type *</label>
          <select
            value={form.service_type}
            onChange={e =>
              set(
                'service_type',
                e.target.value as ServiceRecordInput['service_type']
              )
            }
            required
          >
            {SERVICE_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Description *</label>
        <input
          type="text"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="e.g. Full synthetic 5W-30 oil change + filter"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Mileage at Service</label>
          <input
            type="number"
            value={form.mileage ?? ''}
            onChange={e =>
              set('mileage', e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder="e.g. 45000"
            min="0"
          />
        </div>
        <div className="form-group">
          <label>Cost ($)</label>
          <input
            type="number"
            value={form.cost ?? ''}
            onChange={e =>
              set('cost', e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder="e.g. 75.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any additional notes"
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Record'}
        </button>
      </div>
    </form>
  );
}
