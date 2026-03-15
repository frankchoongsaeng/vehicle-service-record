import type { Vehicle } from '../types';

interface Props {
  vehicles: Vehicle[];
  onSelect: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onAdd: () => void;
}

export default function VehicleList({
  vehicles,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
}: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>🚗 My Vehicles</h1>
          <p className="subtitle">Select a vehicle to view its service history</p>
        </div>
        <button className="btn-primary" onClick={onAdd}>
          + Add Vehicle
        </button>
      </header>

      {vehicles.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🚘</span>
          <h3>No vehicles yet</h3>
          <p>Add your first vehicle to start tracking service records.</p>
          <button className="btn-primary" onClick={onAdd}>
            + Add Vehicle
          </button>
        </div>
      ) : (
        <div className="vehicle-grid">
          {vehicles.map(v => (
            <div
              key={v.id}
              className="vehicle-card"
              onClick={() => onSelect(v)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onSelect(v)}
            >
              <div className="vehicle-card-body">
                <div className="vehicle-year">{v.year}</div>
                <div className="vehicle-name">
                  {v.make} {v.model}
                </div>
                {v.color && (
                  <div className="vehicle-detail">Color: {v.color}</div>
                )}
                {v.mileage != null && (
                  <div className="vehicle-detail">
                    {v.mileage.toLocaleString()} mi
                  </div>
                )}
                {v.vin && (
                  <div className="vehicle-vin" title={v.vin}>
                    VIN: {v.vin}
                  </div>
                )}
              </div>
              <div
                className="vehicle-card-actions"
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="btn-icon"
                  title="Edit vehicle"
                  onClick={() => onEdit(v)}
                >
                  ✏️
                </button>
                <button
                  className="btn-icon btn-danger"
                  title="Delete vehicle"
                  onClick={() => onDelete(v)}
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
