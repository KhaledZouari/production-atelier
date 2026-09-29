import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { pool } from '../config/db.js';

export const getByProduction = async (req, res, next) => {
  try {
    const prod = await pool
      .request()
      .input('id', req.params.productionId)
      .query(
        `SELECT p.*, o.code as opCode, o.nom as opNom, o.tailleLot, e.prenom, e.nom as eNom
         FROM Productions p
         LEFT JOIN Operations o ON p.operationId=o.id
         LEFT JOIN Employees e ON p.employeeId=e.id
         WHERE p.id=@id`
      );
    const row = prod.recordset[0];
    if (!row) return res.status(404).json({ message: 'Production non trouvée' });
    const jetons = Array.from({ length: row.nbLots }).map((_, i) => ({
      numeroLot: i + 1,
      totalLots: row.nbLots,
      operationCode: row.opCode,
      operationNom: row.opNom,
      lotSize: row.tailleLot,
      employeeName: `${row.prenom} ${row.eNom}`,
      date: row.date.toISOString().split('T')[0],
      chaine: row.chaine
    }));
    res.json(jetons);
  } catch (e) {
    next(e);
  }
};

export const printJetons = async (req, res, next) => {
  try {
    const { productionId } = req.body;
    const prod = await pool
      .request()
      .input('id', productionId)
      .query(
        `SELECT p.*, o.code as opCode, o.nom as opNom, o.tailleLot, e.prenom, e.nom as eNom
         FROM Productions p
         LEFT JOIN Operations o ON p.operationId=o.id
         LEFT JOIN Employees e ON p.employeeId=e.id
         WHERE p.id=@id`
      );
    const row = prod.recordset[0];
    if (!row) return res.status(404).json({ message: 'Production non trouvée' });

    const palette = {
      bg: '#fefdfb',
      border: '#d4a853',
      teal: '#2b5f6f',
      tealLight: '#3d7a8f',
      ink: '#111827',
      muted: '#4b5563'
    };

    const doc = new PDFDocument({ size: 'A4', margin: 24 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=jetons_${productionId}.pdf`);
    doc.pipe(res);

    const jetons = Array.from({ length: row.nbLots }).map((_, i) => ({
      numeroLot: i + 1,
      totalLots: row.nbLots,
      operationCode: row.opCode,
      operationNom: row.opNom,
      lotSize: row.tailleLot,
      employeeName: `${row.prenom} ${row.eNom}`,
      date: row.date.toISOString().split('T')[0],
      chaine: row.chaine
    }));

    const drawCard = async (j, x, y, w, h) => {
      const qrData = `PROD:${productionId}:LOT:${j.numeroLot}`;
      const qr = await QRCode.toDataURL(qrData);

      // Card background + border
      doc
        .lineWidth(2)
        .roundedRect(x, y, w, h, 12)
        .fillAndStroke(palette.bg, palette.border);

      // Header
      doc.fillColor(palette.teal).fontSize(18).text('JETON PRODUCTION', x + 16, y + 16);
      doc.moveTo(x + 16, y + 40).lineTo(x + w - 16, y + 40).stroke(palette.border);

      // Info block
      const infoY = y + 54;
      doc.fontSize(11).fillColor(palette.ink);
      doc.text(`Lot ${j.numeroLot}/${j.totalLots}`, x + 16, infoY);
      doc.text(`Opération : ${j.operationCode} - ${j.operationNom}`, x + 16, infoY + 20);
      doc.text(`Taille lot : ${j.lotSize} pcs`, x + 16, infoY + 40);
      doc.text(`Employé(e) : ${j.employeeName}`, x + 16, infoY + 60);
      doc.text(`Date : ${j.date}`, x + 16, infoY + 80);
      doc.text(`Chaîne : ${j.chaine}`, x + 16, infoY + 100);

      // Signature area
      doc
        .roundedRect(x + 16, infoY + 130, w - 32, 40, 8)
        .stroke(palette.tealLight);
      doc.fillColor(palette.muted).fontSize(10).text('Validation chef de chaîne', x + 22, infoY + 138);

      // QR block
      const qrX = x + w - 150;
      const qrY = infoY + 10;
      doc
        .roundedRect(qrX - 8, qrY - 8, 140, 140, 10)
        .stroke(palette.teal);
      doc.image(Buffer.from(qr.split(',')[1], 'base64'), qrX, qrY, { width: 120, height: 120 });
      doc.fillColor(palette.muted).fontSize(9).text('Scan', qrX + 45, qrY + 128);

      // Footer
      doc
        .moveTo(x, y + h - 12)
        .lineTo(x + w, y + h - 12)
        .stroke(palette.border);
      doc.fillColor(palette.muted).fontSize(9).text('Cartexia · Atelier', x + 16, y + h - 24);
    };

    const cardWidth = 555;
    const cardHeight = 360;
    for (let i = 0; i < jetons.length; i++) {
      const j = jetons[i];
      if (i > 0 && i % 2 === 0) doc.addPage();
      const y = i % 2 === 0 ? 20 : 420;
      await drawCard(j, 20, y, cardWidth, cardHeight);
    }
    doc.end();
  } catch (e) {
    next(e);
  }
};
