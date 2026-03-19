import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
} from 'firebase/firestore';
import { History, ArrowDownLeft, ArrowUpRight, TrendingUp, Gift, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { formatCurrency, cn } from '../utils';
import { Transaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const Transactions: React.FC = () => {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      const sortedTxs = txs.sort((a, b) => {
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateB - dateA;
      });
      setTransactions(sortedTxs);
    });

    return () => unsubscribe();
  }, [profile]);

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="text-emerald-400" size={18} />;
      case 'withdrawal': return <ArrowUpRight className="text-rose-400" size={18} />;
      case 'profit': return <TrendingUp className="text-blue-400" size={18} />;
      case 'referral': return <Gift className="text-luxury" size={18} />;
      default: return <History size={18} />;
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-black uppercase tracking-tight">Ledger</h2>
          <div className="h-1 w-12 bg-primary rounded-full" />
          <p className="text-white/30 font-light">Comprehensive record of all cryptographic financial movements.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 p-1.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          {['all', 'deposit', 'withdrawal', 'profit', 'referral'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                filter === f 
                  ? "bg-primary text-black shadow-lg shadow-primary/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden border border-white/[0.05]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                <th className="p-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Protocol</th>
                <th className="p-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Description</th>
                <th className="p-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Volume</th>
                <th className="p-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="p-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Verification</th>
              </tr>
            </thead>
            <motion.tbody 
              variants={container}
              initial="hidden"
              animate="show"
              className="divide-y divide-white/[0.02]"
            >
              <AnimatePresence mode="popLayout">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <motion.tr 
                      layout
                      variants={item}
                      key={tx.id} 
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:border-primary/30 transition-colors">
                            {getIcon(tx.type)}
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest">{tx.type}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <p className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">{tx.description}</p>
                      </td>
                      <td className="p-6">
                        <span className={cn(
                          "text-base font-black tracking-tighter",
                          tx.type === 'deposit' || tx.type === 'profit' || tx.type === 'referral' ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {tx.type === 'deposit' || tx.type === 'profit' || tx.type === 'referral' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-white/40">{tx.createdAt?.toDate()?.toLocaleDateString()}</p>
                          <p className="text-[9px] font-medium text-white/20 uppercase tracking-tighter">{tx.createdAt?.toDate()?.toLocaleTimeString()}</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                            Validated
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr variants={item}>
                    <td colSpan={5} className="p-32 text-center">
                      <div className="flex flex-col items-center gap-6 opacity-20">
                        <History size={80} strokeWidth={1} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No records found in ledger</p>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </motion.tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default Transactions;
