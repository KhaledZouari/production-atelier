import { useEffect, useMemo, useState } from 'react';
import Header from '../components/common/Header';
import api from '../services/api';
import toast from 'react-hot-toast';

const statutOptions = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'bloque', label: 'Bloqué' }
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [flowForm, setFlowForm] = useState({ chaine: '', qtyEntree: '', qtySortie: '', remarque: '' });
  const [shipForm, setShipForm] = useState({ codeLivraison: '', dateLivraison: '', quantite: '', commentaire: '' });
  const [orderForm, setOrderForm] = useState({
    numeroOF: '',
    numeroCommande: '',
    reference: '',
    client: '',
    semaineLiv: '',
    quantiteTotale: '',
    statut: 'en_attente',
    usine: '',
    ficheTechUrl: '',
    notes: ''
  });

  const loadOrders = async () => {
    try {
      const params = [];
      if (statut) params.push(`statut=${statut}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      const res = await api.get(`/orders${params.length ? '?' + params.join('&') : ''}`);
      setOrders(res.data);
    } catch {
      toast.error('Erreur chargement OF');
    }
  };

  const loadDetail = async (id) => {
    try {
      const res = await api.get(`/orders/${id}`);
      setDetail(res.data);
      setSelected(id);
    } catch {
      toast.error('Erreur chargement détail OF');
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statut]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.numeroOF?.toLowerCase().includes(q) ||
        o.client?.toLowerCase().includes(q) ||
        o.reference?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const submitOrder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/orders', {
        ...orderForm,
        quantiteTotale: Number(orderForm.quantiteTotale || 0)
      });
      toast.success('OF créé');
      setOrderForm({
        numeroOF: '',
        numeroCommande: '',
        reference: '',
        client: '',
        semaineLiv: '',
        quantiteTotale: '',
        statut: 'en_attente',
        usine: '',
        ficheTechUrl: '',
        notes: ''
      });
      loadOrders();
    } catch {
      toast.error('Erreur création OF');
    }
  };

  const submitFlow = async () => {
    if (!selected) return toast.error('Sélectionne un OF');
    try {
      await api.post(`/orders/${selected}/flows`, {
        ...flowForm,
        qtyEntree: flowForm.qtyEntree === '' ? null : Number(flowForm.qtyEntree),
        qtySortie: flowForm.qtySortie === '' ? null : Number(flowForm.qtySortie)
      });
      toast.success('Flux enregistré');
      setFlowForm({ chaine: '', qtyEntree: '', qtySortie: '', remarque: '' });
      loadDetail(selected);
      loadOrders();
    } catch {
      toast.error('Erreur flux');
    }
  };

  const submitShipment = async () => {
    if (!selected) return toast.error('Sélectionne un OF');
    try {
      await api.post(`/orders/${selected}/shipments`, {
        ...shipForm,
        quantite: Number(shipForm.quantite || 0)
      });
      toast.success('Livraison enregistrée');
      setShipForm({ codeLivraison: '', dateLivraison: '', quantite: '', commentaire: '' });
      loadDetail(selected);
      loadOrders();
    } catch {
      toast.error('Erreur livraison');
    }
  };

  const badgeClass = (s) => {
    if (s === 'termine') return 'chip';
    if (s === 'en_cours') return 'chip';
    if (s === 'bloque') return 'chip danger';
    return 'chip';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Ordres de fabrication</h1>
          <img src="/logo.png" alt="Logo atelier" className="logo-page" />
        </div>

        <form onSubmit={submitOrder} className="card grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="form-control" placeholder="N° OF" value={orderForm.numeroOF} onChange={(e) => setOrderForm({ ...orderForm, numeroOF: e.target.value })} required />
          <input className="form-control" placeholder="Client" value={orderForm.client} onChange={(e) => setOrderForm({ ...orderForm, client: e.target.value })} />
          <input className="form-control" placeholder="Référence" value={orderForm.reference} onChange={(e) => setOrderForm({ ...orderForm, reference: e.target.value })} />
          <input className="form-control" placeholder="Semaine liv." value={orderForm.semaineLiv} onChange={(e) => setOrderForm({ ...orderForm, semaineLiv: e.target.value })} />
          <input className="form-control" type="number" placeholder="Quantité" value={orderForm.quantiteTotale} onChange={(e) => setOrderForm({ ...orderForm, quantiteTotale: e.target.value })} />
          <select className="form-control" value={orderForm.statut} onChange={(e) => setOrderForm({ ...orderForm, statut: e.target.value })}>
            {statutOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input className="form-control" placeholder="Usine" value={orderForm.usine} onChange={(e) => setOrderForm({ ...orderForm, usine: e.target.value })} />
          <input className="form-control" placeholder="Fiche technique (URL)" value={orderForm.ficheTechUrl} onChange={(e) => setOrderForm({ ...orderForm, ficheTechUrl: e.target.value })} />
          <input className="form-control md:col-span-3" placeholder="Notes" value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
          <button type="submit" className="btn btn-primary md:col-span-4">Créer OF</button>
        </form>

        <div className="card flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">Statut</label>
          <select className="form-control max-w-xs" value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">Tous</option>
            {statutOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <label className="text-sm text-slate-600">Recherche</label>
          <input className="form-control max-w-md" placeholder="OF, client, référence..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="text-sm text-slate-500">Résultats : {filtered.length}</span>
          <button className="btn btn-outline" onClick={loadOrders} type="button">Rafraîchir</button>
        </div>

        <div className="card overflow-x-auto">
          <table className="table-premium text-sm">
            <thead>
              <tr>
                <th>OF</th>
                <th>Client</th>
                <th>Référence</th>
                <th>SemLiv</th>
                <th>Qté</th>
                <th>Rest Fab</th>
                <th>Rest Liv</th>
                <th>Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o._id}>
                  <td>{o.numeroOF}</td>
                  <td>{o.client}</td>
                  <td>{o.reference}</td>
                  <td>{o.semaineLiv}</td>
                  <td>{o.quantiteTotale}</td>
                  <td>{o.restFab}</td>
                  <td>{o.restLiv}</td>
                  <td><span className={badgeClass(o.statut)}>{o.statut}</span></td>
                  <td className="text-right">
                    <button className="btn-mini" onClick={() => loadDetail(o._id)}>Détail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-slate-500 py-3">Aucun OF</p>}
        </div>

        {detail && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{detail.order.numeroOF} · {detail.order.client}</p>
                <h3 className="text-lg font-semibold">{detail.order.reference}</h3>
                <p className="text-sm text-slate-500">Sem liv: {detail.order.semaineLiv} · Rest Fab {detail.order.restFab} · Rest Liv {detail.order.restLiv}</p>
              </div>
              {detail.order.ficheTechUrl && (
                <a className="btn btn-outline" href={detail.order.ficheTechUrl} target="_blank" rel="noreferrer">Fiche technique</a>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="card">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Entrée / Sortie chaîne</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input className="form-control" placeholder="Chaîne" value={flowForm.chaine} onChange={(e) => setFlowForm({ ...flowForm, chaine: e.target.value })} />
                  <input className="form-control" type="number" placeholder="Qty entrée" value={flowForm.qtyEntree} onChange={(e) => setFlowForm({ ...flowForm, qtyEntree: e.target.value })} />
                  <input className="form-control" type="number" placeholder="Qty sortie" value={flowForm.qtySortie} onChange={(e) => setFlowForm({ ...flowForm, qtySortie: e.target.value })} />
                  <input className="form-control md:col-span-2" placeholder="Remarque" value={flowForm.remarque} onChange={(e) => setFlowForm({ ...flowForm, remarque: e.target.value })} />
                </div>
                <button className="btn btn-primary mt-2" onClick={submitFlow}>Enregistrer flux</button>

                <div className="mt-3 space-y-2 max-h-56 overflow-auto">
                  {detail.flows.map((f) => (
                    <div key={f.id} className="flex justify-between text-sm border-b border-slate-100 pb-1">
                      <div>{f.date} · {f.chaine}</div>
                      <div className="text-slate-600">+{f.qtyEntree || 0} / sortie {f.qtySortie || 0}</div>
                    </div>
                  ))}
                  {detail.flows.length === 0 && <p className="text-sm text-slate-500">Aucun flux</p>}
                </div>
              </div>

              <div className="card">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Livraisons</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input className="form-control" placeholder="Code livraison" value={shipForm.codeLivraison} onChange={(e) => setShipForm({ ...shipForm, codeLivraison: e.target.value })} />
                  <input className="form-control" type="date" value={shipForm.dateLivraison} onChange={(e) => setShipForm({ ...shipForm, dateLivraison: e.target.value })} />
                  <input className="form-control" type="number" placeholder="Quantité" value={shipForm.quantite} onChange={(e) => setShipForm({ ...shipForm, quantite: e.target.value })} />
                  <input className="form-control md:col-span-2" placeholder="Commentaire" value={shipForm.commentaire} onChange={(e) => setShipForm({ ...shipForm, commentaire: e.target.value })} />
                </div>
                <button className="btn btn-primary mt-2" onClick={submitShipment}>Enregistrer livraison</button>

                <div className="mt-3 space-y-2 max-h-56 overflow-auto">
                  {detail.shipments.map((s) => (
                    <div key={s.id} className="flex justify-between text-sm border-b border-slate-100 pb-1">
                      <div>{s.dateLivraison} · {s.codeLivraison}</div>
                      <div className="text-slate-600">Qty {s.quantite}</div>
                    </div>
                  ))}
                  {detail.shipments.length === 0 && <p className="text-sm text-slate-500">Aucune livraison</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
