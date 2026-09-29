import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '../components/common/Header';
import { StatCard } from '../components/dashboard/StatCard';
import api from '../services/api';
import toast from 'react-hot-toast';

const toDateInput = (date = new Date()) => {
  const local = new Date(date);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
};

const formatLabel = (value) => {
  if (!value) return '-';
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split('-');
  return day && month ? `${day}/${month}` : raw;
};

const normalizeCurve = (rows = []) =>
  rows.map((row) => ({
    ...row,
    label: formatLabel(row.label),
    pieces: Number(row.pieces || 0),
    efficiency: Number(row.efficiency || 0)
  }));

const normalizeRanking = (rows = []) =>
  rows.map((row) => ({
    ...row,
    shortLabel: row.label?.length > 16 ? `${row.label.slice(0, 16)}...` : row.label,
    totalPieces: Number(row.totalPieces || 0),
    efficiency: Number(row.efficiency || 0)
  }));

function ChartShell({ title, children, rows, columns }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-bold text-slate-700">{title}</h2>
        <span className="chip">{rows.length} points</span>
      </div>
      <div className="mes-chart-box">
        {rows.length ? children : <div className="mes-empty-chart">Aucune donnee pour cette periode</div>}
      </div>
      {rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                {columns.map((column) => <th key={column.key} className="py-1 pr-3">{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 6).map((row, index) => (
                <tr key={`${title}-${index}`} className="border-t border-slate-100">
                  {columns.map((column) => (
                    <td key={column.key} className="py-1 pr-3">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function MesDashboard() {
  const [kpis, setKpis] = useState(null);
  const [charts, setCharts] = useState(null);
  const [summary, setSummary] = useState(null);
  const [date, setDate] = useState(() => toDateInput());
  const [period, setPeriod] = useState('weekly');

  useEffect(() => {
    const load = async () => {
      try {
        const [kpiRes, chartRes, summaryRes] = await Promise.all([
          api.get(`/mes/dashboard/kpis?period=daily&date=${date}`),
          api.get(`/mes/dashboard/charts?period=${period}&date=${date}`),
          api.get(`/mes/dashboard/daily-summary?period=daily&date=${date}`)
        ]);
        setKpis(kpiRes.data);
        setCharts(chartRes.data);
        setSummary(summaryRes.data);
      } catch {
        toast.error('Erreur chargement MES');
      }
    };
    load();
  }, [date, period]);

  const curveRows = useMemo(() => normalizeCurve(charts?.productionCurve), [charts]);
  const workshopRows = useMemo(() => normalizeRanking(charts?.workshops), [charts]);
  const lineRows = useMemo(() => normalizeRanking(charts?.lines), [charts]);
  const operationRows = useMemo(() => normalizeRanking(charts?.operations), [charts]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-[0.16em] mb-1">Manufacturing Execution System</p>
            <h1 className="page-title">Dashboard industriel</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-light" to="/mes/efficiency">Rendement</Link>
            <Link className="btn-light" to="/mes/baskets">Paniers</Link>
            <Link className="btn-light" to="/mes/tracking-sheets">Fiches</Link>
            <Link className="btn-light" to="/mes/alerts">Alertes</Link>
          </div>
        </div>

        <section className="card flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">Date stats</label>
          <input className="form-control max-w-[180px]" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="text-sm font-semibold text-slate-600">Periode graphiques</label>
          <select className="form-control max-w-[180px]" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="daily">Jour</option>
            <option value="weekly">Semaine</option>
            <option value="monthly">Mois</option>
          </select>
          {charts?.range && (
            <span className="text-sm text-slate-500">Du {charts.range.startDate} au {charts.range.endDate}</span>
          )}
        </section>

        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Production jour" value={kpis.production} />
            <StatCard title="Rendement moyen" value={`${Number(kpis.averageEfficiency).toFixed(1)} %`} />
            <StatCard title="Ouvrieres presentes" value={kpis.workersCount} />
            <StatCard title="Encours" value={kpis.inProgressBaskets} />
            <StatCard title="Paniers bloques" value={kpis.blockedBaskets} />
            <StatCard title="Temps travaille" value={`${(kpis.totalWorkedMinutes / 60).toFixed(1)} h`} />
            <StatCard title="Meilleure ouvriere" value={kpis.bestWorker?.label || '-'} />
            <StatCard title="Rendement top" value={`${Number(kpis.bestWorker?.efficiency || 0).toFixed(1)} %`} />
            <StatCard title="Objectif jour" value={Number(kpis.targetPieces || 0).toFixed(0)} />
            <StatCard title="Ecart pieces" value={Number(kpis.variancePieces || 0).toFixed(0)} />
            <StatCard title="Temps perdu" value={`${(Number(kpis.lostMinutes || 0) / 60).toFixed(1)} h`} />
            <StatCard title="TRS" value={`${Number(kpis.oee || 0).toFixed(1)} %`} />
          </div>
        )}

        {summary && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card">
              <h2 className="font-bold text-slate-700 mb-3">Synthese fin de journee</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Terminees</span><div className="text-xl font-bold">{summary.finishedPieces}</div></div>
                <div><span className="text-slate-500">Semi-finies</span><div className="text-xl font-bold">{summary.semiFinishedPieces}</div></div>
                <div><span className="text-slate-500">Bloquees</span><div className="text-xl font-bold">{summary.blockedPieces}</div></div>
                <div><span className="text-slate-500">Rendement</span><div className="text-xl font-bold">{Number(summary.atelierEfficiency || 0).toFixed(1)} %</div></div>
                <div><span className="text-slate-500">Productif</span><div className="text-xl font-bold">{(Number(summary.productiveMinutes || 0) / 60).toFixed(1)} h</div></div>
                <div><span className="text-slate-500">Perdu</span><div className="text-xl font-bold">{(Number(summary.lostMinutes || 0) / 60).toFixed(1)} h</div></div>
              </div>
            </div>
            <div className="card">
              <h2 className="font-bold text-slate-700 mb-3">Semi-finis par operation</h2>
              <div className="space-y-2 text-sm">
                {summary.wipByOperation?.slice(0, 6).map((row, index) => (
                  <div key={`${row.operationName}-${row.status}-${index}`} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                    <span>{row.operationName} <span className="text-slate-400">({row.status})</span></span>
                    <strong>{row.pieces} pcs</strong>
                  </div>
                ))}
                {!summary.wipByOperation?.length && <div className="text-slate-500">Aucun encours</div>}
              </div>
            </div>
            <div className="card">
              <h2 className="font-bold text-slate-700 mb-3">Causes de perte</h2>
              <div className="space-y-2 text-sm">
                {summary.lossCauses?.slice(0, 5).map((row) => (
                  <div key={row.cause} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                    <span>{row.cause}</span>
                    <strong>{Number(row.lostMinutes || 0).toFixed(0)} min</strong>
                  </div>
                ))}
                {!summary.lossCauses?.length && <div className="text-slate-500">Aucune perte calculee</div>}
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartShell
            title="Courbe rendement"
            rows={curveRows}
            columns={[
              { key: 'label', label: 'Date' },
              { key: 'efficiency', label: 'Rendement', render: (row) => `${row.efficiency.toFixed(1)} %` }
            ]}
          >
            <>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curveRows} margin={{ top: 12, right: 18, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 'dataMax + 20']} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="efficiency" stroke="#2b5f6f" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          </ChartShell>

          <ChartShell
            title="Histogramme production"
            rows={curveRows}
            columns={[
              { key: 'label', label: 'Date' },
              { key: 'pieces', label: 'Pieces' }
            ]}
          >
            <>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={curveRows} margin={{ top: 12, right: 18, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="pieces" fill="#d4a853" />
                </BarChart>
              </ResponsiveContainer>
            </>
          </ChartShell>

          <ChartShell
            title="Comparatif ateliers"
            rows={workshopRows}
            columns={[
              { key: 'label', label: 'Atelier' },
              { key: 'totalPieces', label: 'Pieces' },
              { key: 'efficiency', label: 'Rdt', render: (row) => `${row.efficiency.toFixed(1)} %` }
            ]}
          >
            <>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workshopRows} margin={{ top: 12, right: 18, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="efficiency" fill="#2b5f6f" />
                </BarChart>
              </ResponsiveContainer>
            </>
          </ChartShell>

          <ChartShell
            title="Comparatif lignes"
            rows={lineRows}
            columns={[
              { key: 'label', label: 'Ligne' },
              { key: 'totalPieces', label: 'Pieces' },
              { key: 'efficiency', label: 'Rdt', render: (row) => `${row.efficiency.toFixed(1)} %` }
            ]}
          >
            <>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineRows} margin={{ top: 12, right: 18, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="efficiency" fill="#3d7a8f" />
                </BarChart>
              </ResponsiveContainer>
            </>
          </ChartShell>

          <ChartShell
            title="Rendement par operation"
            rows={operationRows}
            columns={[
              { key: 'label', label: 'Operation' },
              { key: 'totalPieces', label: 'Pieces' },
              { key: 'efficiency', label: 'Rdt', render: (row) => `${row.efficiency.toFixed(1)} %` }
            ]}
          >
            <>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operationRows} margin={{ top: 12, right: 18, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="efficiency" fill="#7a5b2e" />
                </BarChart>
              </ResponsiveContainer>
            </>
          </ChartShell>
        </div>
      </main>
    </div>
  );
}
