import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ProductionTable from '../components/production/ProductionTable';
import Header from '../components/common/Header';
import PrintWrapper from '../components/common/PrintWrapper';

export default function Productions() {
  const [prods, setProds] = useState([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/productions');
      setProds(res.data);
    } catch {
      toast.error('Erreur');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const del = async (id) => {
    if (!window.confirm('Supprimer ?')) return;
    await api.delete(`/productions/${id}`);
    toast.success('Supprimée');
    load();
  };

  const print = async (prod) => {
    try {
      const res = await api.post('/jetons/print', { productionId: prod._id }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `jetons_${prod._id}.pdf`;
      link.click();
    } catch {
      toast.error('Erreur impression');
    }
  };

  const filtered = prods.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.employeeId?.prenom?.toLowerCase().includes(q) ||
      p.employeeId?.nom?.toLowerCase().includes(q) ||
      p.operationId?.code?.toLowerCase().includes(q) ||
      p.operationId?.nom?.toLowerCase().includes(q) ||
      p.chaine?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Productions</h1>
          <img src="/logo.png" alt="Logo atelier" className="logo-page" />
        </div>
        <div className="card flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">Recherche</label>
          <input
            className="form-control max-w-md"
            placeholder="Employé, opération, chaîne..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-sm text-slate-500">Résultats : {filtered.length}</span>
        </div>
        <PrintWrapper label="Imprimer la liste">
          <ProductionTable productions={filtered} onDelete={del} onPrint={print} />
        </PrintWrapper>
      </main>
    </div>
  );
}
