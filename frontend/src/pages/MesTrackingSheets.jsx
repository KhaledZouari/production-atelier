import { useEffect, useState } from 'react';
import Header from '../components/common/Header';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function MesTrackingSheets() {
  const [sheets, setSheets] = useState([]);
  const [operations, setOperations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [capacityDate, setCapacityDate] = useState(new Date().toISOString().split('T')[0]);
  const [capacity, setCapacity] = useState(null);
  const [operationForm, setOperationForm] = useState({ operationId: '', sequenceNo: '' });
  const [form, setForm] = useState({
    sheetDate: new Date().toISOString().split('T')[0],
    articleReference: '',
    articleDesignation: '',
    client: '',
    color: '',
    size: '',
    orderQuantity: ''
  });

  const load = async () => {
    const [sheetRes, operationRes] = await Promise.all([
      api.get('/mes/tracking-sheets'),
      api.get('/operations')
    ]);
    setSheets(sheetRes.data);
    setOperations(operationRes.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('Erreur chargement fiches'));
  }, []);

  const create = async () => {
    try {
      const res = await api.post('/mes/tracking-sheets', { ...form, orderQuantity: Number(form.orderQuantity || 0) });
      toast.success('Fiche suiveuse creee');
      setSelected(res.data);
      setForm({ sheetDate: new Date().toISOString().split('T')[0], articleReference: '', articleDesignation: '', client: '', color: '', size: '', orderQuantity: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur creation fiche');
    }
  };

  const open = async (id) => {
    const [res, capacityRes] = await Promise.all([
      api.get(`/mes/tracking-sheets/${id}`),
      api.get(`/mes/capacity/article?trackingSheetId=${id}&date=${capacityDate}`)
    ]);
    setSelected(res.data);
    setCapacity(capacityRes.data);
  };

  useEffect(() => {
    if (!selected?._id) return;
    api.get(`/mes/capacity/article?trackingSheetId=${selected._id}&date=${capacityDate}`)
      .then((res) => setCapacity(res.data))
      .catch(() => toast.error('Erreur capacite article'));
  }, [capacityDate, selected?._id]);

  const addOperation = async () => {
    if (!selected?._id || !operationForm.operationId) return;
    const operation = operations.find((item) => String(item._id) === String(operationForm.operationId));
    try {
      await api.post(`/mes/tracking-sheets/${selected._id}/operations`, {
        operationId: Number(operationForm.operationId),
        operationName: operation?.nom || '',
        sequenceNo: Number(operationForm.sequenceNo || (selected.operations?.length || 0) + 1),
        status: 'en_attente'
      });
      toast.success('Operation ajoutee');
      setOperationForm({ operationId: '', sequenceNo: '' });
      open(selected._id);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur ajout operation');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <h1 className="page-title">Fiche suiveuse numerique</h1>

        <section className="card grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="form-control" type="date" value={form.sheetDate} onChange={(e) => setForm({ ...form, sheetDate: e.target.value })} />
          <input className="form-control" placeholder="Reference article" value={form.articleReference} onChange={(e) => setForm({ ...form, articleReference: e.target.value })} />
          <input className="form-control" placeholder="Designation article" value={form.articleDesignation} onChange={(e) => setForm({ ...form, articleDesignation: e.target.value })} />
          <input className="form-control" placeholder="Client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
          <input className="form-control" placeholder="Couleur" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <input className="form-control" placeholder="Taille" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <input className="form-control" type="number" placeholder="Quantite OF" value={form.orderQuantity} onChange={(e) => setForm({ ...form, orderQuantity: e.target.value })} />
          <button className="btn btn-primary" onClick={create}>Creer fiche</button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="card">
            <h2 className="font-bold text-slate-700 mb-3">Historique fiches</h2>
            <table className="table-premium">
              <thead><tr><th>Numero</th><th>Article</th><th>Client</th><th>Statut</th></tr></thead>
              <tbody>
                {sheets.map((sheet) => (
                  <tr key={sheet._id} onClick={() => open(sheet._id)} className="cursor-pointer">
                    <td>{sheet.sheetNumber}</td>
                    <td>{sheet.articleReference} {sheet.articleDesignation}</td>
                    <td>{sheet.client}</td>
                    <td>{sheet.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {selected && (
            <section className="card">
              <h2 className="font-bold text-slate-700 mb-3">{selected.sheetNumber}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <p>Reference: <strong>{selected.articleReference}</strong></p>
                <p>Designation: <strong>{selected.articleDesignation}</strong></p>
                <p>Client: <strong>{selected.client}</strong></p>
                <p>Couleur/Taille: <strong>{selected.color} / {selected.size}</strong></p>
                <p>Quantite OF: <strong>{selected.orderQuantity}</strong></p>
                <p>Produite: <strong>{selected.producedQuantity}</strong></p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-4">
                <input className="form-control" type="date" value={capacityDate} onChange={(e) => setCapacityDate(e.target.value)} />
                <p>Presence: <strong>{Number(capacity?.presenceMinutes || 0)} min</strong></p>
                <p>Sortie/jour: <strong>{Number(capacity?.finishedPiecesPerDay || 0)} pcs</strong></p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <select className="form-control" value={operationForm.operationId} onChange={(e) => setOperationForm({ ...operationForm, operationId: e.target.value })}>
                  <option value="">Operation gamme</option>
                  {operations.map((operation) => (
                    <option key={operation._id} value={operation._id}>{operation.code} - {operation.nom}</option>
                  ))}
                </select>
                <input className="form-control" type="number" placeholder="Sequence" value={operationForm.sequenceNo} onChange={(e) => setOperationForm({ ...operationForm, sequenceNo: e.target.value })} />
                <button className="btn btn-primary" onClick={addOperation}>Ajouter operation</button>
              </div>
              <table className="table-premium">
                <thead><tr><th>#</th><th>Operation</th><th>Ouvriere</th><th>Entree</th><th>Sortie</th><th>Statut</th></tr></thead>
                <tbody>
                  {(selected.operations || []).map((operation) => (
                    <tr key={operation.id}>
                      <td>{operation.sequenceNo}</td>
                      <td>{operation.operationName}</td>
                      <td>{operation.employeeId || '-'}</td>
                      <td>{operation.entryTime || '-'}</td>
                      <td>{operation.exitTime || '-'}</td>
                      <td>{operation.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
