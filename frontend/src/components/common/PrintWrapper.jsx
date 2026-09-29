import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';
import { Printer } from 'lucide-react';

export default function PrintWrapper({ children, label = 'Imprimer' }) {
  const ref = useRef(null);
  const handlePrint = useReactToPrint({ content: () => ref.current });
  return (
    <div className="space-y-2">
      <button onClick={handlePrint} className="inline-flex items-center gap-2 btn btn-primary">
        <Printer size={16} /> {label}
      </button>
      <div ref={ref}>{children}</div>
    </div>
  );
}
