import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Header from '../components/common/Header';
import PrintWrapper from '../components/common/PrintWrapper';

const round = (value, digits = 2) => Number((Number(value || 0)).toFixed(digits));
const toPositiveNumber = (value) => Math.max(0, Number(value) || 0);

const computeStandard = ({ tempsMinutes, objectifHeure }) => {
  const sam = toPositiveNumber(tempsMinutes);
  const hourlyTarget = toPositiveNumber(objectifHeure);
  const standardMinutes = sam > 0 ? sam : hourlyTarget > 0 ? 60 / hourlyTarget : 0;
  const computedHourlyTarget = hourlyTarget > 0 ? hourlyTarget : standardMinutes > 0 ? 60 / standardMinutes : 0;

  return {
    tempsMinutes: round(standardMinutes, 4),
    objectifHeure: round(computedHourlyTarget, 2)
  };
};

const computeNeed = ({ tempsMinutes, objectifHeure, productionJour, tempsPresence }) => {
  const standard = computeStandard({ tempsMinutes, objectifHeure });
  const dailyProduction = toPositiveNumber(productionJour);
  const presence = toPositiveNumber(tempsPresence);
  const besoin = standard.tempsMinutes > 0 && dailyProduction > 0 && presence > 0
    ? (standard.tempsMinutes * dailyProduction) / presence
    : 0;

  return { ...standard, besoinRessource: round(besoin, 4) };
};

export default function Operations() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ code: '', nom: '', tailleLot: 0, objectifHeure: 0, tempsMinutes: 0 });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [capacity, setCapacity] = useState({
    date: new Date().toISOString().split('T')[0],
    productionJour: 250,
    tempsPresence: 510
  });

  const load = async () => {
    try {
      setList((await api.get('/operations')).data);
    } catch {
      toast.error('Erreur chargement');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    api.get(`/mes/calendar/presence?date=${capacity.date}`)
      .then((res) => setCapacity((prev) => ({ ...prev, tempsPresence: res.data.presenceMinutes })))
      .catch(() => toast.error('Erreur calendrier presence'));
  }, [capacity.date]);

  const submit = async () => {
    const standard = computeStandard({
      tempsMinutes: form.tempsMinutes,
      objectifHeure: form.objectifHeure
    });
    const payload = {
      ...form,
      tailleLot: Number(form.tailleLot),
      objectifHeure: standard.objectifHeure,
      tempsMinutes: standard.tempsMinutes || null
    };
    try {
      if (editingId) await api.put(`/operations/${editingId}`, payload);
      else await api.post('/operations', payload);
      toast.success('Enregistrée');
      setEditingId(null);
      setForm({ code: '', nom: '', tailleLot: 0, objectifHeure: 0, tempsMinutes: 0 });
      load();
    } catch {
      toast.error('Erreur sauvegarde');
    }
  };

  const edit = (o) => {
    setEditingId(o._id);
    setForm({
      code: o.code,
      nom: o.nom,
      tailleLot: o.tailleLot,
      objectifHeure: o.objectifHeure,
      tempsMinutes: o.tempsMinutes ?? 0
    });
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer ?')) return;
    await api.delete(`/operations/${id}`);
    toast.success('Supprimée');
    load();
  };

  const filtered = list.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.code?.toLowerCase().includes(q) ||
      o.nom?.toLowerCase().includes(q)
    );
  });

  const enriched = filtered.map((operation) => ({
    ...operation,
    metrics: computeNeed({
      tempsMinutes: operation.tempsMinutes,
      objectifHeure: operation.objectifHeure,
      productionJour: capacity.productionJour,
      tempsPresence: capacity.tempsPresence
    })
  }));
  const totals = enriched.reduce(
    (sum, operation) => ({
      tempsMinutes: sum.tempsMinutes + operation.metrics.tempsMinutes,
      besoinRessource: sum.besoinRessource + operation.metrics.besoinRessource
    }),
    { tempsMinutes: 0, besoinRessource: 0 }
  );

  const updateTempsMinutes = (value) => {
    const sam = toPositiveNumber(value);
    setForm({
      ...form,
      tempsMinutes: value,
      objectifHeure: sam > 0 ? round(60 / sam, 2) : form.objectifHeure
    });
  };

  const updateObjectifHeure = (value) => {
    const hourlyTarget = toPositiveNumber(value);
    setForm({
      ...form,
      objectifHeure: value,
      tempsMinutes: hourlyTarget > 0 ? round(60 / hourlyTarget, 4) : form.tempsMinutes
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Opérations</h1>
          <img src="/logo.png" alt="Logo atelier" className="logo-page" />
        </div>

        <div className="card grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            placeholder="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="form-control"
          />
          <input
            placeholder="Nom"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className="form-control"
          />
          <input
            type="number"
            placeholder="Taille lot"
            value={form.tailleLot}
            onChange={(e) => setForm({ ...form, tailleLot: e.target.value })}
            className="form-control"
          />
          <input
            type="number"
            min="0"
            step="0.0001"
            placeholder="Temps standard (min)"
            value={form.tempsMinutes}
            onChange={(e) => updateTempsMinutes(e.target.value)}
            className="form-control"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Objectif /h"
            value={form.objectifHeure}
            onChange={(e) => updateObjectifHeure(e.target.value)}
            className="form-control"
          />
          <button onClick={submit} className="btn btn-primary md:col-span-5">
            {editingId ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>

        <div className="card flex flex-wrap gap-3 items-center">
          <label className="text-sm text-slate-600">Recherche</label>
          <input
            className="form-control max-w-xs"
            placeholder="Code ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-sm text-slate-500">Résultats : {filtered.length}</span>
        </div>

        <div className="card grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <label className="text-sm text-slate-600">
            Date capacite
            <input
              type="date"
              className="form-control mt-1"
              value={capacity.date}
              onChange={(e) => setCapacity({ ...capacity, date: e.target.value })}
            />
          </label>
          <label className="text-sm text-slate-600">
            PROD/J
            <input
              type="number"
              min="0"
              step="1"
              className="form-control mt-1"
              value={capacity.productionJour}
              onChange={(e) => setCapacity({ ...capacity, productionJour: e.target.value })}
            />
          </label>
          <label className="text-sm text-slate-600">
            Temps prÃ©sence (min)
            <input
              type="number"
              min="1"
              step="1"
              className="form-control mt-1"
              value={capacity.tempsPresence}
              onChange={(e) => setCapacity({ ...capacity, tempsPresence: e.target.value })}
            />
          </label>
          <div className="text-sm text-slate-700">
            Total temps: <strong>{round(totals.tempsMinutes, 2)} min</strong>
          </div>
          <div className="text-sm text-slate-700">
            ESR/EFF total: <strong>{round(totals.besoinRessource, 2)}</strong>
          </div>
        </div>

        <PrintWrapper label="Imprimer la liste">
          <div className="card overflow-x-auto">
            <table className="table-premium text-sm">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Nom</th>
                  <th>Lot</th>
                  <th>Temps (min)</th>
                  <th>Objectif/h</th>
                  <th>ESR/EFF</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((o) => (
                  <tr key={o._id}>
                    <td>{o.code}</td>
                    <td>{o.nom}</td>
                    <td>{o.tailleLot}</td>
                    <td>{o.metrics.tempsMinutes ? o.metrics.tempsMinutes.toFixed(4) : '-'}</td>
                    <td>{o.metrics.objectifHeure ? o.metrics.objectifHeure.toFixed(2) : '-'}</td>
                    <td>{o.metrics.besoinRessource ? o.metrics.besoinRessource.toFixed(4) : '-'}</td>
                    <td className="text-right space-x-2">
                      <button className="btn-mini" onClick={() => edit(o)}>
                        Éditer
                      </button>
                      <button className="btn-mini danger" onClick={() => del(o._id)}>
                        Suppr
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <p className="text-center text-slate-500 py-4">Aucune opération</p>}
          </div>
        </PrintWrapper>
      </main>
    </div>
  );
}
