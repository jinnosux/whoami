'use client';

import { useEffect, useState } from 'react';

interface VpnProxyData {
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  riskScore: number;
  details?: string;
  provider?: string;
  country?: string;
  isocode?: string;
  asn?: string;
  organization?: string;
  proxyType?: string;
  port?: string;
  lastSeen?: string;
  attackHistory?: Record<string, unknown> | null;
  error?: string;
  _rawPayload?: Record<string, unknown>;
}

export default function VpnProxyDetection() {
  const [data, setData] = useState<VpnProxyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayload, setShowPayload] = useState(false);

  useEffect(() => {
    fetch('/api/vpn-detection')
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-4xl matrix-card-secondary">
        <h3 className="matrix-heading-primary mb-4">&gt; VPN/PROXY DETECTION</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-[#008f11]/30 rounded w-3/4"></div>
          <div className="h-4 bg-[#008f11]/30 rounded w-2/3"></div>
          <p className="matrix-text-green text-sm">&gt; ANALYZING<span className="animate-pulse">_</span></p>
        </div>
      </div>
    );
  }

  // If there's an error or no data, don't render anything
  if (error || !data) {
    return null;
  }

  const getRiskColor = (score: number) => {
    if (score >= 75) return 'text-red-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-[#00ff41]';
  };

  const hasDetection = data.isVpn || data.isProxy || data.isHosting;

  return (
    <div className="w-full max-w-4xl matrix-card-secondary">
      <h3 className="matrix-heading-primary mb-4">&gt; VPN/PROXY DETECTION</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center py-2 border-b border-[#008f11]/30">
          <span className="matrix-text-dark-green">&gt; VPN/PROXY DETECTED:</span>
          <span className={data.isVpn || data.isProxy ? 'text-yellow-400 font-bold' : 'text-[#00ff41]'}>
            {data.isVpn || data.isProxy ? '[YES]' : '[NO]'}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#008f11]/30">
          <span className="matrix-text-dark-green">&gt; HOSTING/DATACENTER:</span>
          <span className={data.isHosting ? 'text-yellow-400 font-bold' : 'text-[#00ff41]'}>
            {data.isHosting ? '[YES]' : '[NO]'}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="matrix-text-dark-green">&gt; RISK SCORE:</span>
          <span className={`font-bold ${getRiskColor(data.riskScore)}`}>
            [{data.riskScore}%]
          </span>
        </div>

        {data.details && (
          <div className={`mt-4 p-3 bg-black/50 border rounded ${hasDetection ? 'border-yellow-600/50' : 'border-[#008f11]/50'}`}>
            <p className={`text-xs ${hasDetection ? 'text-yellow-400' : 'text-[#00ff41]'}`}>
              [INFO] {data.details}
            </p>
          </div>
        )}

        {/* Additional Security Info */}
        {(data.lastSeen && data.lastSeen !== 'N/A') && (
          <div className="mt-3 p-2 bg-black/30 border border-yellow-600/30 rounded">
            <p className="text-yellow-400 text-xs">
              [SECURITY] Last seen on proxy lists: {data.lastSeen}
            </p>
          </div>
        )}

        {data.attackHistory && (
          <div className="mt-3 p-2 bg-black/30 border border-red-600/30 rounded">
            <p className="text-red-400 text-xs font-bold">
              [WARNING] Attack history detected on this IP
            </p>
          </div>
        )}

        {/* Debug Payload Viewer */}
        {data._rawPayload && (
          <div className="mt-3">
            <button
              onClick={() => setShowPayload(!showPayload)}
              className="w-full p-2 bg-black/30 border border-[#008f11]/50 rounded hover:border-[#00ff41] transition-colors text-left"
            >
              <p className="text-[#00ff41] text-xs font-mono">
                [DEBUG] {showPayload ? 'Hide' : 'Show'} Raw API Response
              </p>
            </button>
            {showPayload && (
              <div className="mt-2 p-3 bg-black/50 border border-[#008f11] rounded overflow-x-auto">
                <pre className="text-[#00ff41] text-xs font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(data._rawPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
