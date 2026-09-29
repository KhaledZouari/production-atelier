export const StatCard = ({ title, value, subtitle }) => (
  <div className="bg-white p-4 rounded shadow-sm border border-slate-100">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="text-2xl font-semibold text-slate-900">{value}</p>
    {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
  </div>
);
