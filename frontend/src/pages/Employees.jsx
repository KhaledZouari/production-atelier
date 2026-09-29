import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Header from '../components/common/Header';
import PrintWrapper from '../components/common/PrintWrapper';

const emptyForm = { matricule: '', nom: '', prenom: '', chaine: '', photo: '', dateEmbauche: '', status: 'active' };

const normalizePayload = (data) => ({
  matricule: data.matricule,
  nom: data.nom,
  prenom: data.prenom,
  chaine: data.chaine || '',
  photo: data.photo || '',
  dateEmbauche: data.dateEmbauche || null,
  status: data.status || (data.active ? 'active' : 'resigned'),
  active: data.status ? data.status === 'active' : data.active !== false
});

export default function Employees() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setList((await api.get('/employees?status=all')).data);
    } catch {
      toast.error('Erreur chargement');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async () => {
    try {
      const payload = normalizePayload(form);
      if (editingId) await api.put(`/employees/${editingId}`, payload);
      else await api.post('/employees', payload);
      toast.success('Enregistrée');
      resetForm();
      load();
    } catch {
      toast.error('Erreur sauvegarde');
    }
  };

  const edit = (e) => {
    setEditingId(e._id);
    setForm({
      matricule: e.matricule,
      nom: e.nom,
      prenom: e.prenom,
      chaine: e.chaine || '',
      photo: e.photo || '',
      dateEmbauche: e.dateEmbauche || '',
      status: e.status || (e.active ? 'active' : 'resigned')
    });
  };

  const toggleStatus = async (emp) => {
    const nextStatus = emp.active ? 'resigned' : 'active';
    try {
      await api.put(`/employees/${emp._id}`, normalizePayload({ ...emp, status: nextStatus }));
      toast.success(nextStatus === 'active' ? 'Réactivée' : 'Démission enregistrée');
      load();
    } catch {
      toast.error('Erreur mise à jour statut');
    }
  };

  const filtered = list.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.matricule?.toString().toLowerCase().includes(q) ||
      e.nom?.toLowerCase().includes(q) ||
      e.prenom?.toLowerCase().includes(q) ||
      e.chaine?.toLowerCase().includes(q) ||
      (e.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Employées</h1>
          <img src="/logo.png" alt="Logo atelier" className="logo-page" />
        </div>

        <div className="card grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            placeholder="Matricule"
            value={form.matricule}
            onChange={(e) => setForm({ ...form, matricule: e.target.value })}
            className="form-control"
          />
          <input placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="form-control" />
          <input placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="form-control" />
          <input
            placeholder="Chaîne (A/B/C)"
            value={form.chaine}
            onChange={(e) => setForm({ ...form, chaine: e.target.value })}
            className="form-control"
          />
          <input
            type="date"
            placeholder="Date d'embauche"
            value={form.dateEmbauche}
            onChange={(e) => setForm({ ...form, dateEmbauche: e.target.value })}
            className="form-control"
          />
          <input
            placeholder="Photo URL (optionnel)"
            value={form.photo}
            onChange={(e) => setForm({ ...form, photo: e.target.value })}
            className="form-control"
          />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="form-control">
            <option value="active">Active</option>
            <option value="resigned">Démissionnée</option>
          </select>
          <button onClick={submit} className="btn btn-primary md:col-span-6">
            {editingId ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>

        <div className="card flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">Recherche</label>
          <input
            className="form-control max-w-md"
            placeholder="Matricule, nom, prénom, chaîne, statut..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-sm text-slate-500">Résultats : {filtered.length}</span>
        </div>

        <PrintWrapper label="Imprimer la liste">
          <div className="card overflow-x-auto">
            <table className="table-premium text-sm">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom</th>
                  <th>Chaîne</th>
                  <th>Date embauche</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e._id}>
                    <td>{e.matricule}</td>
                    <td>
                      {e.prenom} {e.nom}
                    </td>
                    <td>{e.chaine}</td>
                    <td>{e.dateEmbauche || '-'}</td>
                    <td>
                      <span className={`chip ${e.active ? 'success' : 'warning'}`}>
                        {e.active ? 'Active' : 'Démissionnée'}
                      </span>
                    </td>
                    <td className="text-right space-x-2">
                      <button className="btn-mini" onClick={() => edit(e)}>
                        Éditer
                      </button>
                      <button className="btn-mini danger" onClick={() => toggleStatus(e)}>
                        {e.active ? 'Démissionner' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <p className="text-center text-slate-500 py-4">Aucune employée</p>}
          </div>
        </PrintWrapper>
      </main>
    </div>
  );
}
