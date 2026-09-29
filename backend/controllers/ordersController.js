import { pool } from '../config/db.js';

const todayIso = () => new Date().toISOString().split('T')[0];
const parseDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : todayIso());

const mapAgg = (rows, key) =>
  rows.reduce((acc, r) => {
    acc[r.orderId] = Number(r[key] || 0);
    return acc;
  }, {});

const computeStatut = (row, restFab, restLiv) => {
  if (row.statut === 'bloque') return 'bloque';
  if (restFab === 0 && restLiv === 0) return 'termine';
  if (restFab < row.quantiteTotale || restLiv < row.quantiteTotale) return 'en_cours';
  return 'en_attente';
};

const mapOrder = (row, flowAgg = {}, shipAgg = {}) => {
  const sortie = flowAgg[row.id] || 0;
  const shipped = shipAgg[row.id] || 0;
  const restFab = Math.max((row.quantiteTotale || 0) - sortie, 0);
  const restLiv = Math.max((row.quantiteTotale || 0) - shipped, 0);
  const statut = computeStatut(row, restFab, restLiv);
  return {
    _id: row.id,
    numeroOF: row.numeroOF,
    numeroCommande: row.numeroCommande,
    reference: row.reference,
    client: row.client,
    dateOF: row.dateOF,
    semaineLiv: row.semaineLiv,
    quantiteTotale: row.quantiteTotale,
    statut,
    usine: row.usine,
    ficheTechUrl: row.ficheTechUrl,
    notes: row.notes,
    quantiteSortie: sortie,
    quantiteLivre: shipped,
    restFab,
    restLiv
  };
};

export const list = async (req, res, next) => {
  try {
    const { statut, search } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (statut) {
      request.input('statut', statut);
      where += ' AND statut=@statut';
    }
    if (search) {
      request.input('search', `%${search}%`);
      where += ' AND (numeroOF LIKE @search OR client LIKE @search OR reference LIKE @search)';
    }
    const orders = (await request.query(`SELECT * FROM Orders ${where} ORDER BY createdAt DESC`)).recordset;
    const flows = (await pool.request().query('SELECT orderId, SUM(ISNULL(qtySortie,0)) as sortie FROM OrderFlows GROUP BY orderId')).recordset;
    const ships = (await pool.request().query('SELECT orderId, SUM(ISNULL(quantite,0)) as shipped FROM OrderShipments GROUP BY orderId')).recordset;
    const flowAgg = mapAgg(flows, 'sortie');
    const shipAgg = mapAgg(ships, 'shipped');
    res.json(orders.map((o) => mapOrder(o, flowAgg, shipAgg)));
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const oRes = await pool.request().input('id', id).query('SELECT * FROM Orders WHERE id=@id');
    const order = oRes.recordset[0];
    if (!order) return res.status(404).json({ message: 'OF non trouvé' });

    const flows = (
      await pool.request().input('id', id).query('SELECT * FROM OrderFlows WHERE orderId=@id ORDER BY date DESC, createdAt DESC')
    ).recordset;
    const ships = (
      await pool.request().input('id', id).query('SELECT * FROM OrderShipments WHERE orderId=@id ORDER BY dateLivraison DESC, createdAt DESC')
    ).recordset;
    const flowAgg = mapAgg([{ orderId: id, sortie: flows.reduce((s, f) => s + (f.qtySortie || 0), 0) }], 'sortie');
    const shipAgg = mapAgg([{ orderId: id, shipped: ships.reduce((s, f) => s + (f.quantite || 0), 0) }], 'shipped');

    res.json({
      order: mapOrder(order, flowAgg, shipAgg),
      flows,
      shipments: ships
    });
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const {
      numeroOF,
      numeroCommande = null,
      reference = null,
      client = null,
      dateOF = null,
      semaineLiv = null,
      quantiteTotale = 0,
      statut = 'en_attente',
      usine = null,
      ficheTechUrl = null,
      notes = null
    } = req.body;
    const result = await pool
      .request()
      .input('numeroOF', numeroOF)
      .input('numeroCommande', numeroCommande)
      .input('reference', reference)
      .input('client', client)
      .input('dateOF', dateOF || null)
      .input('semaineLiv', semaineLiv)
      .input('quantiteTotale', quantiteTotale || 0)
      .input('statut', statut || 'en_attente')
      .input('usine', usine)
      .input('ficheTechUrl', ficheTechUrl)
      .input('notes', notes)
      .query(
        `INSERT INTO Orders (numeroOF, numeroCommande, reference, client, dateOF, semaineLiv, quantiteTotale, statut, usine, ficheTechUrl, notes)
         OUTPUT INSERTED.* VALUES (@numeroOF,@numeroCommande,@reference,@client,@dateOF,@semaineLiv,@quantiteTotale,@statut,@usine,@ficheTechUrl,@notes)`
      );
    res.status(201).json(mapOrder(result.recordset[0]));
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      numeroOF,
      numeroCommande = null,
      reference = null,
      client = null,
      dateOF = null,
      semaineLiv = null,
      quantiteTotale = null,
      statut = null,
      usine = null,
      ficheTechUrl = null,
      notes = null
    } = req.body;
    const result = await pool
      .request()
      .input('id', id)
      .input('numeroOF', numeroOF)
      .input('numeroCommande', numeroCommande)
      .input('reference', reference)
      .input('client', client)
      .input('dateOF', dateOF || null)
      .input('semaineLiv', semaineLiv)
      .input('quantiteTotale', quantiteTotale)
      .input('statut', statut)
      .input('usine', usine)
      .input('ficheTechUrl', ficheTechUrl)
      .input('notes', notes)
      .query(
        `UPDATE Orders SET
            numeroOF=ISNULL(@numeroOF, numeroOF),
            numeroCommande=@numeroCommande,
            reference=@reference,
            client=@client,
            dateOF=@dateOF,
            semaineLiv=@semaineLiv,
            quantiteTotale=ISNULL(@quantiteTotale, quantiteTotale),
            statut=ISNULL(@statut, statut),
            usine=@usine,
            ficheTechUrl=@ficheTechUrl,
            notes=@notes
         WHERE id=@id;
         SELECT * FROM Orders WHERE id=@id`
      );
    if (!result.recordset[0]) return res.status(404).json({ message: 'OF non trouvé' });
    const flows = (await pool.request().input('id', id).query('SELECT SUM(ISNULL(qtySortie,0)) as sortie FROM OrderFlows WHERE orderId=@id')).recordset[0];
    const ships = (await pool.request().input('id', id).query('SELECT SUM(ISNULL(quantite,0)) as shipped FROM OrderShipments WHERE orderId=@id')).recordset[0];
    res.json(mapOrder(result.recordset[0], { [id]: flows?.sortie || 0 }, { [id]: ships?.shipped || 0 }));
  } catch (e) {
    next(e);
  }
};

export const addFlow = async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const { chaine = null, date = new Date().toISOString().split('T')[0], qtyEntree = null, qtySortie = null, remarque = null } = req.body;
    await pool
      .request()
      .input('orderId', orderId)
      .input('chaine', chaine)
      .input('date', date)
      .input('qtyEntree', qtyEntree)
      .input('qtySortie', qtySortie)
      .input('remarque', remarque)
      .query(
        `INSERT INTO OrderFlows (orderId, chaine, date, qtyEntree, qtySortie, remarque)
         VALUES (@orderId,@chaine,@date,@qtyEntree,@qtySortie,@remarque)`
      );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const addShipment = async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const { codeLivraison = null, dateLivraison = new Date().toISOString().split('T')[0], quantite = 0, commentaire = null } = req.body;
    await pool
      .request()
      .input('orderId', orderId)
      .input('codeLivraison', codeLivraison)
      .input('dateLivraison', dateLivraison)
      .input('quantite', quantite)
      .input('commentaire', commentaire)
      .query(
        `INSERT INTO OrderShipments (orderId, codeLivraison, dateLivraison, quantite, commentaire)
         VALUES (@orderId,@codeLivraison,@dateLivraison,@quantite,@commentaire)`
      );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const dailyFlows = async (req, res, next) => {
  try {
    const date = parseDate(req.query.date);
    const flows = (
      await pool
        .request()
        .input('date', date)
        .query(
          `SELECT f.*, o.numeroOF, o.client, o.reference, o.semaineLiv
           FROM OrderFlows f
           LEFT JOIN Orders o ON f.orderId = o.id
           WHERE f.date = @date
           ORDER BY o.numeroOF, f.chaine`
        )
    ).recordset;

    if (req.query.format === 'csv') {
      const header = 'Date;OF;Client;Référence;Chaîne;Entrée;Sortie;Remarque;SemLiv\n';
      const body = flows
        .map(
          (f) =>
            `${f.date};${f.numeroOF || ''};${f.client || ''};${f.reference || ''};${f.chaine || ''};${f.qtyEntree || ''};${f.qtySortie || ''};${(f.remarque || '').replace(/;/g, ',')};${f.semaineLiv || ''}`
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      return res.send('\ufeff' + header + body);
    }

    res.json({ date, flows });
  } catch (e) {
    next(e);
  }
};
