import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Header from '../components/common/Header';

const clampLots = (v) => Math.max(1, parseInt(v, 10) || 1);

const validateTimeRange = (start, end) => {
  const [hD, mD] = start.split(':').map(Number);
  const [hF, mF] = end.split(':').map(Number);
  const d0 = new Date('2000-01-01');
  d0.setHours(hD, mD, 0, 0);
  const d1 = new Date('2000-01-01');
  d1.setHours(hF, mF, 0, 0);
  if (d1 < d0) d1.setDate(d1.getDate() + 1);
  const hours = (d1 - d0) / 36e5;
  if (hours <= 0 || hours > 24) throw new Error('Durée invalide');
  return hours;
};

export default function ProductionForm() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState([]);
  const [operations, setOperations] = useState([]);
  const [form, setForm] = useState({ employeeId: '', operationId: '', chaine: '', nbLots: 1, heureDebut: '', heureFin: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [emps, ops] = await Promise.all([api.get('/employees'), api.get('/operations')]);
        setEmployees(emps.data);
        setOperations(ops.data);
        if (emps.data[0]) setForm((f) => ({ ...f, employeeId: emps.data[0]._id }));
        if (ops.data[0]) setForm((f) => ({ ...f, operationId: ops.data[0]._id }));
      } catch {
        toast.error('Erreur de chargement');
      }
    };
    load();
  }, []);

  const metrics = useMemo(() => {
    const op = operations.find((o) => o._id === form.operationId);
    if (!op || !form.heureDebut || !form.heureFin) return null;
    try {
      const h = validateTimeRange(form.heureDebut, form.heureFin);
      const totalPieces = op.tailleLot * clampLots(form.nbLots);
      const piecesParHeure = totalPieces / h;
      const rendement = (piecesParHeure / op.objectifHeure) * 100;
      return { totalPieces, piecesParHeure, rendement, heures: h };
    } catch {
      return null;
    }
  }, [operations, form]);

  const submit = async () => {
    try {
      validateTimeRange(form.heureDebut, form.heureFin);
      await api.post('/productions', { ...form, nbLots: clampLots(form.nbLots), date });
      toast.success('Production enregistrée');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Nouvelle production</h1>
          <img src="/logo.png" alt="Logo atelier" className="logo-page" />
        </div>

        <div className="card grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-control" />
          <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="form-control">
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.prenom} {e.nom}
              </option>
            ))}
          </select>
          <select value={form.operationId} onChange={(e) => setForm({ ...form, operationId: e.target.value })} className="form-control">
            {operations.map((o) => (
              <option key={o._id} value={o._id}>
                {o.code} - {o.nom} ({o.tailleLot} pcs/lot)
              </option>
            ))}
          </select>
          <input
            placeholder="Chaîne (ex: A)"
            value={form.chaine}
            onChange={(e) => setForm({ ...form, chaine: e.target.value })}
            className="form-control"
          />
          <input
            type="number"
            min="1"
            value={form.nbLots}
            onChange={(e) => setForm({ ...form, nbLots: clampLots(e.target.value) })}
            className="form-control"
          />
          <input type="time" value={form.heureDebut} onChange={(e) => setForm({ ...form, heureDebut: e.target.value })} className="form-control" />
          <input type="time" value={form.heureFin} onChange={(e) => setForm({ ...form, heureFin: e.target.value })} className="form-control" />
        </div>

        {metrics && (
          <div className="card text-sm text-slate-700 grid grid-cols-2 md:grid-cols-4 gap-3">
            <p>Total pièces: <strong>{metrics.totalPieces}</strong></p>
            <p>Heures: <strong>{metrics.heures.toFixed(2)} h</strong></p>
            <p>Pièces/h: <strong>{metrics.piecesParHeure.toFixed(1)}</strong></p>
            <p>Rendement: <strong>{metrics.rendement.toFixed(1)} %</strong></p>
          </div>
        )}

        <button onClick={submit} className="btn btn-primary">
          Enregistrer
        </button>
      </main>
    </div>
  );
}
