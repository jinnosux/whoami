'use client';

import { useEffect, useState } from 'react';

interface ClientInfoData {
  ip: string;
  location?: {
    ip: string;
    country: string;
    countryCode: string;
    region: string;
    city: string;
    zip: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isp: string;
    org: string;
    as: string;
  };
}

export default function ClientIPInfo() {
  const [clientInfo, setClientInfo] = useState<ClientInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/client-info')
      .then((res) => res.json())
      .then((data) => {
        setClientInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-4xl matrix-card-primary">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#008f11]/30 rounded w-1/3"></div>
          <div className="h-4 bg-[#008f11]/30 rounded w-full"></div>
          <div className="h-4 bg-[#008f11]/30 rounded w-5/6"></div>
          <div className="h-4 bg-[#008f11]/30 rounded w-4/6"></div>
          <p className="matrix-text-green">&gt; LOADING DATA<span className="animate-pulse">_</span></p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl matrix-card-error">
        <h2 className="text-xl font-bold matrix-text-error mb-2">[ERROR]</h2>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!clientInfo) return null;

  return (
    <div className="w-full max-w-4xl font-mono">
      {/* Main IP and Location Info */}
      <div className="matrix-card-primary">
        <h2 className="matrix-heading-primary mb-4">&gt; IP ADDRESS</h2>
        <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#00ff41] font-mono mb-4 break-all" style={{textShadow: '0 0 15px #00ff41'}}>{clientInfo.ip}</div>

        {clientInfo.location && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm matrix-text-green">
            <div className="space-y-2">
              <p>
                <span className="matrix-text-dark-green">&gt; LOCATION:</span> {clientInfo.location.city}, {clientInfo.location.region}, {clientInfo.location.country}
              </p>
              <p>
                <span className="matrix-text-dark-green">&gt; TIMEZONE:</span> {clientInfo.location.timezone}
              </p>
              <p>
                <span className="matrix-text-dark-green">&gt; COORDINATES:</span> {clientInfo.location.latitude}, {clientInfo.location.longitude}
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <span className="matrix-text-dark-green">&gt; ISP:</span> {clientInfo.location.isp}
              </p>
              <p>
                <span className="matrix-text-dark-green">&gt; ORGANIZATION:</span> {clientInfo.location.org}
              </p>
              <p>
                <span className="matrix-text-dark-green">&gt; AS:</span> {clientInfo.location.as}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
