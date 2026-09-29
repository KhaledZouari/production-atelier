import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Header from '../components/common/Header';

const downloadBlob = (data, filename, type) => {
  const url = window.URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
};

export default function Reports() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchReport = async (format) => {
    try {
      const res = await api.get(`/reports/daily?date=${date}&format=${format}`, {
        responseType: format === 'pdf' ? 'blob' : 'arraybuffer'
      });
      if (format === 'csv') downloadBlob(res.data, `daily_${date}.csv`, 'text/csv;charset=utf-8');
      if (format === 'excel') downloadBlob(res.data, `daily_${date}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if (format === 'pdf') downloadBlob(res.data, `daily_${date}.pdf`, 'application/pdf');
    } catch {
      toast.error('Erreur export');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Rapports</h1>
          <img src="/logo.png" alt="Logo atelier" className="logo-page" />
        </div>
        <div className="card flex flex-wrap gap-3 items-center">
          <div>
            <label className="text-sm text-slate-600">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-control mt-1" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => fetchReport('csv')} className="btn-light">
              Export CSV
            </button>
            <button onClick={() => fetchReport('excel')} className="btn-light">
              Export Excel
            </button>
            <button onClick={() => fetchReport('pdf')} className="btn btn-primary">
              Export PDF
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
