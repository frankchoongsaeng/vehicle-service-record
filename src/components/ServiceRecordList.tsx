import type { ServiceRecord, Vehicle } from '../types';
import { SERVICE_TYPES } from '../types';

interface Props {
  vehicle: Vehicle;
  records: ServiceRecord[];
  onAdd: () => void;
  onEdit: (record: ServiceRecord) => void;
  onDelete: (record: ServiceRecord) => void;
  onBack: () => void;
}

const serviceLabel = (value: string) =>
  SERVICE_TYPES.find(t => t.value === value)?.label ?? value;

const SERVICE_ICONS: Record<string, string> = {
  oil_change: '🛢️',
  tire_rotation: '🔄',
  brake_service: '🛑',
  tire_replacement: '🔵',
  battery: '🔋',
  air_filter: '💨',
  cabin_filter: '🌬️',
  transmission: '⚙️',
  coolant: '❄️',
  spark_plugs: '⚡',
  timing_belt: '🔗',
  wiper_blades: '🌧️',
  inspection: '🔍',
  other: '🔧',
};

export default function ServiceRecordList({
  vehicle,
  records,
  onAdd,
  onEdit,
  onDelete,
  onBack,
}: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}>
            ← Back
          </button>
          <div>
            <h1>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p className="subtitle">
              {vehicle.color && `${vehicle.color} · `}
              {vehicle.mileage != null &&
                `${vehicle.mileage.toLocaleString()} mi`}
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={onAdd}>
          + Add Record
        </button>
      </header>

      {records.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔧</span>
          <h3>No service records yet</h3>
          <p>Start tracking maintenance and repairs for this vehicle.</p>
          <button className="btn-primary" onClick={onAdd}>
            + Add Record
          </button>
        </div>
      ) : (
        <div className="records-list">
          {records.map(r => (
            <div key={r.id} className="record-card">
              <div className="record-icon">
                {SERVICE_ICONS[r.service_type] ?? '🔧'}
              </div>
              <div className="record-body">
                <div className="record-header-row">
                  <span className="record-type">{serviceLabel(r.service_type)}</span>
                  <span className="record-date">
                    {new Date(r.date + 'T00:00:00').toLocaleDateString(
                      undefined,
                      { year: 'numeric', month: 'short', day: 'numeric' }
                    )}
                  </span>
                </div>
                <div className="record-description">{r.description}</div>
                <div className="record-meta">
                  {r.mileage != null && (
                    <span className="record-badge">
                      📍 {r.mileage.toLocaleString()} mi
                    </span>
                  )}
                  {r.cost != null && (
                    <span className="record-badge">
                      💵 ${r.cost.toFixed(2)}
                    </span>
                  )}
                </div>
                {r.notes && <p className="record-notes">{r.notes}</p>}
              </div>
              <div className="record-actions">
                <button
                  className="btn-icon"
                  title="Edit record"
                  onClick={() => onEdit(r)}
                >
                  ✏️
                </button>
                <button
                  className="btn-icon btn-danger"
                  title="Delete record"
                  onClick={() => onDelete(r)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
