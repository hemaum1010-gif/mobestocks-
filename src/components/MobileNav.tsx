import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Users, 
  History, 
  User, 
  Bell, 
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Headset,
  Download,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { AppSettings } from '../types';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin } = useAuth();
  const [csLink, setCsLink] = useState<string | null>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppSettings;
        setCsLink(data.customerServiceLink || null);
        setDownloadLink(data.appDownloadLink || null);
      }
    });
    return () => unsub();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'plans', label: 'Contracts', icon: TrendingUp },
    { id: 'deposit', label: 'Deposit', icon: ArrowDownCircle },
    { id: 'withdraw', label: 'Liquidation', icon: ArrowUpCircle },
    { id: 'referral', label: 'Network', icon: Users },
    { id: 'transactions', label: 'Ledger', icon: History },
    { id: 'profile', label: 'Dossier', icon: User },
    { id: 'mobeitor', label: 'Mobeitor Game', icon: Zap },
    { id: 'notifications', label: 'Broadcasts', icon: Bell },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'admin', label: 'Command Center', icon: ShieldCheck });
  }

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between p-4 glass-card m-4 border border-white/[0.05]">
        <h1 className="text-xl font-black tracking-tighter text-secondary">MOBESTOCKS</h1>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60"
        >
          <Menu size={24} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-12">
              <h1 className="text-2xl font-black tracking-tighter text-secondary">MOBESTOCKS</h1>
              <button 
                onClick={() => setIsOpen(false)} 
                className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <X size={28} />
              </button>
            </div>
            
            <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
              {menuItems.map((item, idx) => (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-5 px-6 py-5 rounded-2xl transition-all border",
                    activeTab === item.id 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                      : "text-white/30 border-transparent hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon size={22} className={activeTab === item.id ? "text-white" : "text-white/20"} />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                </motion.button>
              ))}

              {csLink && (
                <motion.a
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: menuItems.length * 0.05 }}
                  href={csLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl transition-all border text-white/30 border-transparent hover:bg-white/5 hover:text-white"
                >
                  <Headset size={22} className="text-white/20" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Customer Service</span>
                </motion.a>
              )}

              {downloadLink && (
                <motion.a
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (menuItems.length + 1) * 0.05 }}
                  href={downloadLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl transition-all border text-emerald-500 bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10"
                >
                  <Download size={22} className="text-emerald-500/50" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Download App</span>
                </motion.a>
              )}
            </nav>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 pt-8 border-t border-white/5"
            >
              <button 
                onClick={() => auth.signOut()}
                className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl text-rose-500 bg-rose-500/5 border border-rose-500/10"
              >
                <LogOut size={22} />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Terminate Session</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileNav;
