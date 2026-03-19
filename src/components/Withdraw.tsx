import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
} from 'firebase/firestore';
import { 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Lock,
  Info,
  Banknote,
  Smartphone,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { formatCurrency, cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { sendTelegramNotification, escapeHTML } from '../services/telegramService';
import { doc, onSnapshot } from 'firebase/firestore';
import { AppSettings } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const Withdraw: React.FC = () => {
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'UPI' | 'Bank'>('UPI');
  const [details, setDetails] = useState({ upiId: '', accountNumber: '', ifscCode: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [adminSettings, setAdminSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        setAdminSettings(snap.data() as AppSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/admin'));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const checkBronzeUnlock = async () => {
      const qInv = query(
        collection(db, 'investments'),
        where('userId', '==', profile.uid),
        where('category', '==', 'Bronze'),
        where('status', '==', 'active')
      );
      const invSnap = await getDocs(qInv);
      
      if (!invSnap.empty) {
        const qRef = query(
          collection(db, 'referrals'),
          where('referrerId', '==', profile.uid),
          where('hasInvested', '==', true)
        );
        const refSnap = await getDocs(qRef);
        setReferralCount(refSnap.size);
        
        if (refSnap.size < 5) {
          setIsLocked(true);
        }
      }
    };

    checkBronzeUnlock();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !amount) return;

    if (Number(amount) > profile.balance) {
      setMessage({ type: 'error', text: 'Insufficient liquidity in portfolio.' });
      return;
    }

    const withdrawAmount = Number(amount);
    const minWithdrawal = adminSettings?.minWithdrawal || 100;
    const maxWithdrawal = adminSettings?.maxWithdrawal;

    if (withdrawAmount < minWithdrawal) {
      setMessage({ type: 'error', text: `Minimum withdrawal threshold is ₹${minWithdrawal}.` });
      return;
    }

    if (maxWithdrawal && withdrawAmount > maxWithdrawal) {
      setMessage({ type: 'error', text: `Maximum withdrawal threshold is ₹${maxWithdrawal}.` });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: profile.uid,
        userEmail: profile.email,
        amount: Number(amount),
        method,
        details: method === 'UPI' ? { upiId: details.upiId } : { accountNumber: details.accountNumber, ifscCode: details.ifscCode },
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await sendTelegramNotification(
        `<b>📤 NEW WITHDRAWAL REQUEST</b>\n\n` +
        `<b>User:</b> ${escapeHTML(profile.fullName)}\n` +
        `<b>Email:</b> ${escapeHTML(profile.email)}\n` +
        `<b>Amount:</b> ₹${amount}\n` +
        `<b>Method:</b> ${escapeHTML(method)}\n` +
        `<b>Details:</b> ${method === 'UPI' ? escapeHTML(details.upiId) : `A/C: ${escapeHTML(details.accountNumber)}, IFSC: ${escapeHTML(details.ifscCode)}`}\n` +
        `<b>Status:</b> PENDING`
      );

      setMessage({ type: 'success', text: 'Withdrawal protocol initiated. Processing within 24-48 hours.' });
      setAmount('');
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Protocol failure. Please re-authorize.' });
    } finally {
      setLoading(false);
    }
  };

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

  if (isLocked || profile?.isWithdrawalBlocked) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto glass-card p-12 text-center space-y-8 border border-rose-500/20 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
        <div className="h-24 w-24 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20 shadow-2xl shadow-rose-500/10">
          <ShieldAlert size={48} className="text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black uppercase tracking-tight text-rose-500">
            {profile?.isWithdrawalBlocked ? 'Account Restricted' : 'Protocol Locked'}
          </h2>
          <p className="text-white/30 font-light text-lg">
            {profile?.isWithdrawalBlocked 
              ? 'Suspicious activity detected. Withdrawal options temporarily suspended.' 
              : 'Security clearance required for Bronze Tier assets.'}
          </p>
        </div>
        
        {profile?.isWithdrawalBlocked ? (
          <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10">
            <p className="text-xs text-rose-500/60 leading-relaxed font-black uppercase tracking-widest">
              Our automated security system has flagged your account for unusual trading patterns. Please contact elite support for manual verification.
            </p>
          </div>
        ) : (
          <>
            <p className="text-white/60 leading-relaxed max-w-md mx-auto">
              Active <span className="text-primary font-black uppercase tracking-widest">Bronze Contracts</span> require a network of <span className="text-white font-black">5 elite referrals</span> to authorize external transfers.
            </p>
            <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/[0.05] space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Network Synchronization</p>
                <span className="text-xl font-black tracking-tighter">{referralCount} <span className="text-white/20">/ 5</span></span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(referralCount/5)*100}%` }}
                  className="bg-rose-500 h-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                />
              </div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{Math.round((referralCount/5)*100)}% Clearance</p>
            </div>
          </>
        )}
        
        <button 
          onClick={() => window.location.href = '/customer-service'}
          className="gradient-button w-full py-6 text-[11px] tracking-[0.3em]"
        >
          {profile?.isWithdrawalBlocked ? 'Contact Support' : 'Expand Network'}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-3xl mx-auto space-y-12"
    >
      <motion.div variants={item} className="text-center space-y-4">
        <h2 className="text-5xl font-black uppercase tracking-tight">Capital Outflux</h2>
        <div className="h-1 w-24 bg-primary mx-auto rounded-full" />
        <p className="text-white/30 font-light text-lg">Liquidate your portfolio gains to your external accounts.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={item} className="glass-card p-8 flex items-center gap-6 border border-white/[0.05] group hover:border-primary/30 transition-all">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-black transition-all">
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Available Liquidity</p>
            <p className="text-3xl font-black tracking-tighter text-luxury">{formatCurrency(profile?.balance || 0)}</p>
          </div>
        </motion.div>
        <motion.div variants={item} className="glass-card p-8 flex items-center gap-6 border border-white/[0.05] group hover:border-emerald-500/30 transition-all">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-all">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Min. Threshold</p>
            <p className="text-3xl font-black tracking-tighter">₹100</p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={cn(
              "p-6 rounded-3xl flex items-center gap-4 max-w-2xl mx-auto border",
              message.type === 'success' ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" : "bg-rose-500/5 text-rose-500 border-rose-500/20"
            )}
          >
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <p className="font-black uppercase tracking-widest text-sm">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={item} className="glass-card p-10 border border-white/[0.05] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -z-10 group-hover:bg-primary/10 transition-all" />
        
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-2 gap-6">
            <button 
              type="button"
              onClick={() => setMethod('UPI')}
              className={cn(
                "flex flex-col items-center gap-4 p-8 rounded-3xl border transition-all duration-500 group/btn",
                method === 'UPI' 
                  ? "bg-primary text-black border-primary shadow-xl shadow-primary/20" 
                  : "bg-white/[0.02] border-white/[0.05] text-white/30 hover:bg-white/5 hover:text-white"
              )}
            >
              <Smartphone size={32} className={cn("transition-transform duration-500", method === 'UPI' ? "scale-110" : "group-hover/btn:scale-110")} />
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">UPI Protocol</span>
            </button>
            <button 
              type="button"
              onClick={() => setMethod('Bank')}
              className={cn(
                "flex flex-col items-center gap-4 p-8 rounded-3xl border transition-all duration-500 group/btn",
                method === 'Bank' 
                  ? "bg-primary text-black border-primary shadow-xl shadow-primary/20" 
                  : "bg-white/[0.02] border-white/[0.05] text-white/30 hover:bg-white/5 hover:text-white"
              )}
            >
              <Banknote size={32} className={cn("transition-transform duration-500", method === 'Bank' ? "scale-110" : "group-hover/btn:scale-110")} />
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">Bank Protocol</span>
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Liquidation Volume (INR)</label>
            <div className="relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black">₹</div>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="glass-input w-full pl-12 py-5 text-xl font-black tracking-tighter"
                required
                min="100"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {method === 'UPI' ? (
              <motion.div 
                key="upi"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">UPI Identifier</label>
                <input 
                  type="text" 
                  value={details.upiId}
                  onChange={(e) => setDetails({ ...details, upiId: e.target.value })}
                  placeholder="ADDRESS@PROVIDER"
                  className="glass-input w-full py-5 font-black tracking-[0.2em] text-sm uppercase"
                  required
                />
              </motion.div>
            ) : (
              <motion.div 
                key="bank"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Account Number</label>
                  <input 
                    type="text" 
                    value={details.accountNumber}
                    onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })}
                    placeholder="ENTER ACCOUNT NUMBER"
                    className="glass-input w-full py-5 font-black tracking-[0.2em] text-sm uppercase"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">IFSC Protocol</label>
                  <input 
                    type="text" 
                    value={details.ifscCode}
                    onChange={(e) => setDetails({ ...details, ifscCode: e.target.value })}
                    placeholder="ENTER IFSC CODE"
                    className="glass-input w-full py-5 font-black tracking-[0.2em] text-sm uppercase"
                    required
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 rounded-2xl bg-luxury/5 border border-luxury/10 flex gap-4">
            <Info className="text-luxury shrink-0" size={24} />
            <p className="text-[11px] text-luxury/40 leading-relaxed font-medium uppercase tracking-wider">
              Withdrawal requests undergo manual elite verification. Ensure all protocol identifiers are accurate to prevent synchronization delays.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full gradient-button py-6 flex items-center justify-center gap-3 group/btn"
          >
            <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em]">
              {loading ? 'Authorizing...' : 'Execute Outflux'}
            </span>
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Withdraw;
