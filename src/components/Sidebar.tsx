import React from 'react';
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
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
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
    <div className="w-72 glass-card h-[calc(100vh-2rem)] m-4 flex flex-col hidden md:flex border border-white/[0.05] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="p-8 border-b border-white/[0.05] space-y-1">
        <h1 className="text-2xl font-black tracking-tighter text-secondary">MOBESTOCKS</h1>
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Elite Protocol v2.4</p>
      </div>

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
        {menuItems.map((item, idx) => (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 border",
              activeTab === item.id 
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                : "text-white/30 border-transparent hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={20} className={activeTab === item.id ? "text-white" : "text-white/20"} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">{item.label}</span>
          </motion.button>
        ))}

        {csLink && (
          <motion.a
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: menuItems.length * 0.05 }}
            href={csLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 border text-white/30 border-transparent hover:bg-white/5 hover:text-white"
          >
            <Headset size={20} className="text-white/20" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Customer Service</span>
          </motion.a>
        )}

        {downloadLink && (
          <motion.a
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (menuItems.length + 1) * 0.05 }}
            href={downloadLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 border text-emerald-500 bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10"
          >
            <Download size={20} className="text-emerald-500/50" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Download App</span>
          </motion.a>
        )}
      </nav>

      <div className="p-6 border-t border-white/[0.05]">
        <button 
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-rose-500 bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-all duration-500"
        >
          <LogOut size={20} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Terminate Session</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
