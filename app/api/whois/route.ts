import { NextRequest, NextResponse } from 'next/server';
import { whoisDomain, whoisIp } from 'whoiser';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Check if query is an IP address or domain
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(query);

    // Perform WHOIS lookup with longer timeout
    let result;
    try {
      result = isIp
        ? await whoisIp(query, { timeout: 15000 })
        : await whoisDomain(query, { timeout: 15000 });
    } catch (whoisError) {
      // If direct WHOIS fails with timeout, set result as error to trigger fallback
      console.error('Direct WHOIS failed:', whoisError);
      result = { error: { error: 'Timeout or connection error' } };
    }

    // Check if all results are errors
    const allErrors = Object.values(result).every(
      (val: any) => val && val.error
    );

    // If all results are errors or timeout, try to use rdap.org as fallback (completely free, no limits)
    if (allErrors && !isIp) {
      try {
        // Try RDAP (Registration Data Access Protocol) - free and modern alternative to WHOIS
        // rdap.org is a public service with no rate limits
        const rdapResponse = await fetch(
          `https://rdap.org/domain/${encodeURIComponent(query)}`,
          { signal: AbortSignal.timeout(10000) } // 10 second timeout
        );

        if (rdapResponse.ok) {
          const rdapData = await rdapResponse.json();

          // Format RDAP response
          const formattedData: any = {
            'Domain Name': rdapData.ldhName || rdapData.unicodeName,
            'Status': rdapData.status,
            'Events': {},
          };

          // Parse events (registration, expiration, etc.)
          if (rdapData.events) {
            rdapData.events.forEach((event: any) => {
              formattedData['Events'][event.eventAction] = event.eventDate;
            });
          }

          // Parse name servers
          if (rdapData.nameservers) {
            formattedData['Name Servers'] = rdapData.nameservers.map((ns: any) => ns.ldhName);
          }

          // Parse entities (registrar, registrant, etc.)
          if (rdapData.entities) {
            rdapData.entities.forEach((entity: any) => {
              if (entity.roles) {
                const role = entity.roles[0];
                if (entity.vcardArray && entity.vcardArray[1]) {
                  const vcard = entity.vcardArray[1];
                  const name = vcard.find((v: any) => v[0] === 'fn');
                  if (name && name[3]) {
                    formattedData[`${role} Name`] = name[3];
                  }
                }
              }
            });
          }

          result = {
            'rdap.org (fallback)': formattedData
          };
        } else {
          console.log('RDAP response not ok:', rdapResponse.status);
        }
      } catch (apiError) {
        console.error('Fallback API error:', apiError);
        // Continue with original result if fallback fails
      }
    }

    // Format the response
    return NextResponse.json({
      query,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('WHOIS lookup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform WHOIS lookup',
        message: error instanceof Error ? error.message : 'Unknown error',
        query,
      },
      { status: 500 }
    );
  }
}
