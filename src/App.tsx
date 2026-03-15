import { useState, useEffect, useCallback } from 'react';
import type { Vehicle, ServiceRecord, VehicleInput, ServiceRecordInput } from './types';
import * as api from './api/client';
import VehicleList from './components/VehicleList';
import VehicleForm from './components/VehicleForm';
import ServiceRecordList from './components/ServiceRecordList';
import ServiceRecordForm from './components/ServiceRecordForm';
import './App.css';

type View =
  | { type: 'vehicles' }
  | { type: 'vehicle-form'; vehicle?: Vehicle }
  | { type: 'records'; vehicle: Vehicle }
  | { type: 'record-form'; vehicle: Vehicle; record?: ServiceRecord };

export default function App() {
  const [view, setView] = useState<View>({ type: 'vehicles' });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState('');

  // Load vehicles on mount
  useEffect(() => {
    api.getVehicles()
      .then(setVehicles)
      .catch(() => setError('Could not connect to the server. Make sure the backend is running.'))
      .finally(() => setLoadingVehicles(false));
  }, []);

  // Load records when a vehicle is selected
  const loadRecords = useCallback((vehicleId: number) => {
    setLoadingRecords(true);
    api.getRecords(vehicleId)
      .then(setRecords)
      .catch(() => setError('Failed to load service records.'))
      .finally(() => setLoadingRecords(false));
  }, []);

  // ── Vehicle handlers ───────────────────────────────────────────────────────

  const handleSelectVehicle = (v: Vehicle) => {
    setView({ type: 'records', vehicle: v });
    loadRecords(v.id);
  };

  const handleAddVehicle = () => setView({ type: 'vehicle-form' });

  const handleEditVehicle = (v: Vehicle) =>
    setView({ type: 'vehicle-form', vehicle: v });

  const handleDeleteVehicle = async (v: Vehicle) => {
    if (!confirm(`Delete ${v.year} ${v.make} ${v.model} and all its service records?`)) return;
    try {
      await api.deleteVehicle(v.id);
      setVehicles(prev => prev.filter(x => x.id !== v.id));
    } catch {
      setError('Failed to delete vehicle.');
    }
  };

  const handleSubmitVehicle = async (data: VehicleInput) => {
    if (view.type !== 'vehicle-form') return;
    if (view.vehicle) {
      const updated = await api.updateVehicle(view.vehicle.id, data);
      setVehicles(prev => prev.map(v => (v.id === updated.id ? updated : v)));
    } else {
      const created = await api.createVehicle(data);
      setVehicles(prev => [...prev, created]);
    }
    setView({ type: 'vehicles' });
  };

  // ── Record handlers ────────────────────────────────────────────────────────

  const handleAddRecord = () => {
    if (view.type !== 'records') return;
    setView({ type: 'record-form', vehicle: view.vehicle });
  };

  const handleEditRecord = (r: ServiceRecord) => {
    if (view.type !== 'records') return;
    setView({ type: 'record-form', vehicle: view.vehicle, record: r });
  };

  const handleDeleteRecord = async (r: ServiceRecord) => {
    if (view.type !== 'records') return;
    if (!confirm('Delete this service record?')) return;
    try {
      await api.deleteRecord(view.vehicle.id, r.id);
      setRecords(prev => prev.filter(x => x.id !== r.id));
    } catch {
      setError('Failed to delete service record.');
    }
  };

  const handleSubmitRecord = async (data: ServiceRecordInput) => {
    if (view.type !== 'record-form') return;
    const { vehicle, record } = view;
    if (record) {
      const updated = await api.updateRecord(vehicle.id, record.id, data);
      setRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    } else {
      const created = await api.createRecord(vehicle.id, data);
      setRecords(prev => [created, ...prev]);
    }
    setView({ type: 'records', vehicle });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      <nav className="navbar">
        <button
          className="nav-brand"
          onClick={() => setView({ type: 'vehicles' })}
        >
          🔧 Vehicle Service Records
        </button>
      </nav>

      {error && (
        <div className="global-error">
          ⚠️ {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <main className="main-content">
        {view.type === 'vehicles' && (
          loadingVehicles ? (
            <div className="loading">Loading vehicles…</div>
          ) : (
            <VehicleList
              vehicles={vehicles}
              onSelect={handleSelectVehicle}
              onEdit={handleEditVehicle}
              onDelete={handleDeleteVehicle}
              onAdd={handleAddVehicle}
            />
          )
        )}

        {view.type === 'vehicle-form' && (
          <VehicleForm
            initial={view.vehicle}
            onSubmit={handleSubmitVehicle}
            onCancel={() => setView({ type: 'vehicles' })}
          />
        )}

        {view.type === 'records' && (
          loadingRecords ? (
            <div className="loading">Loading records…</div>
          ) : (
            <ServiceRecordList
              vehicle={view.vehicle}
              records={records}
              onAdd={handleAddRecord}
              onEdit={handleEditRecord}
              onDelete={handleDeleteRecord}
              onBack={() => setView({ type: 'vehicles' })}
            />
          )
        )}

        {view.type === 'record-form' && (
          <ServiceRecordForm
            initial={view.record}
            onSubmit={handleSubmitRecord}
            onCancel={() =>
              setView({ type: 'records', vehicle: view.vehicle })
            }
          />
        )}
      </main>
    </div>
  );
}

