import { useEffect, useMemo, useState } from 'react';
import Header from '../components/common/Header';
import PrintWrapper from '../components/common/PrintWrapper';
import api from '../services/api';
import toast from 'react-hot-toast';

function BasketLabel({ basket, label, qr, barcodeUrl }) {
  return (
    <div className="basket-print-label">
      <div className="basket-label-head">
        <div>
          <div className="basket-label-title">Etiquette panier</div>
          <div className="basket-label-code">{basket.basketCode}</div>
        </div>
        {qr && <img src={qr} alt="QR Code panier" className="basket-label-qr" />}
      </div>
      <div className="basket-label-grid">
        <span>OF</span><strong>{basket.trackingSheetId || '-'}</strong>
        <span>Article</span><strong>{basket.articleReference || '-'}</strong>
        <span>Designation</span><strong>{basket.articleDesignation || '-'}</strong>
        <span>Taille</span><strong>{basket.size || label.size || '-'}</strong>
        <span>Couleur</span><strong>{basket.color || label.color || '-'}</strong>
        <span>Quantite</span><strong>{basket.quantity}</strong>
        <span>Operation</span><strong>{basket.currentOperationName || '-'}</strong>
        <span>Suivante</span><strong>{basket.nextOperationName || '-'}</strong>
        <span>Ouvriere</span><strong>{basket.employeeName || label.employeeName || '-'}</strong>
        <span>Objectif</span><strong>{label.desiredHourlyQuantity ? `${label.desiredHourlyQuantity} pcs/h` : '-'}</strong>
      </div>
      {barcodeUrl && <img src={barcodeUrl} alt="Code barre panier" className="basket-label-barcode" />}
    </div>
  );
}

export default function MesBaskets() {
  const [baskets, setBaskets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [operations, setOperations] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [scan, setScan] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [qr, setQr] = useState('');
  const [barcodeUrl, setBarcodeUrl] = useState('');
  const [form, setForm] = useState({
    articleReference: '',
    articleDesignation: '',
    color: '',
    size: '',
    quantity: '',
    trackingSheetId: '',
    employeeId: '',
    currentOperationId: '',
    currentOperationName: '',
    nextOperationId: '',
    nextOperationName: '',
    workshopName: '',
    lineName: ''
  });

  const load = async () => {
    const [basketRes, employeeRes, operationRes, sheetRes] = await Promise.all([
      api.get('/mes/baskets'),
      api.get('/employees'),
      api.get('/operations'),
      api.get('/mes/tracking-sheets')
    ]);
    setBaskets(basketRes.data);
    setEmployees(employeeRes.data);
    setOperations(operationRes.data);
    setSheets(sheetRes.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('Erreur chargement paniers'));
    return () => {
      if (barcodeUrl) URL.revokeObjectURL(barcodeUrl);
    };
  }, []);

  const create = async () => {
    try {
      await api.post('/mes/baskets', {
        ...form,
        quantity: Number(form.quantity || 0),
        trackingSheetId: form.trackingSheetId ? Number(form.trackingSheetId) : null,
        employeeId: form.employeeId ? Number(form.employeeId) : null,
        currentOperationId: form.currentOperationId ? Number(form.currentOperationId) : null,
        nextOperationId: form.nextOperationId ? Number(form.nextOperationId) : null
      });
      toast.success('Panier cree');
      setForm({ articleReference: '', articleDesignation: '', color: '', size: '', quantity: '', trackingSheetId: '', employeeId: '', currentOperationId: '', currentOperationName: '', nextOperationId: '', nextOperationName: '', workshopName: '', lineName: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur creation panier');
    }
  };

  const scanBasket = async (code) => {
    const value = String(code || '').trim();
    if (!value) {
      toast.error('Code panier obligatoire');
      return;
    }
    try {
      const scanRes = await api.get(`/mes/baskets/scan/${encodeURIComponent(value)}`);
      const resolvedCode = scanRes.data?.basket?.basketCode || value;
      const [qrResolved, barcodeResolved] = await Promise.all([
        api.get(`/mes/baskets/${encodeURIComponent(resolvedCode)}/qr`),
        api.get(`/mes/baskets/${encodeURIComponent(resolvedCode)}/barcode`, { responseType: 'blob' })
      ]);
      if (barcodeUrl) URL.revokeObjectURL(barcodeUrl);
      setScan(scanRes.data);
      setScanCode(resolvedCode);
      setQr(qrResolved.data.qr);
      setBarcodeUrl(URL.createObjectURL(new Blob([barcodeResolved.data], { type: 'image/png' })));
    } catch {
      toast.error('Panier introuvable');
    }
  };

  const setStatus = async (basket, status) => {
    await api.patch(`/mes/baskets/${basket._id}/status`, { status });
    toast.success('Statut mis a jour');
    load();
  };

  const scannedLabel = useMemo(() => {
    if (!scan?.basket?.qrPayload) return {};
    try {
      return JSON.parse(scan.basket.qrPayload);
    } catch {
      return {};
    }
  }, [scan]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <h1 className="page-title">Paniers de production</h1>

        <section className="card grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="form-control" value={form.trackingSheetId} onChange={(e) => setForm({ ...form, trackingSheetId: e.target.value })}>
            <option value="">Fiche suiveuse</option>
            {sheets.map((sheet) => (
              <option key={sheet._id} value={sheet._id}>{sheet.sheetNumber} - {sheet.articleReference}</option>
            ))}
          </select>
          <input className="form-control" placeholder="Reference article" value={form.articleReference} onChange={(e) => setForm({ ...form, articleReference: e.target.value })} />
          <input className="form-control" placeholder="Designation article" value={form.articleDesignation} onChange={(e) => setForm({ ...form, articleDesignation: e.target.value })} />
          <input className="form-control" placeholder="Couleur" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <input className="form-control" placeholder="Taille" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <input className="form-control" type="number" placeholder="Quantite" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <select className="form-control" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">Ouvriere affectee</option>
            {employees.map((employee) => (
              <option key={employee._id} value={employee._id}>{employee.matricule} - {employee.prenom} {employee.nom}</option>
            ))}
          </select>
          <select
            className="form-control"
            value={form.currentOperationId}
            onChange={(e) => {
              const operation = operations.find((item) => String(item._id) === e.target.value);
              setForm({ ...form, currentOperationId: e.target.value, currentOperationName: operation?.nom || '' });
            }}
          >
            <option value="">Operation actuelle</option>
            {operations.map((operation) => (
              <option key={operation._id} value={operation._id}>{operation.code} - {operation.nom}</option>
            ))}
          </select>
          <select
            className="form-control"
            value={form.nextOperationId}
            onChange={(e) => {
              const operation = operations.find((item) => String(item._id) === e.target.value);
              setForm({ ...form, nextOperationId: e.target.value, nextOperationName: operation?.nom || '' });
            }}
          >
            <option value="">Operation suivante</option>
            {operations.map((operation) => (
              <option key={operation._id} value={operation._id}>{operation.code} - {operation.nom}</option>
            ))}
          </select>
          <input className="form-control" placeholder="Atelier" value={form.workshopName} onChange={(e) => setForm({ ...form, workshopName: e.target.value })} />
          <input className="form-control" placeholder="Ligne" value={form.lineName} onChange={(e) => setForm({ ...form, lineName: e.target.value })} />
          <button className="btn btn-primary" onClick={create}>Creer panier</button>
        </section>

        <section className="card">
          <h2 className="font-bold text-slate-700 mb-3">Scan panier</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              className="form-control"
              placeholder="Scanner ou saisir code panier / QR"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') scanBasket(scanCode);
              }}
            />
            <button className="btn btn-primary" onClick={() => scanBasket(scanCode)}>Scanner</button>
          </div>
        </section>

        <section className="card">
          <h2 className="font-bold text-slate-700 mb-3">Liste et scan</h2>
          <table className="table-premium">
            <thead><tr><th>Code</th><th>Article</th><th>Quantite</th><th>Operation</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {baskets.map((basket) => (
                <tr key={basket._id}>
                  <td>{basket.basketCode}</td>
                  <td>{basket.articleReference} {basket.articleDesignation} {basket.size ? `- T${basket.size}` : ''} {basket.color ? `- ${basket.color}` : ''}</td>
                  <td>{basket.quantity}</td>
                  <td>{basket.currentOperationName}</td>
                  <td><span className={`chip ${basket.status === 'bloque' ? 'danger' : ''}`}>{basket.status}</span></td>
                  <td className="flex flex-wrap gap-2">
                    <button className="btn-mini" onClick={() => scanBasket(basket.basketCode)}>Scan</button>
                    <button className="btn-mini" onClick={() => setStatus(basket, 'en_cours')}>En cours</button>
                    <button className="btn-mini" onClick={() => setStatus(basket, 'termine')}>Termine</button>
                    <button className="btn-mini danger" onClick={() => setStatus(basket, 'bloque')}>Bloquer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {scan && (
          <section className="card grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <PrintWrapper label="Imprimer etiquette">
                <BasketLabel basket={scan.basket} label={scannedLabel} qr={qr} barcodeUrl={barcodeUrl} />
              </PrintWrapper>
            </div>
            <div className="space-y-3">
              {qr && <img src={qr} alt="QR Code panier" className="w-40 h-40" />}
              {barcodeUrl && <img src={barcodeUrl} alt="Barcode panier" className="max-w-full" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-700 mb-2">Historique panier</h3>
              <div className="space-y-2 text-sm">
                {scan.history.map((trace) => (
                  <div key={trace._id} className="border-b border-slate-200 pb-2">
                    <div>{trace.traceDate} - {trace.operationName || trace.status}</div>
                    <div className="text-slate-500">{trace.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
