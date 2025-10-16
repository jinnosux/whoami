import { NextResponse } from 'next/server';

// Two-tier rate limiting system
interface RateLimit {
  count: number;
  resetTime: number;
  timestamps: number[]; // Track individual request times for abuse detection
  blocked: boolean;
  blockedUntil?: number;
}

const rateLimitMap = new Map<string, RateLimit>();
const PROXYCHECK_API_KEY = process.env.PROXYCHECK_API_KEY;

// Normal rate limit: 20 requests per minute
const NORMAL_WINDOW = 60 * 1000; // 1 minute
const NORMAL_MAX_REQUESTS = 20;

// Abuse detection: >10 requests in 30 seconds = 24 hour block
const ABUSE_WINDOW = 30 * 1000; // 30 seconds
const ABUSE_THRESHOLD = 10;
const ABUSE_BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getRateLimitKey(ip: string): string {
  return `vpn_check_${ip}`;
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number; reason?: string } {
  const key = getRateLimitKey(ip);
  const now = Date.now();
  let record = rateLimitMap.get(key);

  // Initialize record if doesn't exist
  if (!record) {
    record = {
      count: 1,
      resetTime: now + NORMAL_WINDOW,
      timestamps: [now],
      blocked: false
    };
    rateLimitMap.set(key, record);
    return { allowed: true, remaining: NORMAL_MAX_REQUESTS - 1, resetTime: record.resetTime };
  }

  // Check if IP is blocked due to abuse
  if (record.blocked && record.blockedUntil && now < record.blockedUntil) {
    const hoursLeft = Math.ceil((record.blockedUntil - now) / (60 * 60 * 1000));
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.blockedUntil,
      reason: `Blocked for abuse. Try again in ${hoursLeft} hours.`
    };
  }

  // Unblock if block period expired
  if (record.blocked && record.blockedUntil && now >= record.blockedUntil) {
    record.blocked = false;
    record.blockedUntil = undefined;
    record.count = 0;
    record.timestamps = [];
    record.resetTime = now + NORMAL_WINDOW;
  }

  // Check for abuse: >10 requests in 30 seconds
  record.timestamps.push(now);
  const recentRequests = record.timestamps.filter(ts => now - ts < ABUSE_WINDOW);
  record.timestamps = recentRequests; // Clean old timestamps

  if (recentRequests.length > ABUSE_THRESHOLD) {
    // ABUSE DETECTED - Block for 24 hours
    record.blocked = true;
    record.blockedUntil = now + ABUSE_BLOCK_DURATION;
    rateLimitMap.set(key, record);
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.blockedUntil,
      reason: 'Too many requests. Blocked for 24 hours due to abuse.'
    };
  }

  // Reset counter if window expired
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + NORMAL_WINDOW;
    rateLimitMap.set(key, record);
    return { allowed: true, remaining: NORMAL_MAX_REQUESTS - 1, resetTime: record.resetTime };
  }

  // Check normal rate limit
  if (record.count >= NORMAL_MAX_REQUESTS) {
    const secondsLeft = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      reason: `Rate limit: ${NORMAL_MAX_REQUESTS} requests per minute. Try again in ${secondsLeft} seconds.`
    };
  }

  // Increment counter
  record.count++;
  rateLimitMap.set(key, record);
  return { allowed: true, remaining: NORMAL_MAX_REQUESTS - record.count, resetTime: record.resetTime };
}

// Cleanup old entries and unblock expired blocks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    // Remove expired normal rate limits
    if (!record.blocked && now > record.resetTime) {
      rateLimitMap.delete(key);
    }
    // Remove expired blocks
    if (record.blocked && record.blockedUntil && now > record.blockedUntil) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function GET(request: Request) {
  try {
    // Check if API key is configured
    if (!PROXYCHECK_API_KEY) {
      return NextResponse.json(
        {
          error: 'Proxycheck.io API key not configured',
          isVpn: false,
          isProxy: false,
          isTor: false,
          isHosting: false,
          riskScore: 0,
          details: 'Add PROXYCHECK_API_KEY to .env.local to enable VPN detection'
        },
        { status: 500 }
      );
    }

    // Get client IP from headers (not server IP!)
    const headers = new Headers(request.headers);
    const forwarded = headers.get('x-forwarded-for');
    const realIp = headers.get('x-real-ip');
    const cfConnecting = headers.get('cf-connecting-ip'); // Cloudflare

    let ip = forwarded ? forwarded.split(',')[0].trim() :
             realIp ||
             cfConnecting ||
             'Unknown';

    // If still no IP (local development), try to get from client-info endpoint
    if (ip === 'Unknown' || ip === '127.0.0.1' || ip === '::1') {
      try {
        const publicIpResponse = await fetch('https://api.ipify.org?format=json');
        if (publicIpResponse.ok) {
          const publicIpData = await publicIpResponse.json();
          ip = publicIpData.ip;
        }
      } catch (error) {
        console.error('Error fetching public IP:', error);
      }
    }

    if (ip === 'Unknown' || ip === '127.0.0.1' || ip === '::1') {
      return NextResponse.json(
        {
          error: 'Could not determine client IP address',
          isVpn: false,
          isProxy: false,
          isTor: false,
          isHosting: false,
          riskScore: 0
        },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.reason || 'Rate limit exceeded',
          isVpn: false,
          isProxy: false,
          isTor: false,
          isHosting: false,
          riskScore: 0
        },
        { status: 429 }
      );
    }

    // Use proxycheck.io v2 API with proper parameters
    const proxyCheckUrl = `https://proxycheck.io/v2/${ip}?key=${PROXYCHECK_API_KEY}&vpn=1&asn=1&risk=1&port=1&seen=1&days=7&tag=whoami`;

    const response = await fetch(proxyCheckUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Proxycheck.io returned status ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error' || data.status === 'denied') {
      throw new Error(data.message || 'API request failed');
    }

    // Get the IP data
    const ipData = data[ip];
    if (!ipData) {
      throw new Error('No data returned for IP');
    }

    // Extract detection info - proxycheck returns 'yes'/'no' strings
    const isProxy = ipData.proxy === 'yes';
    const isVpn = isProxy && ipData.type && ipData.type.toLowerCase().includes('vpn');
    const isTor = isProxy && ipData.type && ipData.type.toLowerCase() === 'tor';
    const isHosting = ipData.type && ipData.type.toLowerCase().includes('hosting');

    const result = {
      isVpn: isVpn,
      isProxy: isProxy && !isVpn, // Separate proxy from VPN
      isTor: isTor,
      isHosting: isHosting || false,
      riskScore: parseInt(ipData.risk) || 0,
      details: '',
      provider: ipData.provider || ipData.isp || 'Unknown',
      country: ipData.country || 'Unknown',
      isocode: ipData.isocode || 'Unknown',
      asn: ipData.asn || 'Unknown',
      organization: ipData.organisation || ipData.organization || 'Unknown',
      proxyType: ipData.type || 'None',
      port: ipData.port || 'N/A',
      lastSeen: ipData.seen ? `${ipData.seen} days ago` : 'N/A',
      attackHistory: ipData['attack history'] || null
    };

    // Build details message
    const detectedTypes = [];
    if (result.isVpn) detectedTypes.push('VPN');
    if (result.isProxy) detectedTypes.push('Proxy');
    if (result.isTor) detectedTypes.push('Tor');
    if (result.isHosting) detectedTypes.push('Hosting/Datacenter');

    if (detectedTypes.length > 0) {
      result.details = `Detected: ${detectedTypes.join(', ')} | Provider: ${result.provider}`;
      if (result.proxyType !== 'None') {
        result.details += ` | Type: ${result.proxyType}`;
      }
    } else {
      result.details = `Clean IP | ISP: ${result.provider} | ${result.organization}`;
    }

    return NextResponse.json({
      ...result,
      ip,
      _rawPayload: ipData // Include raw payload for debug view
    });

  } catch (error) {
    console.error('VPN detection error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to analyze connection',
        isVpn: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        riskScore: 0
      },
      { status: 500 }
    );
  }
}
