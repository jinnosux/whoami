'use client';

import { useState, useRef } from 'react';

interface WhoisResult {
  query: string;
  data: any;
  timestamp: string;
  error?: string;
  message?: string;
}

const RATE_LIMIT_SECONDS = 2;
const RATE_LIMIT_MS = RATE_LIMIT_SECONDS * 1000;

export default function WhoisSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<WhoisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const lastSearchTime = useRef<number>(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Rate limiting
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime.current;

    if (timeSinceLastSearch < RATE_LIMIT_MS) {
      const remainingTime = Math.ceil((RATE_LIMIT_MS - timeSinceLastSearch) / 1000);
      setError(`Please wait ${remainingTime} second${remainingTime > 1 ? 's' : ''} before searching again`);
      setCooldown(true);
      setCooldownTime(remainingTime);

      // Update cooldown timer
      const interval = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCooldown(false);
            setError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return;
    }

    lastSearchTime.current = now;
    setLoading(true);
    setError(null);
    setResult(null);
    setCooldown(false);

    try {
      const response = await fetch(`/api/whois?query=${encodeURIComponent(query.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch WHOIS data');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatWhoisData = (data: any): string => {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="w-full max-w-4xl space-y-6 font-mono">
      <div className="matrix-card-primary">
        <h2 className="matrix-heading-primary mb-4">&gt; WHOIS LOOKUP</h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="whois-query" className="block text-sm font-medium matrix-text-dark-green mb-2">
              &gt; ENTER DOMAIN OR IP ADDRESS
            </label>
            <div className="flex gap-2">
              <input
                id="whois-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="google.com or 8.8.8.8"
                className="flex-1 matrix-input"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !query.trim() || cooldown}
                className="matrix-button"
              >
                {loading ? '> SEARCHING...' : cooldown ? `> WAIT ${cooldownTime}s` : '> SEARCH'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setQuery('google.com')}
              className="matrix-button-small"
            >
              google.com
            </button>
            <button
              type="button"
              onClick={() => setQuery('github.com')}
              className="matrix-button-small"
            >
              github.com
            </button>
            <button
              type="button"
              onClick={() => setQuery('8.8.8.8')}
              className="matrix-button-small"
            >
              8.8.8.8
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="matrix-card-error">
          <h3 className="text-lg font-bold matrix-text-error mb-2">[ERROR]</h3>
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="matrix-card-secondary">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
            <h3 className="matrix-heading-secondary">
              &gt; RESULTS FOR: {result.query}
            </h3>
            <span className="text-xs matrix-text-dark-green">
              [{new Date(result.timestamp).toLocaleString()}]
            </span>
          </div>

          <div className="bg-black/50 border border-[#008f11] rounded p-4 overflow-x-auto">
            <pre className="text-xs matrix-text-green whitespace-pre-wrap break-words">
              {formatWhoisData(result.data)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
