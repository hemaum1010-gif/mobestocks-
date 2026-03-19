import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc 
} from 'firebase/firestore';
import { 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History,
  Crown,
  Zap,
  ShieldCheck,
  Gem,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { formatCurrency, cn } from '../utils';
import { Transaction, UserInvestment, AppSettings } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { motion } from 'motion/react';
import { MessageCircle, Headset, ArrowDownCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { profile, setActiveTab } = useAuth();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [activeInvestments, setActiveInvestments] = useState<UserInvestment[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) setAdminSettings(snap.data() as AppSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/admin'));
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const qTx = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid)
    );

    const unsubscribeTx = onSnapshot(qTx, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      const sortedTxs = txs.sort((a, b) => {
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateB - dateA;
      });
      setRecentTransactions(sortedTxs.slice(0, 5));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    const qInv = query(
      collection(db, 'investments'),
      where('userId', '==', profile.uid),
      where('status', '==', 'active')
    );

    const unsubscribeInv = onSnapshot(qInv, (snapshot) => {
      setActiveInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserInvestment)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'investments'));

    setChartData([
      { name: 'Mon', profit: 400 },
      { name: 'Tue', profit: 300 },
      { name: 'Wed', profit: 600 },
      { name: 'Thu', profit: 800 },
      { name: 'Fri', profit: 500 },
      { name: 'Sat', profit: 900 },
      { name: 'Sun', profit: 1100 },
    ]);

    return () => {
      unsubscribeTx();
      unsubscribeInv();
    };
  }, [profile]);

  const stats = [
    { label: 'Available Balance', value: profile?.balance || 0, icon: Wallet, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active Portfolio', value: profile?.totalInvestment || 0, icon: Gem, color: 'text-luxury', bg: 'bg-luxury/10' },
    { label: 'Total Accrued', value: profile?.totalProfit || 0, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Total Harvested', value: profile?.totalWithdrawals || 0, icon: ArrowDownLeft, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-10"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-black tracking-tight uppercase">Portfolio</h2>
            <div className="h-px w-12 bg-primary/30" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Elite Tier</span>
          </div>
          <p className="text-white/30 font-light text-lg">Greetings, {profile?.fullName.split(' ')[0]}. Your assets are performing optimally.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('deposit')}
            className="glass-card px-6 py-3 border border-primary/20 hover:bg-primary/5 transition-all group flex items-center gap-3"
          >
            <ArrowDownCircle size={18} className="text-primary group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Deposit</span>
          </button>
          <div className="glass-card px-6 py-3 border border-white/[0.05] flex items-center gap-4">
            <ShieldCheck className="text-primary" size={18} />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Secure ID</span>
              <span className="text-xs font-mono text-white/60">{profile?.uid.slice(0, 12)}...</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-card p-8 border border-white/[0.05] group hover:border-primary/20 transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -z-10 group-hover:bg-primary/10 transition-all" />
            <div className="flex flex-col gap-6">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", stat.bg, stat.color)}>
                <stat.icon size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{stat.label}</p>
                <p className="text-3xl font-black tracking-tight">{formatCurrency(stat.value)}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Support & Community */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminSettings?.whatsappChannelLink && (
          <a 
            href={adminSettings.whatsappChannelLink}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-6 flex items-center justify-between group hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-white/80">WhatsApp Channel</h3>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Join our elite community</p>
              </div>
            </div>
            <ArrowUpRight className="text-white/20 group-hover:text-primary transition-colors" size={20} />
          </a>
        )}

        {adminSettings?.customerServiceLink && (
          <a 
            href={adminSettings.customerServiceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-6 flex items-center justify-between group hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Headset size={24} />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-white/80">Customer Support</h3>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">24/7 Protocol Assistance</p>
              </div>
            </div>
            <ArrowUpRight className="text-white/20 group-hover:text-primary transition-colors" size={20} />
          </a>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={item} className="lg:col-span-3 glass-card p-10 border border-white/[0.05] flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase tracking-wider">Ledger</h3>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Recent activity</p>
            </div>
            <button className="p-2 rounded-xl bg-white/5 hover:bg-primary/10 text-white/40 hover:text-primary transition-all">
              <History size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={tx.id} 
                  className="flex items-center justify-between group p-4 rounded-2xl bg-white/[0.01] border border-white/[0.02] hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                      tx.type === 'deposit' ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/10" :
                      tx.type === 'withdrawal' ? "bg-rose-500/5 border-rose-500/10 text-rose-500 group-hover:bg-rose-500/10" :
                      "bg-primary/5 border-primary/10 text-primary group-hover:bg-primary/10"
                    )}>
                      {tx.type === 'deposit' ? <ArrowDownLeft size={18} /> : 
                       tx.type === 'withdrawal' ? <ArrowUpRight size={18} /> : 
                       <Zap size={18} />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white/80">{tx.type}</p>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">{tx.createdAt?.toDate()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-sm font-black tracking-tight",
                    tx.type === 'deposit' || tx.type === 'profit' || tx.type === 'referral' ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {tx.type === 'deposit' || tx.type === 'profit' || tx.type === 'referral' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </p>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center text-center py-12 text-white/10">
                <History size={48} className="mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">No records found</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div variants={item} className="glass-card p-10 border border-white/[0.05]">
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-wider">Active Contracts</h3>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Current investment positions</p>
          </div>
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Crown size={20} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeInvestments.length > 0 ? (
            activeInvestments.map((inv, idx) => {
              const start = inv.startDate?.toMillis() || Date.now();
              const end = inv.endDate?.toMillis() || (start + 30 * 24 * 60 * 60 * 1000);
              const now = Date.now();
              const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
              const daysActive = Math.floor((now - start) / (24 * 60 * 60 * 1000));

              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  key={inv.id} 
                  className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 transition-all duration-500 group"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{inv.category}</p>
                      <h4 className="text-2xl font-black tracking-tight uppercase">{inv.planName}</h4>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">
                      Active
                    </div>
                  </div>
                  <div className="mb-6 flex items-center justify-between">
                    {inv.claimFrequency && (
                      <div className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[7px] font-black uppercase tracking-widest">
                        {inv.claimFrequency} Claim
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Zap size={10} className="text-emerald-500" />
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{daysActive} Days Active</span>
                    </div>
                  </div>
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Principal</span>
                      <span className="text-lg font-black">{formatCurrency(inv.amount)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Daily Yield</span>
                      <span className="text-lg font-black text-emerald-500">+{formatCurrency(inv.dailyProfit)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-widest">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="bg-primary h-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                      />
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/[0.05] grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[7px] font-black text-white/20 uppercase tracking-widest">Initialization</p>
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                        {inv.startDate?.toDate()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[7px] font-black text-white/20 uppercase tracking-widest">Maturity</p>
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                        {inv.endDate?.toDate()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-white/10">
              <TrendingUp size={80} className="mb-6 opacity-5" />
              <p className="text-xl font-black uppercase tracking-[0.3em] mb-2">No Active Positions</p>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Initialize a contract to begin wealth generation</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
