'use client';

import { useEffect, useState } from 'react';

interface WebRTCData {
  localIPs: string[];
  publicIP?: string;
  leaked: boolean;
  error?: string;
}

export default function WebRTCLeakTest() {
  const [data, setData] = useState<WebRTCData>({ localIPs: [], leaked: false });
  const [loading, setLoading] = useState(true);
  const [publicIP, setPublicIP] = useState<string>('');

  useEffect(() => {
    // Get public IP first
    fetch('/api/client-info')
      .then((res) => res.json())
      .then((info) => {
        setPublicIP(info.ip);
      })
      .catch(() => {});

    // Detect WebRTC IPs
    const detectWebRTC = async () => {
      const ips: string[] = [];

      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.createDataChannel('');

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            return;
          }

          const candidate = ice.candidate.candidate;
          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g;
          const ipMatches = candidate.match(ipRegex);

          if (ipMatches) {
            ipMatches.forEach((ip) => {
              // Filter out common local/private IPs
              if (!ips.includes(ip) &&
                  !ip.startsWith('0.') &&
                  ip !== '0.0.0.0') {
                ips.push(ip);
              }
            });

            // Check if any detected public IP is different from the expected public IP
            const publicIPs = ips.filter(ip => !isPrivateIP(ip));
            const leaked = publicIPs.some(ip => ip !== publicIP && publicIP !== '');

            setData({
              localIPs: ips,
              publicIP: publicIP,
              leaked: leaked
            });
          }
        };

        // Close connection after 3 seconds
        setTimeout(() => {
          pc.close();
          setLoading(false);
        }, 3000);

      } catch (err) {
        setData({
          localIPs: [],
          leaked: false,
          error: err instanceof Error ? err.message : 'WebRTC not supported'
        });
        setLoading(false);
      }
    };

    detectWebRTC();
  }, [publicIP]);

  const isPrivateIP = (ip: string): boolean => {
    const parts = ip.split('.').map(Number);
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127 ||
      ip.startsWith('fe80:') ||
      ip.startsWith('::1')
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl matrix-card-secondary">
        <h3 className="matrix-heading-primary mb-4">&gt; WEBRTC LEAK TEST</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-[#008f11]/30 rounded w-3/4"></div>
          <p className="matrix-text-green text-sm">&gt; TESTING WEBRTC<span className="animate-pulse">_</span></p>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="w-full max-w-4xl matrix-card-secondary">
        <h3 className="matrix-heading-primary mb-4">&gt; WEBRTC LEAK TEST</h3>
        <p className="text-yellow-400 text-sm">[INFO] {data.error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl matrix-card-secondary">
      <h3 className="matrix-heading-primary mb-4">&gt; WEBRTC LEAK TEST</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center py-2 border-b border-[#008f11]/30">
          <span className="matrix-text-dark-green">&gt; LEAK DETECTED:</span>
          <span className={data.leaked ? 'text-red-400 font-bold' : 'text-[#00ff41]'}>
            {data.leaked ? '[YES - IP EXPOSED]' : '[NO]'}
          </span>
        </div>

        {data.localIPs.length > 0 ? (
          <div className="space-y-2">
            <p className="matrix-text-dark-green">&gt; DETECTED IP ADDRESSES:</p>
            <div className="bg-black/50 border border-[#008f11] rounded p-3 space-y-1">
              {data.localIPs.map((ip, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-[#00ff41] font-mono text-xs">{ip}</span>
                  <span className="text-xs matrix-text-dark-green">
                    [{isPrivateIP(ip) ? 'PRIVATE' : 'PUBLIC'}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="matrix-text-green text-xs">[INFO] No WebRTC IPs detected</p>
        )}

        {data.leaked && (
          <div className="mt-4 p-3 bg-black/50 border border-red-600/50 rounded">
            <p className="text-red-400 text-xs">
              [WARNING] Your real IP address is exposed via WebRTC! This may bypass VPN protection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
