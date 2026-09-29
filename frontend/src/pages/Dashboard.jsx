import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { StatCard } from '../components/dashboard/StatCard';
import ProductionTable from '../components/production/ProductionTable';
import Header from '../components/common/Header';
import PrintWrapper from '../components/common/PrintWrapper';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [productions, setProductions] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [s, p] = await Promise.all([
          api.get(`/productions/stats/daily?date=${today}`),
          api.get(`/productions?date=${today}`)
        ]);
        setStats(s.data);
        setProductions(p.data);
      } catch {
        toast.error('Erreur de chargement');
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-[0.16em] mb-1">Atelier Cartexia</p>
            <h1 className="page-title">Tableau de bord journalier</h1>
          </div>
          <img src="/logo.png" alt="Logo atelier" className="logo-page" />
        </div>
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Ouvrières actives" value={stats.nbOuvrieres} />
            <StatCard title="Total pièces" value={stats.totalPieces} />
            <StatCard title="Heures travaillées" value={`${stats.heuresTravail.toFixed(1)} h`} />
            <StatCard title="Rendement moyen" value={`${stats.rendementMoyen.toFixed(1)} %`} />
          </div>
        )}
        <PrintWrapper label="Imprimer le détail du jour">
          <ProductionTable productions={productions} />
        </PrintWrapper>
      </main>
    </div>
  );
}
