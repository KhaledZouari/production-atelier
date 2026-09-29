import { useEffect, useState } from 'react';
import Header from '../components/common/Header';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function MesAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [threshold, setThreshold] = useState(60);

  const load = async () => {
    const res = await api.get('/mes/alerts');
    setAlerts(res.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('Erreur chargement alertes'));
  }, []);

  const evaluate = async () => {
    await api.post('/mes/alerts/evaluate', { efficiencyThreshold: Number(threshold) });
    toast.success('Evaluation terminee');
    load();
  };

  const ack = async (id) => {
    await api.patch(`/mes/alerts/${id}/ack`);
    toast.success('Alerte acquittee');
    load();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="page-title">Alertes automatiques</h1>
          <div className="card flex flex-wrap items-center gap-3 py-3">
            <label className="text-sm text-slate-600">Seuil rendement</label>
            <input className="form-control w-28" type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            <button className="btn btn-primary" onClick={evaluate}>Evaluer</button>
          </div>
        </div>

        <section className="card">
          <table className="table-premium">
            <thead><tr><th>Type</th><th>Severite</th><th>Titre</th><th>Valeur</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert._id}>
                  <td>{alert.alertType}</td>
                  <td><span className={`chip ${alert.severity === 'critical' ? 'danger' : ''}`}>{alert.severity}</span></td>
                  <td>
                    <div className="font-semibold">{alert.title}</div>
                    <div className="text-sm text-slate-500">{alert.message}</div>
                  </td>
                  <td>{alert.actualValue ?? '-'} / {alert.thresholdValue ?? '-'}</td>
                  <td>{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '-'}</td>
                  <td><button className="btn-mini" onClick={() => ack(alert._id)}>Acquitter</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
