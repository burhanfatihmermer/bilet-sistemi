import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import QRCode from 'qrcode';
import {
  Ticket,
  Plus,
  Scan,
  List,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Calendar,
  ArrowLeft,
  Download,
  Settings,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TicketData {
  id: string;
  attendee_name: string;
  email: string;
  status: 'pending' | 'checked_in';
  created_at: string;
  checked_in_at: string | null;
}

type View = 'list' | 'create' | 'scan' | 'admin';

export default function App() {
  const [view, setView] = useState<View>('list');
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'warning' | 'error'; message: string; ticket?: any } | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const attendee_name = formData.get('name') as string;
    const email = formData.get('email') as string;

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendee_name, email }),
      });
      if (res.ok) {
        await fetchTickets();
        setView('list');
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    }
  };

  const handleCheckIn = async (ticketId: string) => {
    try {
      const res = await fetch('/api/tickets/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
      });
      const data = await res.json();

      if (res.ok) {
        setScanResult({ status: 'success', message: "Geçerli Bilet - Onaylandı", ticket: data.ticket });
        fetchTickets();
      } else if (res.status === 400 && data.error === "Already checked in") {
        const timeStr = new Date(data.checked_in_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        setScanResult({ 
          status: 'warning', 
          message: `Bu bilet daha önce saat ${timeStr}'de kullanılmış!`, 
          ticket: { attendee_name: data.attendee_name } 
        });
      } else {
        setScanResult({ status: 'error', message: "Hata: Sistemde böyle bir bilet bulunamadı veya bu etkinliğe ait değil." });
      }

      // 3 saniye sonra ekranı otomatik temizle (Sürekli okutma için)
      setTimeout(() => setScanResult(null), 3000);

    } catch (err) {
      setScanResult({ status: 'error', message: 'Ağ bağlantısı hatası!' });
      setTimeout(() => setScanResult(null), 3000);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const jsonText = formData.get('jsonText') as string;

    try {
      const ticketsArray = JSON.parse(jsonText);
      const res = await fetch('/api/tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets: ticketsArray }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`${data.insertedCount} bilet başarıyla eklendi!`);
        await fetchTickets();
        setView('list');
      } else {
        alert(`Hata: ${data.error}`);
      }
    } catch (err) {
      alert("Geçersiz JSON formatı. Lütfen kontrol edip tekrar deneyin.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
              <Ticket size={24} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">EventPass</h1>
          </div>

          <nav className="flex items-center gap-2 bg-[#E4E3E0] p-1 rounded-xl">
            <NavButton
              active={view === 'list'}
              onClick={() => setView('list')}
              icon={<List size={18} />}
              label="Ticket"
            />
            <NavButton
              active={view === 'scan'}
              onClick={() => setView('scan')}
              icon={<Scan size={18} />}
              label="Scanner"
            />
            <NavButton
              active={view === 'admin'}
              onClick={() => setView('admin')}
              icon={<Settings size={18} />}
              label="Admin"
            />
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold serif italic">Attendee List</h2>
                  <p className="text-sm text-black/50">Manage your event guests and tickets</p>
                </div>
                <button
                  onClick={() => setView('create')}
                  className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-black/80 transition-colors"
                >
                  <Plus size={20} />
                  <span>Issue Ticket</span>
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-black/20" size={40} />
                  <p className="text-sm font-mono text-black/40 uppercase tracking-widest">Loading Records</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-black/5 text-center space-y-4">
                  <div className="w-16 h-16 bg-[#F5F5F0] rounded-full flex items-center justify-center mx-auto text-black/20">
                    <Ticket size={32} />
                  </div>
                  <h3 className="text-lg font-medium">No tickets issued yet</h3>
                  <p className="text-black/50 max-w-xs mx-auto">Start by issuing your first event ticket to an attendee.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {tickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto"
            >
              <button
                onClick={() => setView('list')}
                className="mb-6 flex items-center gap-2 text-sm font-medium text-black/50 hover:text-black transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back to list</span>
              </button>

              <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">Issue New Ticket</h2>
                  <p className="text-sm text-black/50">Enter attendee details to generate a unique QR ticket.</p>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-black/40 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                      <input
                        required
                        name="name"
                        type="text"
                        placeholder="e.g. Jane Doe"
                        className="w-full bg-[#F5F5F0] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-black/40 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                      <input
                        required
                        name="email"
                        type="email"
                        placeholder="jane@example.com"
                        className="w-full bg-[#F5F5F0] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-black/80 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    <span>Generate Ticket</span>
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'scan' && (
            <motion.div
              key="scan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xl mx-auto space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Entrance Scanner</h2>
                <p className="text-sm text-black/50">Point the camera at the attendee's ticket QR code</p>
              </div>

              <div className="relative aspect-square max-w-sm mx-auto bg-black rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                <Scanner onScan={handleCheckIn} />

                {/* Scanner Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-white/30 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>

                    {/* Scanning Line Animation */}
                    <motion.div
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {scanResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                      "p-6 rounded-3xl border flex items-start gap-4 shadow-lg",
                      scanResult.status === 'success'
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : scanResult.status === 'warning'
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                      scanResult.status === 'success' ? "bg-emerald-500 text-white" :
                      scanResult.status === 'warning' ? "bg-amber-500 text-white" :
                      "bg-rose-500 text-white"
                    )}>
                      {scanResult.status === 'success' ? <CheckCircle2 size={24} /> :
                       scanResult.status === 'warning' ? <AlertCircle size={24} /> :
                       <XCircle size={24} />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-bold text-lg">
                        {scanResult.status === 'success' ? 'Başarılı' :
                         scanResult.status === 'warning' ? 'Uyarı' :
                         'Hata'}
                      </h3>
                      <p className="text-sm opacity-80">{scanResult.message}</p>
                      {scanResult.ticket && scanResult.ticket.attendee_name && (
                        <div className="mt-3 pt-3 border-t border-black/5 space-y-1">
                          <p className="text-xs font-bold uppercase tracking-wider opacity-40">Katılımcı</p>
                          <p className="font-medium">{scanResult.ticket.attendee_name}</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setScanResult(null)}
                      className="text-sm font-bold uppercase tracking-wider opacity-40 hover:opacity-100 transition-opacity"
                    >
                      Kapat
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                  <Settings size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Admin Paneli</h2>
                  <p className="text-sm text-black/50">Toplu Bilet Yükleme Modülü</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
                <div className="bg-amber-50 text-amber-900 p-4 rounded-2xl border border-amber-200">
                  <h3 className="font-bold flex items-center gap-2 mb-2">
                    <AlertCircle size={18} /> Format Bilgisi
                  </h3>
                  <p className="text-sm opacity-90 mb-2">Yüklenecek bilet verisi aşağıdaki gibi bir <strong>JSON dizisi (array)</strong> olmalıdır. Aynı ID'ye sahip biletler atlanır.</p>
                  <pre className="text-xs bg-white p-3 rounded-lg overflow-x-auto border border-amber-200/50">
{`[
  {
    "id": "Özel-QR-Degeri-1",
    "attendee_name": "Ahmet Yılmaz",
    "email": "ahmet@ornek.com"
  }
]`}
                  </pre>
                </div>

                <form onSubmit={handleBulkUpload} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-black/40 ml-1">JSON Verisi</label>
                    <textarea
                      required
                      name="jsonText"
                      rows={10}
                      placeholder="JSON dizisini buraya yapıştırın..."
                      className="w-full bg-[#F5F5F0] border-none rounded-2xl p-4 font-mono text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-black/80 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload size={20} />
                    <span>Biletleri Sisteme Yükle</span>
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active ? "bg-white text-black shadow-sm" : "text-black/40 hover:text-black/60"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TicketCard({ ticket }: { ticket: TicketData; key?: string }) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(ticket.id, {
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    }).then(setQrUrl);
  }, [ticket.id]);

  return (
    <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            ticket.status === 'checked_in' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          )}>
            {ticket.status === 'checked_in' ? <CheckCircle2 size={24} /> : <Calendar size={24} />}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{ticket.attendee_name}</h3>
            <p className="text-sm text-black/40">{ticket.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
            ticket.status === 'checked_in'
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-black/5 text-black/40 border border-black/10"
          )}>
            {ticket.status === 'checked_in' ? 'Checked In' : 'Pending'}
          </div>
          <button
            onClick={() => setShowQr(!showQr)}
            className="p-2 hover:bg-[#F5F5F0] rounded-xl transition-colors text-black/40 hover:text-black"
          >
            <Scan size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showQr && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#F5F5F0] border-t border-black/5"
          >
            <div className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/5">
                <img src={qrUrl} alt="Ticket QR" className="w-48 h-48" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-black/30">Ticket ID</p>
                  <p className="font-mono text-xs break-all text-black/60">{ticket.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-black/30">Issued On</p>
                  <p className="text-sm">{new Date(ticket.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                </div>
                {ticket.checked_in_at && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/50">Checked In At</p>
                    <p className="text-sm text-emerald-700">{new Date(ticket.checked_in_at).toLocaleString()}</p>
                  </div>
                )}
                <a
                  href={qrUrl}
                  download={`ticket-${ticket.attendee_name.replace(/\s+/g, '-').toLowerCase()}.png`}
                  className="inline-flex items-center gap-2 text-sm font-semibold bg-white px-4 py-2 rounded-xl border border-black/10 hover:bg-white/80 transition-colors"
                >
                  <Download size={16} />
                  <span>Download Ticket</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Scanner({ onScan }: { onScan: (id: string) => void }) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScanTime = useRef<number>(0);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        // Prevent multiple scans in short succession
        const now = Date.now();
        if (now - lastScanTime.current > 3000) {
          lastScanTime.current = now;
          onScan(decodedText);
        }
      },
      (error) => {
        // Silently handle scan errors
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);

  return <div id="reader" className="w-full h-full" />;
}
