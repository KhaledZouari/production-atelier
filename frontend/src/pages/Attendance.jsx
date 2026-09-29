import { useEffect, useMemo, useState } from 'react';
import Header from '../components/common/Header';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [exportId, setExportId] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [daily, setDaily] = useState([]);
  const [search, setSearch] = useState('');
  const [remarkDrafts, setRemarkDrafts] = useState({});

  const load = async () => {
    try {
      const res = await api.get('/employees');
      const sorted = res.data.sort((a, b) => a.nom.localeCompare(b.nom));
      setEmployees(sorted);
      if (!exportId && sorted[0]) setExportId(sorted[0]._id);
    } catch {
      toast.error('Erreur chargement employés');
    }
  };

  const loadDaily = async (day) => {
    try {
      const res = await api.get(`/attendance/daily?date=${day}`);
      setDaily(res.data);
    } catch {
      toast.error('Erreur chargement présence');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadDaily(date);
  }, [date]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        e.prenom.toLowerCase().includes(q) ||
        (e.matricule?.toString() || '').toLowerCase().includes(q) ||
        (e.chaine || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  const mergedRows = useMemo(() => {
    return filtered.map((emp) => {
      const match = daily.find((d) => d.employeeId === emp._id);
      return {
        id: emp._id,
        matricule: emp.matricule,
        nom: emp.nom,
        prenom: emp.prenom,
        present: match?.present ?? null,
        remark: match?.remark ?? '',
      };
    });
  }, [filtered, daily]);

  const markPresence = async (empId, present) => {
    try {
      const currentRemark =
        remarkDrafts[empId] ??
        daily.find((d) => d.employeeId === empId)?.remark ??
        '';
      await api.post('/attendance', { employeeId: empId, date, present, remark: currentRemark });
      await loadDaily(date);
      toast.success('Présence mise à jour');
    } catch {
      toast.error('Erreur enregistrement');
    }
  };

  const saveRemark = async (empId, presentValue) => {
    try {
      const remark = remarkDrafts[empId] ?? '';
      await api.post('/attendance', {
        employeeId: empId,
        date,
        present: presentValue ?? false,
        remark
      });
      await loadDaily(date);
      toast.success('Remarque enregistrée');
    } catch {
      toast.error('Erreur enregistrement remarque');
    }
  };

  const downloadReport = async (format) => {
    if (!exportId) return;
    const url = `/attendance/employee/${exportId}?format=${format}`;
    try {
      const res = await api.get(url, { responseType: format === 'pdf' || format === 'excel' ? 'blob' : 'arraybuffer' });
      if (format === 'json') {
        toast.success('Rapport JSON chargé');
        return;
      }
      const mime =
        format === 'pdf'
          ? 'application/pdf'
          : format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8;';
      const ext = format === 'excel' ? 'xlsx' : format;
      const blob = new Blob([res.data], { type: mime });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `presence_${exportId}_${date}.${ext}`;
      link.click();
    } catch {
      toast.error('Erreur export');
    }
  };

  const downloadDailyCsv = async () => {
    try {
      const res = await api.get(`/attendance/daily?date=${date}&format=csv`, { responseType: 'arraybuffer' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `presence_jour_${date}.csv`;
      link.click();
    } catch {
      toast.error('Erreur export jour');
    }
  };

  const downloadDailyExcel = async () => {
    try {
      const res = await api.get(`/attendance/daily?date=${date}&format=excel`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `presence_jour_${date}.xlsx`;
      link.click();
    } catch {
      toast.error('Erreur export jour (Excel)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Présence</h1>
          <img src="/logo.png" alt="Logo atelier" className="logo-page" />
        </div>

        <div className="card grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-slate-600">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-control mt-1" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Export employé</label>
            <select
              className="form-control mt-1"
              value={exportId || ''}
              onChange={(e) => setExportId(Number(e.target.value))}
            >
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.matricule} - {e.prenom} {e.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className="btn btn-outline" onClick={() => downloadReport('csv')}>
              Export CSV
            </button>
            <button className="btn btn-outline" onClick={() => downloadReport('excel')}>
              Export Excel
            </button>
            <button className="btn btn-primary" onClick={() => downloadReport('pdf')}>
              Export PDF
            </button>
            <button className="btn btn-light" onClick={downloadDailyCsv}>
              Imprimer jour (CSV)
            </button>
            <button className="btn btn-light" onClick={downloadDailyExcel}>
              Imprimer jour (Excel)
            </button>
          </div>
          <div className="md:col-span-3 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600">Recherche</label>
            <input
              className="form-control max-w-md"
              placeholder="Nom, prénom, matricule, chaîne..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="text-sm text-slate-500">Résultats : {mergedRows.length}</span>
          </div>
        </div>

        <div className="card space-y-3">
          <div className="overflow-x-auto">
            <table className="table-premium text-sm">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Chaîne</th>
                  <th>Présence</th>
                  <th>Remarque</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mergedRows.map((d) => (
                  <tr key={d.id}>
                    <td>{d.matricule}</td>
                    <td>{d.nom}</td>
                    <td>{d.prenom}</td>
                    <td>{employees.find((e) => e._id === d.id)?.chaine || ''}</td>
                    <td>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={d.present === true}
                          onChange={() => markPresence(d.id, !(d.present === true))}
                        />
                        <span className={`chip ${d.present === false ? 'danger' : ''}`}>
                          {d.present === null ? 'Non saisi' : d.present ? 'Présent' : 'Absent'}
                        </span>
                      </label>
                    </td>
                    <td>
                      <input
                        className="form-control"
                        placeholder="Remarque"
                        value={remarkDrafts[d.id] ?? d.remark}
                        onChange={(e) => setRemarkDrafts((r) => ({ ...r, [d.id]: e.target.value }))}
                      />
                    </td>
                    <td className="text-right space-x-2">
                      <button className="btn-mini" onClick={() => saveRemark(d.id, d.present ?? true)}>
                        Sauver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mergedRows.length === 0 && <p className="text-center text-slate-500 py-3">Aucun employé trouvé</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
