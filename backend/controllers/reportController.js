import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { pool } from '../config/db.js';

const toRows = (prods) =>
  prods.map((p) => [
    p.date instanceof Date ? p.date.toISOString().split('T')[0] : p.date,
    p.employeeId,
    p.chaine,
    p.operationId,
    p.nbLots,
    p.totalPieces,
    p.heuresTravail,
    p.piecesParHeure,
    p.rendement
  ]);

export const daily = async (req, res, next) => {
  try {
    const { date, format = 'csv' } = req.query;
    const day = date || new Date().toISOString().split('T')[0];
    const result = await pool.request().input('date', day).query('SELECT * FROM Productions WHERE date=@date');
    const prods = result.recordset;

    if (format === 'csv') {
      const header = 'Date;Employée;Chaîne;Opération;Lots;Pièces;Heures;Pièces/h;Rendement (%)\n';
      const body = toRows(prods)
        .map((r) => r.join(';'))
        .join('\n');
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      return res.send('\ufeff' + header + body);
    }

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Daily');

      const header = ['Date', 'Employée', 'Chaîne', 'Opération', 'Lots', 'Pièces', 'Heures', 'Pièces/h', 'Rendement (%)'];
      ws.addRow(header);
      toRows(prods).forEach((r) => ws.addRow(r));

      // Styling
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B5F6F' } };
      ws.columns = [
        { key: 'date', width: 14 },
        { key: 'emp', width: 18 },
        { key: 'chain', width: 12 },
        { key: 'op', width: 24 },
        { key: 'lots', width: 8 },
        { key: 'pieces', width: 10 },
        { key: 'hours', width: 10 },
        { key: 'pph', width: 10 },
        { key: 'rend', width: 12 }
      ];
      ws.eachRow((row, idx) => {
        row.alignment = { vertical: 'middle', horizontal: idx === 1 ? 'center' : 'left' };
        row.border = {
          top: { style: 'thin', color: { argb: 'FFD4A853' } },
          bottom: { style: 'thin', color: { argb: 'FFD4A853' } }
        };
        if (idx > 1 && idx % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F3E5' } };
        }
      });
      // Number formats
      ws.getColumn(5).numFmt = '0';
      ws.getColumn(6).numFmt = '0';
      ws.getColumn(7).numFmt = '0.00';
      ws.getColumn(8).numFmt = '0.0';
      ws.getColumn(9).numFmt = '0.0';
      ws.views = [{ state: 'frozen', ySplit: 1 }];

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=daily.xlsx');
      await wb.xlsx.write(res);
      return res.end();
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);
      const palette = { teal: '#2b5f6f', gold: '#d4a853', ink: '#111827', muted: '#4b5563', bg: '#fefdfb' };

      doc.fontSize(18).fillColor(palette.teal).text('Rapport journalier', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .moveTo(40, doc.y)
        .lineTo(550, doc.y)
        .strokeColor(palette.gold)
        .lineWidth(2)
        .stroke();
      doc.moveDown();

      const headers = ['Date', 'Employée', 'Chaîne', 'Opération', 'Lots', 'Pièces', 'Heures', 'Pièces/h', 'Rendement %'];
      const colWidths = [70, 90, 60, 120, 50, 60, 60, 60, 70];
      const startX = 40;
      let y = doc.y + 6;

      // Header row
      doc.fillColor(palette.bg)
        .rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 22)
        .fill(palette.teal);
      doc.fillColor('#ffffff').fontSize(10);
      let x = startX + 6;
      headers.forEach((h, idx) => {
        doc.text(h, x, y + 6, { width: colWidths[idx] - 12, align: 'left' });
        x += colWidths[idx];
      });
      y += 22;

      // Rows
      doc.fontSize(10).fillColor(palette.ink);
      prods.forEach((p, rowIdx) => {
        const rowData = toRows([p])[0];
        const isEven = rowIdx % 2 === 1;
        if (isEven) {
          doc.fillColor(palette.bg)
            .rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 20)
            .fill('#f8f3e5');
        }
        doc.fillColor(palette.ink);
        let xx = startX + 6;
        rowData.forEach((cell, idx) => {
          const text = idx === 8 && typeof cell === 'number' ? `${cell}%` : cell;
          doc.text(String(text ?? ''), xx, y + 5, { width: colWidths[idx] - 12, align: 'left' });
          xx += colWidths[idx];
        });
        y += 20;
        if (y > 760) {
          doc.addPage();
          y = doc.y;
        }
      });
      doc.end();
      return;
    }

    res.status(400).json({ message: 'Format non supporté' });
  } catch (e) {
    next(e);
  }
};
