'use client';

import { useEffect, useState } from 'react';

interface ClientInfoData {
  host: string;
  connection: string;
  method: string;
}

export default function ConnectionDetails() {
  const [clientInfo, setClientInfo] = useState<ClientInfoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client-info')
      .then((res) => res.json())
      .then((data) => {
        setClientInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-4xl matrix-card-secondary">
        <h3 className="matrix-heading-primary mb-4">&gt; CONNECTION DETAILS</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-[#008f11]/30 rounded w-full"></div>
          <div className="h-4 bg-[#008f11]/30 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!clientInfo) return null;

  return (
    <div className="w-full max-w-4xl matrix-card-secondary font-mono">
      <h3 className="matrix-heading-primary mb-4">&gt; CONNECTION DETAILS</h3>
      <div className="space-y-2 text-sm">
        <InfoRow label="HOST" value={clientInfo.host} />
        <InfoRow label="CONNECTION" value={clientInfo.connection} />
        <InfoRow label="METHOD" value={clientInfo.method} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 py-2 border-b border-[#008f11]/30 last:border-0">
      <span className="font-semibold matrix-text-dark-green min-w-[150px]">&gt; {label}:</span>
      <span className="matrix-text-green break-all">{value}</span>
    </div>
  );
}
