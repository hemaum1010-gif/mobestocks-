import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
  doc
} from 'firebase/firestore';
import { 
  Users, 
  Copy, 
  Share2, 
  Gift, 
  CheckCircle2,
  TrendingUp,
  Check,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { formatCurrency, cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

const Referral: React.FC = () => {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [redirectLink, setRedirectLink] = useState<string>(window.location.origin);

  const referralLink = `${redirectLink}/register?ref=${profile?.referralCode}`;

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.referralRedirectLink) {
          setRedirectLink(data.referralRedirectLink.replace(/\/$/, ''));
        }
      }
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!profile) return;

    // Sync logic to catch any referrals that might have missed the record creation
    const syncReferrals = async () => {
      try {
        const qUsers = query(collection(db, 'users'), where('referredBy', '==', profile.uid));
        const userSnap = await getDocs(qUsers);
        
        for (const userDoc of userSnap.docs) {
          const userData = userDoc.data();
          const qRef = query(
            collection(db, 'referrals'), 
            where('referrerId', '==', profile.uid),
            where('referredId', '==', userDoc.id)
          );
          const refSnap = await getDocs(qRef);
          
          if (refSnap.empty) {
            await addDoc(collection(db, 'referrals'), {
              referrerId: profile.uid,
              referredId: userDoc.id,
              referredName: userData.fullName,
              hasInvested: (userData.totalInvestment || 0) > 0,
              commissionEarned: 0,
              createdAt: userData.createdAt || serverTimestamp()
            });
          }
        }
      } catch (error) {
        console.error("Referral sync error:", error);
      }
    };

    syncReferrals();

    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: 'Network Size', value: referrals.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active Nodes', value: referrals.filter(r => r.hasInvested).length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Yield Accrued', value: referrals.reduce((acc, curr) => acc + (curr.commissionEarned || 0), 0), icon: Gift, color: 'text-luxury', bg: 'bg-luxury/10' },
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
      className="max-w-6xl mx-auto space-y-12 pb-20"
    >
      <motion.div variants={item} className="text-center space-y-4">
        <h2 className="text-5xl font-black uppercase tracking-tight">Network Expansion</h2>
        <div className="h-1 w-24 bg-primary mx-auto rounded-full" />
        <p className="text-white/30 font-light text-lg">Invite elite investors to MOBESTOCKS and secure 5% commission on their capital influx.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            variants={item}
            className="glass-card p-8 flex items-center gap-6 border border-white/[0.05] group hover:border-primary/20 transition-all duration-500"
          >
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110", stat.bg, stat.color)}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="text-3xl font-black tracking-tighter">{idx === 2 ? formatCurrency(stat.value) : stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} className="glass-card p-10 border border-white/[0.05] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -z-10 group-hover:bg-primary/10 transition-all" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4 flex-1">
            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4">
              <Share2 className="text-primary" size={28} />
              Protocol Link
            </h3>
            <p className="text-white/30 font-light max-w-md">Share this unique identifier to synchronize your network and begin accrual.</p>
          </div>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
            <div className="flex-1 md:w-80 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] font-mono text-xs text-white/40 break-all flex items-center">
              {referralLink}
            </div>
            <button 
              onClick={handleCopy}
              className="gradient-button flex items-center justify-center gap-3 px-10 py-5 group/btn"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Check size={20} />
                  </motion.div>
                ) : (
                  <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Copy size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                {copied ? 'Synchronized' : 'Copy Link'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="glass-card p-10 border border-white/[0.05]">
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-1">
            <h3 className="text-2xl font-black uppercase tracking-tight">Network Ledger</h3>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Real-time referral synchronization</p>
          </div>
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Users size={24} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/[0.05]">
                <th className="pb-6 px-4">Elite Member</th>
                <th className="pb-6 px-4">Initialization</th>
                <th className="pb-6 px-4">Status</th>
                <th className="pb-6 px-4 text-right">Yield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {referrals.length > 0 ? (
                referrals.map((ref, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={ref.id} 
                    className="group hover:bg-white/[0.01] transition-all"
                  >
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black border border-primary/10 group-hover:scale-110 transition-transform">
                          {ref.referredName?.[0] || 'U'}
                        </div>
                        <span className="font-black uppercase tracking-tight text-white/80 group-hover:text-white transition-colors">{ref.referredName}</span>
                      </div>
                    </td>
                    <td className="py-6 px-4 text-xs font-bold text-white/20 uppercase tracking-widest">
                      {ref.createdAt?.toDate()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-6 px-4">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        ref.hasInvested 
                          ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10" 
                          : "bg-luxury/5 text-luxury border-luxury/10"
                      )}>
                        <div className={cn("w-1 h-1 rounded-full", ref.hasInvested ? "bg-emerald-500" : "bg-luxury")} />
                        {ref.hasInvested ? 'Active Asset' : 'Pending Sync'}
                      </div>
                    </td>
                    <td className="py-6 px-4 text-right">
                      <span className="text-sm font-black text-emerald-500 tracking-tight">
                        {ref.commissionEarned ? `+${formatCurrency(ref.commissionEarned)}` : '₹0.00'}
                      </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-white/10 space-y-6">
                      <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center">
                        <TrendingUp size={40} className="opacity-20" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xl font-black uppercase tracking-[0.3em]">Network Empty</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Deploy your protocol link to begin network expansion</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Referral;
