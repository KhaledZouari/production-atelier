import { Ticket, Trash2 } from 'lucide-react';

export default function ProductionTable({ productions, onDelete, onPrint }) {
  return (
    <div className="card overflow-x-auto">
      <table className="table-premium text-sm">
        <thead className="text-slate-700">
          <tr>
            <th className="px-3 py-2 text-left">Employee</th>
            <th className="px-3 py-2 text-center">Chaine</th>
            <th className="px-3 py-2 text-left">Operation</th>
            <th className="px-3 py-2 text-center">Lots</th>
            <th className="px-3 py-2 text-center">Pieces</th>
            <th className="px-3 py-2 text-center">Horaire</th>
            <th className="px-3 py-2 text-center">Rendement</th>
            <th className="px-3 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {productions.map((p) => (
            <tr key={p._id} className="border-b border-slate-100">
              <td className="px-3 py-2">
                {p.employeeId?.prenom} {p.employeeId?.nom}
              </td>
              <td className="px-3 py-2 text-center">{p.chaine}</td>
              <td className="px-3 py-2">
                {p.operationId?.code} - {p.operationId?.nom}
              </td>
              <td className="px-3 py-2 text-center">{p.nbLots}</td>
              <td className="px-3 py-2 text-center font-semibold">{p.totalPieces}</td>
              <td className="px-3 py-2 text-center text-xs">
                {p.heureDebut} - {p.heureFin}
              </td>
              <td className="px-3 py-2 text-center">
                <span
                  className={`px-2 py-1 rounded font-bold ${
                    p.rendement >= 100
                      ? 'bg-green-100 text-green-700'
                      : p.rendement >= 80
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {p.rendement.toFixed(1)}%
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <div className="flex gap-2 justify-center">
                  {onPrint && (
                    <button className="btn-mini" onClick={() => onPrint(p)}>
                      <Ticket size={16} />
                      Imprimer
                    </button>
                  )}
                  {onDelete && (
                    <button className="btn-mini danger" onClick={() => onDelete(p._id)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {productions.length === 0 && <p className="text-center text-slate-500 py-6">Aucune production</p>}
    </div>
  );
}
