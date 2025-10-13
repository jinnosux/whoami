import { NextRequest, NextResponse } from 'next/server';

const LOCALHOST_IPS = ['::1', '127.0.0.1', '::ffff:127.0.0.1', 'Unknown'];

const isLocalhost = (ip: string) => {
  return LOCALHOST_IPS.includes(ip) ||
         ip.startsWith('127.') ||
         ip.startsWith('::ffff:127.');
};

export async function GET(request: NextRequest) {
  const headers = request.headers;

  // Get client IP (works with various proxy configurations)
  let ip =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    'Unknown';

  // If localhost/IPv6 localhost, fetch real public IP
  if (isLocalhost(ip)) {
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

  // Collect all relevant headers and browser information
  const clientInfo = {
    ip,
    userAgent: headers.get('user-agent') || 'Unknown',
    language: headers.get('accept-language') || 'Unknown',
    encoding: headers.get('accept-encoding') || 'Unknown',
    connection: headers.get('connection') || 'Unknown',
    host: headers.get('host') || 'Unknown',
    referer: headers.get('referer') || 'None',

    // Additional headers
    headers: {
      'accept': headers.get('accept') || 'Unknown',
      'cache-control': headers.get('cache-control') || 'Unknown',
      'dnt': headers.get('dnt') || 'Unknown',
      'upgrade-insecure-requests': headers.get('upgrade-insecure-requests') || 'Unknown',
      'sec-fetch-dest': headers.get('sec-fetch-dest') || 'Unknown',
      'sec-fetch-mode': headers.get('sec-fetch-mode') || 'Unknown',
      'sec-fetch-site': headers.get('sec-fetch-site') || 'Unknown',
    },

    // Request details
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
  };

  // Try to get more detailed IP information from an external service
  try {
    const ipInfoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (ipInfoResponse.ok) {
      const ipInfo = await ipInfoResponse.json();
      if (ipInfo.status === 'success') {
        return NextResponse.json({
          ...clientInfo,
          location: {
            ip: ipInfo.query,
            country: ipInfo.country,
            countryCode: ipInfo.countryCode,
            region: ipInfo.regionName,
            city: ipInfo.city,
            zip: ipInfo.zip,
            latitude: ipInfo.lat,
            longitude: ipInfo.lon,
            timezone: ipInfo.timezone,
            isp: ipInfo.isp,
            org: ipInfo.org,
            as: ipInfo.as,
          }
        });
      }
    }
  } catch (error) {
    console.error('Error fetching IP info:', error);
  }

  return NextResponse.json(clientInfo);
}
