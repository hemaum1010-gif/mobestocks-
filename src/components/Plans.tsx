import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment,
  query,
  where,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { CheckCircle2, AlertCircle, TrendingUp, Crown, Gem, Zap, X, LayoutGrid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { formatCurrency, cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { sendTelegramNotification, escapeHTML } from '../services/telegramService';
import { InvestmentPlan } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const Plans: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [diamondClaimFrequencies, setDiamondClaimFrequencies] = useState<Record<string, 'monthly' | 'yearly'>>({});
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'plans'), (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentPlan)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plans'));
    return () => unsub();
  }, []);

  const categories = Array.from(new Set(plans.map(p => p.category)));

  const handleInvest = async (plan: any, category: string) => {
    if (!profile) return;
    
    if (profile.balance < plan.amount) {
      setMessage({ type: 'error', text: 'Insufficient balance. Please deposit funds first.' });
      return;
    }

    setLoading(plan.id);
    try {
      const startDate = new Date();
      const endDate = new Date();
      
      const claimFrequency = category === 'Diamond' ? (diamondClaimFrequencies[plan.id] || 'monthly') : 'monthly';
      
      if (claimFrequency === 'yearly') {
        endDate.setDate(startDate.getDate() + 365);
      } else {
        endDate.setDate(startDate.getDate() + 30);
      }

      // Create investment record
      await addDoc(collection(db, 'investments'), {
        userId: profile.uid,
        planId: plan.id,
        planName: plan.name,
        category,
        amount: plan.amount,
        dailyProfit: plan.dailyProfit || (plan.monthlyProfit / 30),
        startDate: serverTimestamp(),
        endDate: endDate,
        lastProfitUpdate: serverTimestamp(),
        status: 'active',
        claimFrequency
      });

      // Update user balance and total investment
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(-plan.amount),
        totalInvestment: increment(plan.amount)
      });

      // Handle Referral Commission (5%)
      if (profile.referredBy) {
        const commission = plan.amount * 0.05;
        
        // Find referral record
        const q = query(
          collection(db, 'referrals'), 
          where('referrerId', '==', profile.referredBy),
          where('referredId', '==', profile.uid)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const refDoc = snap.docs[0];
          await updateDoc(doc(db, 'referrals', refDoc.id), {
            hasInvested: true,
            commissionEarned: increment(commission)
          });

          // Update referrer balance
          await updateDoc(doc(db, 'users', profile.referredBy), {
            balance: increment(commission)
          });

          // Add transaction for referrer
          await addDoc(collection(db, 'transactions'), {
            userId: profile.referredBy,
            type: 'referral_bonus',
            amount: commission,
            description: `Commission from ${profile.fullName}'s investment`,
            createdAt: serverTimestamp()
          });
        }
      }

      // Add transaction record for user
      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        type: 'investment',
        amount: plan.amount,
        description: `Invested in ${plan.name} (${category})`,
        createdAt: serverTimestamp()
      });

      // Add notification for user
      await addDoc(collection(db, 'notifications'), {
        userId: profile.uid,
        title: 'Investment Successful',
        message: `Your elite contract for ${plan.name} has been initialized successfully.`,
        type: 'success',
        read: false,
        createdAt: serverTimestamp()
      });

      await sendTelegramNotification(
        `<b>💎 NEW INVESTMENT</b>\n\n` +
        `<b>User:</b> ${escapeHTML(profile.fullName)}\n` +
        `<b>Email:</b> ${escapeHTML(profile.email)}\n` +
        `<b>Plan:</b> ${escapeHTML(plan.name)} (${escapeHTML(category)})\n` +
        `<b>Amount:</b> ₹${plan.amount}\n` +
        `<b>Frequency:</b> ${escapeHTML(claimFrequency)}\n` +
        `<b>Status:</b> ACTIVE`
      );

      setMessage({ type: 'success', text: `Your plan is successful buy!` });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to process investment. Please try again.' });
    } finally {
      setLoading(null);
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
      className="space-y-20 pb-20"
    >
      <motion.div variants={item} className="text-center max-w-3xl mx-auto space-y-4">
        <h2 className="text-5xl font-black tracking-tight uppercase">Elite Contracts</h2>
        <div className="h-1 w-24 bg-primary mx-auto rounded-full" />
        <p className="text-white/30 font-light text-lg">Select your preferred wealth generation protocol. Each contract is backed by our elite algorithmic trading systems.</p>
      </motion.div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={cn(
              "p-6 rounded-3xl flex items-center justify-between gap-4 max-w-2xl mx-auto border shadow-2xl shadow-black/20",
              message.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
            )}
          >
            <div className="flex items-center gap-4">
              {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <p className="font-black uppercase tracking-widest text-sm">{message.text}</p>
            </div>
            <button 
              onClick={() => setMessage(null)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {(categories as string[]).map((category) => {
        const categoryPlans = plans.filter(p => p.category === category);
        const isBronze = category === 'Bronze';
        const isGold = category === 'Gold';
        const isDiamond = category === 'Diamond';

        const Icon = isBronze ? Zap : isGold ? Crown : isDiamond ? Gem : LayoutGrid;
        const colorClass = isBronze ? "text-primary" : isGold ? "text-luxury" : isDiamond ? "text-blue-400" : "text-emerald-400";
        const bgClass = isBronze ? "bg-primary/10" : isGold ? "bg-luxury/10" : isDiamond ? "bg-blue-500/10" : "bg-emerald-500/10";
        const borderColor = isBronze ? "border-primary/20" : isGold ? "border-luxury/20" : isDiamond ? "border-blue-500/20" : "border-emerald-500/20";
        const shadowColor = isBronze ? "shadow-primary/5" : isGold ? "shadow-luxury/5" : isDiamond ? "shadow-blue-500/5" : "shadow-emerald-500/5";

        return (
          <section key={category} className="space-y-10">
            <motion.div variants={item} className="flex items-center gap-6">
              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center border shadow-xl", bgClass, borderColor, shadowColor)}>
                <Icon size={28} className={colorClass} />
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-wider">{category} Tier</h3>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                  {isBronze ? "Daily Yield Protocol • 30 Day Cycle" : 
                   isGold ? "Premium Yield Protocol • Monthly Accrual" :
                   isDiamond ? "Elite Yield Protocol • High-Net-Worth Exclusive" :
                   "Custom Yield Protocol • High Performance"}
                </p>
              </div>
            </motion.div>

            <div className={cn(
              "grid gap-6",
              isBronze ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" :
              isGold ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" :
              "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
              {categoryPlans.map((plan) => (
                <motion.div 
                  variants={item}
                  key={plan.id} 
                  whileHover={{ y: -10, scale: 1.02 }}
                  className={cn(
                    "glass-card p-8 flex flex-col items-center text-center border transition-all duration-500 group relative overflow-hidden",
                    isBronze ? "border-white/[0.05] hover:border-primary/30" :
                    isGold ? "border-luxury/10 hover:border-luxury/40 p-10" :
                    isDiamond ? "border-blue-500/10 hover:border-blue-500/40 p-12" :
                    "border-emerald-500/10 hover:border-emerald-500/40 p-10"
                  )}
                >
                  {isDiamond && (
                    <>
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 blur-[60px] -z-10 group-hover:bg-blue-500/10 transition-all" />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black px-6 py-1.5 rounded-b-2xl shadow-lg shadow-blue-600/20 uppercase tracking-[0.3em]">
                        Elite Investment
                      </div>
                    </>
                  )}
                  {isGold && (
                    <div className="absolute top-0 right-0 p-4">
                      <div className="bg-luxury/20 text-luxury text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">PREMIUM</div>
                    </div>
                  )}
                  
                  <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-4", colorClass, isDiamond && "mt-6")}>{plan.name}</p>
                  <h4 className={cn("font-black tracking-tighter mb-6", isDiamond ? "text-5xl mb-10" : "text-4xl")}>{formatCurrency(plan.amount)}</h4>
                  
                  {isDiamond && (
                    <div className="w-full mb-8">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-3 text-left ml-1">Claim Protocol</p>
                      <div className="flex p-1 bg-white/5 rounded-xl border border-white/[0.05]">
                        <button 
                          onClick={() => setDiamondClaimFrequencies(prev => ({ ...prev, [plan.id]: 'monthly' }))}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            (diamondClaimFrequencies[plan.id] || 'monthly') === 'monthly' 
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                              : "text-white/30 hover:text-white/60"
                          )}
                        >
                          Monthly
                        </button>
                        <button 
                          onClick={() => setDiamondClaimFrequencies(prev => ({ ...prev, [plan.id]: 'yearly' }))}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            diamondClaimFrequencies[plan.id] === 'yearly' 
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                              : "text-white/30 hover:text-white/60"
                          )}
                        >
                          Yearly
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="w-full h-px bg-white/[0.05] mb-6" />
                  <div className={cn("space-y-4 mb-8 w-full", isDiamond && "mb-12 space-y-6")}>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                        {isBronze ? "Daily Yield" : "Monthly Yield"}
                      </span>
                      <span className={cn("font-black text-emerald-500", isDiamond ? "text-xl" : isGold ? "text-base" : "text-sm")}>
                        +{formatCurrency(isBronze ? (plan.dailyProfit || 0) : (plan.monthlyProfit || (plan.dailyProfit ? plan.dailyProfit * 30 : 0)))}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                        {isGold ? "Harvest" : "Cycle"}
                      </span>
                      <span className="text-sm font-black">
                        {isGold ? "Monthly" : `${plan.durationDays} Days`}
                      </span>
                    </div>
                    {isDiamond && (
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Elite Bonus</span>
                        <span className="text-sm font-black text-blue-400">Silver Asset*</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleInvest(plan, category)}
                    disabled={loading === plan.id}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-500 disabled:opacity-50",
                      isBronze ? "bg-primary/10 text-primary hover:bg-primary hover:text-black" :
                      isGold ? "gold-button py-5" :
                      isDiamond ? "gradient-button py-6 tracking-[0.3em]" :
                      "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black"
                    )}
                  >
                    {loading === plan.id ? 'Processing...' : isDiamond ? 'Authorize Contract' : isGold ? 'Initialize Contract' : 'Initialize'}
                  </button>
                  {isDiamond && (
                    <p className="text-[9px] font-bold text-white/10 mt-6 uppercase tracking-widest">*Bonus applies to elite yearly withdrawal claims only.</p>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        );
      })}
    </motion.div>
  );
};

export default Plans;
