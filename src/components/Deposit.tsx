import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  onSnapshot,
  doc,
} from 'firebase/firestore';
import { 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Copy,
  Info,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { formatCurrency, cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { sendTelegramNotification, escapeHTML } from '../services/telegramService';
import { AppSettings } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const Deposit: React.FC = () => {
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [adminSettings, setAdminSettings] = useState<AppSettings>({ 
    adminUpiId: 'mobestocks@upi', 
    adminQrCodeUrl: '',
    adminPassword: '',
    minDeposit: 200,
    maxDeposit: 100000
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'admin'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setAdminSettings({
          ...data,
          adminUpiId: data.adminUpiId || 'mobestocks@upi',
          adminQrCodeUrl: data.adminQrCodeUrl || '',
          minDeposit: data.minDeposit || 200,
          maxDeposit: data.maxDeposit || 100000
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/admin'));
    return () => unsubscribe();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(adminSettings.adminUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !amount || !utrNumber) return;

    const depositAmount = Number(amount);
    if (adminSettings.minDeposit && depositAmount < adminSettings.minDeposit) {
      setMessage({ type: 'error', text: `Minimum deposit amount is ₹${adminSettings.minDeposit}.` });
      return;
    }

    if (adminSettings.maxDeposit && depositAmount > adminSettings.maxDeposit) {
      setMessage({ type: 'error', text: `Maximum deposit amount is ₹${adminSettings.maxDeposit}.` });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'deposits'), {
        userId: profile.uid,
        userEmail: profile.email,
        amount: depositAmount,
        utrNumber,
        status: 'pending',
        createdAt: serverTimestamp(),
        upiId: adminSettings.adminUpiId
      });

      await sendTelegramNotification(
        `<b>📥 NEW DEPOSIT REQUEST</b>\n\n` +
        `<b>User:</b> ${escapeHTML(profile.fullName)}\n` +
        `<b>Email:</b> ${escapeHTML(profile.email)}\n` +
        `<b>Amount:</b> ₹${amount}\n` +
        `<b>UTR:</b> ${escapeHTML(utrNumber)}\n` +
        `<b>Status:</b> PENDING`
      );

      setMessage({ type: 'success', text: 'Protocol initiated. Admin verification in progress.' });
      setAmount('');
      setUtrNumber('');
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Protocol failure. Please re-initialize.' });
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

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-12"
    >
      <motion.div variants={item} className="text-center space-y-4">
        <h2 className="text-5xl font-black uppercase tracking-tight">Capital Influx</h2>
        <div className="h-1 w-24 bg-primary mx-auto rounded-full" />
        <p className="text-white/30 font-light text-lg">Initialize a secure transfer to increase your portfolio liquidity.</p>
      </motion.div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <motion.div variants={item} className="glass-card p-10 space-y-8 border border-white/[0.05] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 blur-[50px] -z-10 group-hover:bg-secondary/10 transition-all" />
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
              <QrCode size={24} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-wider">Gateway</h3>
          </div>
          
          <div className="space-y-6">
            <div className="aspect-square bg-white rounded-3xl flex items-center justify-center overflow-hidden border-8 border-white/[0.03] shadow-2xl relative group/qr">
              {adminSettings.adminQrCodeUrl ? (
                <img src={adminSettings.adminQrCodeUrl} alt="Admin QR Code" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="text-background text-center p-8">
                  <QrCode size={160} className="mx-auto mb-4 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-[10px]">Awaiting QR Protocol</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <p className="text-white font-black uppercase tracking-[0.3em] text-xs">Scan to Authorize</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] group/upi hover:border-secondary/30 transition-all">
              <p className="text-[10px] font-black text-white/20 mb-3 uppercase tracking-[0.2em]">Protocol Identifier (UPI)</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-black text-secondary tracking-tight">{adminSettings.adminUpiId}</p>
                <button 
                  onClick={handleCopy} 
                  className={cn(
                    "p-3 rounded-xl transition-all duration-300",
                    copied ? "bg-emerald-500 text-black" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-4">
              <Info className="text-blue-400 shrink-0" size={24} />
              <p className="text-[11px] text-blue-100/40 leading-relaxed font-medium uppercase tracking-wider">
                Execute transfer via the provided gateway. Post-execution, provide the transaction hash (UTR) for ledger synchronization.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-card p-10 border border-white/[0.05] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -z-10 group-hover:bg-primary/10 transition-all" />
          
          <div className="flex items-center gap-4 mb-10">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-wider">Validation</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Volume (INR)</label>
              <div className="relative group/input">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black">₹</div>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="glass-input w-full pl-12 py-5 text-xl font-black tracking-tighter"
                  required
                  min={adminSettings.minDeposit || 200}
                  max={adminSettings.maxDeposit}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Transaction Hash (UTR)</label>
              <input 
                type="text" 
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="12-DIGIT PROTOCOL ID"
                className="glass-input w-full py-5 font-black tracking-[0.2em] text-sm uppercase"
                required
              />
              <div className="flex items-center gap-2 ml-2">
                <div className="h-1 w-1 bg-white/20 rounded-full" />
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                  Unique 12-digit identifier from your banking interface.
                </p>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full gradient-button py-6 flex items-center justify-center gap-3 group/btn"
            >
              <Wallet size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">
                {loading ? 'Synchronizing...' : 'Authorize Influx'}
              </span>
            </button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Deposit;
