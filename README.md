# Who Am I?

A Matrix-themed Next.js web application that displays your IP address, geolocation, browser information, and provides WHOIS lookup functionality for domains and IP addresses.

## Features

- **IP Address Detection**: Automatically detects and displays your public IP address
- **Geolocation Information**: Shows your location, timezone, ISP, and organization details
- **Browser Information**: Displays user agent, language, encoding, and connection details
- **Request Headers**: View all HTTP request headers sent by your browser
- **WHOIS Lookup**: Search for domain or IP address registration information

## Technologies

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling and responsive design
- **Whoiser** - WHOIS lookup library

## APIs Used

- **[ipify](https://www.ipify.org/)** - Public IP detection for localhost environments
- **[ip-api.com](http://ip-api.com/)** - IP geolocation service
- **[rdap.org](https://rdap.org/)** - Fallback WHOIS lookup via RDAP protocol
- **Whoiser Library** - Primary WHOIS data retrieval

## How to Run Locally

### Prerequisites

- Node.js 18+ installed
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd whoami
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
whoami/
├── app/
│   ├── api/
│   │   ├── client-info/     # IP detection and geolocation endpoint
│   │   └── whois/           # WHOIS lookup endpoint
│   ├── components/
│   │   ├── ClientInfo.tsx   # Displays IP and browser information
│   │   └── WhoisSearch.tsx  # WHOIS lookup interface
│   ├── globals.css          # Global styles and Matrix theme
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
└── package.json
```
