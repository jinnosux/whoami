import ClientInfo from './components/ClientInfo';
import WhoisSearch from './components/WhoisSearch';

export default function Home() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Matrix background effect */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#00ff41_2px,#00ff41_4px)]"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#00ff41] font-mono mb-3 tracking-wider animate-pulse" style={{textShadow: '0 0 15px #00ff41'}}>
            &gt; WHO AM I?
          </h1>
        </header>

        {/* Main Content */}
        <main className="flex flex-col items-center gap-8">
          {/* Client Information Section */}
          <ClientInfo />

          {/* Divider */}
          <div className="w-full max-w-4xl border-t-2 border-[#008f11] my-4"></div>

          {/* WHOIS Search Section */}
          <WhoisSearch />
        </main>

        {/* Footer */}
        <footer className="text-center mt-16 pb-8 matrix-text-green opacity-60">
          <p className="text-sm font-mono">
            <a href="https://vaha.dev" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
              vaha.dev
            </a>
            {' '}&copy; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
