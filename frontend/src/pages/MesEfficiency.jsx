import { useEffect, useState } from 'react';
import Header from '../components/common/Header';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function MesEfficiency() {
  const [employees, setEmployees] = useState([]);
  const [operations, setOperations] = useState([]);
  const [baskets, setBaskets] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [history, setHistory] = useState([]);
  const [calendar, setCalendar] = useState({ presenceMinutes: 0, workedDay: true });
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    basketId: '',
    employeeId: '',
    operationId: '',
    samMinutes: '',
    quantityProduced: '',
    startTime: '',
    endTime: ''
  });

  const load = async () => {
    const [empRes, opRes, basketRes, rankRes, calendarRes] = await Promise.all([
      api.get('/employees'),
      api.get('/operations'),
      api.get('/mes/baskets'),
      api.get(`/mes/efficiency/ranking/employee?period=daily&date=${form.entryDate}`),
      api.get(`/mes/calendar/presence?date=${form.entryDate}`)
    ]);
    setEmployees(empRes.data);
    setOperations(opRes.data);
    setBaskets(basketRes.data);
    setRanking(rankRes.data);
    setCalendar(calendarRes.data);
    setForm((prev) => ({
      ...prev,
      employeeId: prev.employeeId || empRes.data[0]?._id || '',
      operationId: prev.operationId || opRes.data[0]?._id || ''
    }));
  };

  useEffect(() => {
    load().catch(() => toast.error('Erreur chargement rendement'));
  }, []);

  useEffect(() => {
    Promise.all([
      api.get(`/mes/calendar/presence?date=${form.entryDate}`),
      api.get(`/mes/efficiency/ranking/employee?period=daily&date=${form.entryDate}`)
    ])
      .then(([calendarRes, rankRes]) => {
        setCalendar(calendarRes.data);
        setRanking(rankRes.data);
      })
      .catch(() => toast.error('Erreur calendrier presence'));
  }, [form.entryDate]);

  const selectBasket = (basketId) => {
    const basket = baskets.find((item) => String(item._id) === basketId);
    setForm((prev) => ({
      ...prev,
      basketId,
      employeeId: basket?.employeeId ? String(basket.employeeId) : prev.employeeId,
      operationId: basket?.currentOperationId ? String(basket.currentOperationId) : prev.operationId,
      quantityProduced: basket?.quantity ? String(basket.quantity) : prev.quantityProduced
    }));
  };

  const submit = async () => {
    try {
      await api.post('/mes/efficiency/individual', {
        ...form,
        basketId: form.basketId ? Number(form.basketId) : null,
        employeeId: Number(form.employeeId),
        operationId: Number(form.operationId),
        samMinutes: Number(form.samMinutes),
        quantityProduced: Number(form.quantityProduced)
      });
      toast.success('Rendement enregistre');
      const [rankRes, histRes] = await Promise.all([
        api.get(`/mes/efficiency/ranking/employee?period=daily&date=${form.entryDate}`),
        api.get(`/mes/efficiency/individual/${form.employeeId}/history?period=daily&date=${form.entryDate}`)
      ]);
      setRanking(rankRes.data);
      setHistory(histRes.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur enregistrement');
    }
  };

  const loadHistory = async (employeeId) => {
    const res = await api.get(`/mes/efficiency/individual/${employeeId}/history?period=monthly`);
    setHistory(res.data);
  };

  const selectedOperation = operations.find((operation) => String(operation._id) === String(form.operationId));
  const samMinutes = Number(form.samMinutes || selectedOperation?.tempsMinutes || 0);
  const workedMinutes = calendar.presenceMinutes || 0;
  const previewEfficiency = samMinutes > 0 && workedMinutes > 0
    ? ((Number(form.quantityProduced || 0) * samMinutes) / workedMinutes) * 100
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <h1 className="page-title">Rendement individuel</h1>

        <section className="card grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="form-control" type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
          <select className="form-control" value={form.basketId} onChange={(e) => selectBasket(e.target.value)}>
            <option value="">Panier travaille</option>
            {baskets.map((basket) => (
              <option key={basket._id} value={basket._id}>{basket.basketCode} - {basket.articleDesignation || basket.articleReference} ({basket.quantity} pcs)</option>
            ))}
          </select>
          <select className="form-control" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            {employees.map((employee) => (
              <option key={employee._id} value={employee._id}>{employee.matricule} - {employee.prenom} {employee.nom}</option>
            ))}
          </select>
          <select className="form-control" value={form.operationId} onChange={(e) => setForm({ ...form, operationId: e.target.value })}>
            {operations.map((operation) => (
              <option key={operation._id} value={operation._id}>{operation.code} - {operation.nom}</option>
            ))}
          </select>
          <input className="form-control" type="number" step="0.01" placeholder="SAM minutes" value={form.samMinutes} onChange={(e) => setForm({ ...form, samMinutes: e.target.value })} />
          <input className="form-control" type="number" placeholder="Quantite produite" value={form.quantityProduced} onChange={(e) => setForm({ ...form, quantityProduced: e.target.value })} />
          <input className="form-control" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <input className="form-control" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <button className="btn btn-primary" onClick={submit}>Calculer et enregistrer</button>
        </section>

        <section className="card grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-slate-700">
          <p>Jour: <strong>{calendar.dayName || '-'}</strong></p>
          <p>Presence planifiee: <strong>{Number(calendar.presenceMinutes || 0)} min</strong></p>
          <p>SAM utilise: <strong>{samMinutes ? samMinutes.toFixed(4) : '-'} min</strong></p>
          <p>Rendement prevu: <strong>{previewEfficiency.toFixed(1)} %</strong></p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="card">
            <h2 className="font-bold text-slate-700 mb-3">Classement meilleures ouvrieres</h2>
            <table className="table-premium">
              <thead><tr><th>Ouvriere</th><th>Pieces</th><th>Temps</th><th>Rendement</th></tr></thead>
              <tbody>
                {ranking.map((row) => (
                  <tr key={`${row.id}-${row.label}`} onClick={() => row.id && loadHistory(row.id)} className="cursor-pointer">
                    <td>{row.label}</td>
                    <td>{row.totalPieces}</td>
                    <td>{(Number(row.totalWorkedMinutes || 0) / 60).toFixed(1)} h</td>
                    <td>{Number(row.efficiency || 0).toFixed(1)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2 className="font-bold text-slate-700 mb-3">Historique complet</h2>
            <table className="table-premium">
              <thead><tr><th>Date</th><th>Operation</th><th>Quantite</th><th>Rendement</th></tr></thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row._id}>
                    <td>{row.entryDate}</td>
                    <td>{row.operationName || row.operationId}</td>
                    <td>{row.quantityProduced}</td>
                    <td>{row.efficiency.toFixed(1)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </main>
    </div>
  );
}
