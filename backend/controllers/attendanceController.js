import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { pool } from '../config/db.js';

const parseDate = (d) => {
  if (!d) return null;
  return new Date(d).toISOString().split('T')[0];
};

export const mark = async (req, res, next) => {
  try {
    const { employeeId, date, present = true, remark = '' } = req.body;
    const day = parseDate(date);
    const emp = await pool.request().input('id', employeeId).query('SELECT * FROM Employees WHERE id=@id');
    const empRow = emp.recordset[0];
    if (!empRow) return res.status(400).json({ message: 'Employée invalide' });
    if (!empRow.active) return res.status(400).json({ message: 'Employée inactive' });
    await pool
      .request()
      .input('employeeId', employeeId)
      .input('date', day)
      .input('present', present ? 1 : 0)
      .input('remark', remark)
      .query(`
        MERGE Attendance AS target
        USING (SELECT @employeeId AS employeeId, @date AS date) AS src
        ON target.employeeId = src.employeeId AND target.date = src.date
        WHEN MATCHED THEN UPDATE SET present=@present, remark=@remark
        WHEN NOT MATCHED THEN INSERT (employeeId, date, present, remark) VALUES (@employeeId, @date, @present, @remark);
      `);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const daily = async (req, res, next) => {
  try {
    const day = parseDate(req.query.date);
    // Liste complète des employés actifs + statut du jour (même si non saisi)
    const result = await pool
      .request()
      .input('date', day)
      .query(
        `SELECT e.id as employeeId,
                e.matricule,
                e.nom,
                e.prenom,
                e.chaine,
                a.present,
                a.remark
         FROM Employees e
         LEFT JOIN Attendance a
           ON a.employeeId = e.id AND a.date = @date
         WHERE e.active = 1
         ORDER BY e.nom, e.prenom`
      );
    const rows = result.recordset;

    if (req.query.format === 'csv') {
      const presents = rows.filter((r) => r.present).length;
      const absents = rows.length - presents;
      const header = 'Date;Présent;Remarque;Matricule;Nom;Prénom;Chaîne\n';
      const body = rows
        .map(
          (r) =>
            `${day};${r.present ? 'Oui' : r.present === false ? 'Non' : 'Non saisi'};${(r.remark || '').replace(/;/g, ',')};${r.matricule || ''};${r.nom || ''};${r.prenom || ''};${r.chaine || ''}`
        )
        .join('\n');
      const summary = `\nTotal;;;;Présences:${presents};Absences:${absents}`;
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      return res.send('\ufeff' + header + body + summary);
    }

    if (req.query.format === 'excel') {
      const presents = rows.filter((r) => r.present).length;
      const absents = rows.length - presents;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Présence jour');
      const header = ['Date', 'Présent', 'Remarque', 'Matricule', 'Nom', 'Prénom', 'Chaîne'];
      ws.addRow(header);
      rows.forEach((r) => {
        ws.addRow([
          day,
          r.present ? 'Oui' : r.present === false ? 'Non' : 'Non saisi',
          r.remark || '',
          r.matricule || '',
          r.nom || '',
          r.prenom || '',
          r.chaine || ''
        ]);
      });
      ws.addRow(['Total', '', '', '', `Présences: ${presents}`, `Absences: ${absents}`, '']);

      // Styling
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B5F6F' } };
      ws.columns = [
        { width: 14 },
        { width: 12 },
        { width: 32 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
        { width: 12 }
      ];
      ws.eachRow((row, idx) => {
        row.alignment = { vertical: 'middle', horizontal: 'left' };
        row.border = {
          top: { style: 'thin', color: { argb: 'FFD4A853' } },
          bottom: { style: 'thin', color: { argb: 'FFD4A853' } }
        };
        if (idx > 1 && idx % 2 === 0 && idx !== ws.rowCount) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F3E5' } };
        }
      });
      const last = ws.lastRow;
      if (last) last.font = { bold: true, color: { argb: 'FF2B5F6F' } };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=presence_jour_${day}.xlsx`);
      await wb.xlsx.write(res);
      return res.end();
    }

    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const byEmployee = async (req, res, next) => {
  try {
    const { format = 'json', from, to } = req.query;
    const employeeId = Number(req.params.employeeId);
    const start = parseDate(from);
    const end = parseDate(to || from);

    const request = pool.request().input('employeeId', employeeId);
    let query = `SELECT a.*, e.matricule, e.nom, e.prenom
                 FROM Attendance a
                 LEFT JOIN Employees e ON a.employeeId = e.id
                 WHERE a.employeeId=@employeeId`;
    if (start) {
      request.input('from', start).input('to', end || start);
      query += ' AND a.date BETWEEN @from AND @to';
    }
    query += ' ORDER BY a.date ASC';

    const result = await request.query(query);

    const rows = result.recordset.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
      present: !!r.present,
      remark: r.remark || '',
      matricule: r.matricule,
      nom: r.nom,
      prenom: r.prenom
    }));

    if (format === 'csv') {
      const presents = rows.filter((r) => r.present).length;
      const absents = rows.length - presents;
      const header = 'Date;Présent;Remarque;Matricule;Nom;Prénom\n';
      const body = rows
        .map((r) => `${r.date};${r.present ? 'Oui' : 'Non'};${r.remark};${r.matricule};${r.nom};${r.prenom}`)
        .join('\n');
      const summary = `\nTotal;;;;Présences:${presents};Absences:${absents}`;
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      return res.send('\ufeff' + header + body + summary);
    }

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Présence');
      const header = ['Date', 'Présent', 'Remarque', 'Matricule', 'Nom', 'Prénom'];
      ws.addRow(header);
      rows.forEach((r) => {
        ws.addRow([
          r.date,
          r.present ? 'Oui' : 'Non',
          r.remark,
          r.matricule,
          r.nom,
          r.prenom
        ]);
      });
      const presents = rows.filter((r) => r.present).length;
      const absents = rows.length - presents;
      ws.addRow(['Total', '', '', '', `Présences: ${presents}`, `Absences: ${absents}`]);

      // Styling
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B5F6F' } };
      ws.columns = [
        { width: 14 },
        { width: 12 },
        { width: 30 },
        { width: 12 },
        { width: 18 },
        { width: 18 }
      ];
      ws.eachRow((row, idx) => {
        row.alignment = { vertical: 'middle', horizontal: 'left' };
        row.border = {
          top: { style: 'thin', color: { argb: 'FFD4A853' } },
          bottom: { style: 'thin', color: { argb: 'FFD4A853' } }
        };
        if (idx > 1 && idx % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F3E5' } };
        }
      });
      // Summary row highlight
      const last = ws.lastRow;
      last.font = { bold: true, color: { argb: 'FF2B5F6F' } };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=presence_${employeeId}.xlsx`);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (format === 'pdf') {
      const total = rows.length;
      const presents = rows.filter((r) => r.present).length;
      const absents = total - presents;
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=presence_${employeeId}.pdf`);
      doc.pipe(res);
      const palette = { teal: '#2b5f6f', gold: '#d4a853', ink: '#111827', bg: '#fefdfb', muted: '#4b5563' };

      doc.fillColor(palette.teal).fontSize(18).text('Rapport de présence', { align: 'center' });
      doc.moveDown(0.3);
      const empLine = rows[0]
        ? `${rows[0].matricule || ''} - ${rows[0].prenom || ''} ${rows[0].nom || ''}`
        : `Employé ${employeeId}`;
      doc.fontSize(11).fillColor(palette.ink).text(empLine, { align: 'center' });
      doc.moveDown();

      // Bandeau résumé
      doc
        .roundedRect(32, doc.y, 500, 50, 10)
        .fillAndStroke(palette.bg, palette.gold);
      doc.fillColor(palette.teal).fontSize(12);
      doc.text(`Total jours : ${total}`, 44, doc.y - 42);
      doc.text(`Présences : ${presents}`, 190, doc.y - 42);
      doc.text(`Absences : ${absents}`, 340, doc.y - 42);
      doc.moveDown(2);

      const headers = ['Date', 'Présence', 'Remarque'];
      const colWidths = [100, 100, 320];
      const startX = 40;
      let y = doc.y + 6;
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

      doc.fontSize(10).fillColor(palette.ink);
      rows.forEach((r, idx) => {
        const isEven = idx % 2 === 1;
        if (isEven) {
          doc.fillColor(palette.bg)
            .rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 20)
            .fill('#f8f3e5');
        }
        doc.fillColor(palette.ink);
        let xx = startX + 6;
        const data = [r.date, r.present ? 'Présent' : 'Absent', r.remark];
        data.forEach((cell, cIdx) => {
          doc.text(String(cell ?? ''), xx, y + 5, { width: colWidths[cIdx] - 12, align: 'left' });
          xx += colWidths[cIdx];
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

    res.json(rows);
  } catch (e) {
    next(e);
  }
};
