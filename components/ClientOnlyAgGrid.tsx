'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Create a client-only wrapper that completely isolates ag-grid
const AgGridReact = dynamic(
  () => import('ag-grid-react').then((mod) => mod.AgGridReact),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-32 text-gray-500">Loading grid...</div>
  }
);

interface ClientOnlyAgGridProps {
  [key: string]: any;
}

export default function ClientOnlyAgGrid(props: ClientOnlyAgGridProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="flex items-center justify-center h-32 text-gray-500">Loading grid...</div>;
  }

  return <AgGridReact {...props} />;
}
