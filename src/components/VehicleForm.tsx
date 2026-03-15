import { useState } from 'react';
import type { Vehicle, VehicleInput } from '../types';

interface Props {
  initial?: Vehicle;
  onSubmit: (data: VehicleInput) => Promise<void>;
  onCancel: () => void;
}

export default function VehicleForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<VehicleInput>({
    make: initial?.make ?? '',
    model: initial?.model ?? '',
    year: initial?.year ?? new Date().getFullYear(),
    vin: initial?.vin ?? '',
    mileage: initial?.mileage ?? undefined,
    color: initial?.color ?? '',
    notes: initial?.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof VehicleInput, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        year: Number(form.year),
        mileage: form.mileage ? Number(form.mileage) : undefined,
        vin: form.vin || undefined,
        color: form.color || undefined,
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
      <h2>{initial ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
      {error && <p className="form-error">{error}</p>}

      <div className="form-row">
        <div className="form-group">
          <label>Make *</label>
          <input
            type="text"
            value={form.make}
            onChange={e => set('make', e.target.value)}
            placeholder="e.g. Toyota"
            required
          />
        </div>
        <div className="form-group">
          <label>Model *</label>
          <input
            type="text"
            value={form.model}
            onChange={e => set('model', e.target.value)}
            placeholder="e.g. Camry"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Year *</label>
          <input
            type="number"
            value={form.year}
            onChange={e => set('year', e.target.value)}
            min="1900"
            max={new Date().getFullYear() + 1}
            required
          />
        </div>
        <div className="form-group">
          <label>Color</label>
          <input
            type="text"
            value={form.color ?? ''}
            onChange={e => set('color', e.target.value)}
            placeholder="e.g. Silver"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Current Mileage</label>
          <input
            type="number"
            value={form.mileage ?? ''}
            onChange={e => set('mileage', e.target.value)}
            placeholder="e.g. 45000"
            min="0"
          />
        </div>
        <div className="form-group">
          <label>VIN</label>
          <input
            type="text"
            value={form.vin ?? ''}
            onChange={e => set('vin', e.target.value)}
            placeholder="Vehicle Identification Number"
            maxLength={17}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any additional notes about this vehicle"
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Vehicle'}
        </button>
      </div>
    </form>
  );
}
