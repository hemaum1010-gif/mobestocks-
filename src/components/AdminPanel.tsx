import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  increment,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  deleteDoc,
  deleteField
} from 'firebase/firestore';
import { 
  ShieldCheck, 
  Users, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  TrendingUp, 
  Settings,
  Check,
  X,
  Eye,
  Trash2,
  AlertTriangle,
  Bell,
  Search,
  Filter,
  Download,
  Crown,
  Zap,
  LayoutGrid,
  Plus
} from 'lucide-react';
import { db } from '../firebase';
import { formatCurrency, cn } from '../utils';
import { DepositRequest, WithdrawalRequest, UserProfile, AppSettings, UserInvestment, InvestmentPlan, MobeitorRoom, MobeitorBet } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { sendTelegramNotification, escapeHTML, getTelegramUpdates, getBotInfo } from '../services/telegramService';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalInvestments: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    adminUpiId: '', 
    adminQrCodeUrl: '', 
    adminPassword: '', 
    customerServiceLink: '', 
    referralRedirectLink: '',
    telegramBotToken: '',
    telegramChatId: '',
    suspiciousWinThreshold: 10000
  });
  const [announcement, setAnnouncement] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [bonusUserId, setBonusUserId] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [isSendingBonus, setIsSendingBonus] = useState(false);
  const [editBalance, setEditBalance] = useState('');
  const [allPlans, setAllPlans] = useState<InvestmentPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Partial<InvestmentPlan> | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [mobeitorRooms, setMobeitorRooms] = useState<MobeitorRoom[]>([]);
  const [mobeitorBets, setMobeitorBets] = useState<MobeitorBet[]>([]);
  const [editingRoom, setEditingRoom] = useState<Partial<MobeitorRoom> | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [analysisRoomId, setAnalysisRoomId] = useState('');
  const [predictionKey, setPredictionKey] = useState('');
  const [analyzedRoom, setAnalyzedRoom] = useState<MobeitorRoom | null>(null);
  const [signalQueue, setSignalQueue] = useState<string>('');
  const [minSignal, setMinSignal] = useState<string>('');
  const [maxSignal, setMaxSignal] = useState<string>('');
  const [isRestoringPlans, setIsRestoringPlans] = useState(false);

  const handleAnalysis = async () => {
    if (!analysisRoomId) return;
    const room = mobeitorRooms.find(r => r.id === analysisRoomId);
    if (room) {
      setAnalyzedRoom(room);
    } else {
      alert('Room not found');
    }
  };

  const handleSetPrediction = async () => {
    if (!analyzedRoom || !predictionKey) return;
    try {
      const signal = parseFloat(predictionKey);
      if (isNaN(signal)) {
        alert('Invalid signal');
        return;
      }
      await updateDoc(doc(db, 'mobeitor_rooms', analyzedRoom.id), {
        nextSignal: signal
      });
      alert('Next round signal set to ' + signal + 'x');
      setPredictionKey('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetSignalQueue = async () => {
    if (!analyzedRoom || !signalQueue) return;
    try {
      const signals = signalQueue.split(',').map(s => parseFloat(s.trim())).filter(s => !isNaN(s));
      if (signals.length === 0) {
        alert('Invalid signals');
        return;
      }
      await updateDoc(doc(db, 'mobeitor_rooms', analyzedRoom.id), {
        signalQueue: signals
      });
      alert('Signal queue updated with ' + signals.length + ' rounds');
      setSignalQueue('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetSignalRange = async () => {
    if (!analyzedRoom || !minSignal || !maxSignal) return;
    try {
      const min = parseFloat(minSignal);
      const max = parseFloat(maxSignal);
      if (isNaN(min) || isNaN(max) || min > max) {
        alert('Invalid signal range');
        return;
      }
      await updateDoc(doc(db, 'mobeitor_rooms', analyzedRoom.id), {
        minSignal: min,
        maxSignal: max
      });
      alert(`Signal range set to ${min.toFixed(2)}x - ${max.toFixed(2)}x`);
      setMinSignal('');
      setMaxSignal('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreDefaultPlans = async () => {
    if (!window.confirm('This will add all default Bronze, Gold, and Diamond plans. Continue?')) return;
    
    setIsRestoringPlans(true);
    try {
      const defaultPlans = [
        { name: 'Bronze Starter', category: 'Bronze', amount: 200, dailyProfit: 10, durationDays: 30, description: 'Entry level yield protocol.' },
        { name: 'Bronze Advance', category: 'Bronze', amount: 500, dailyProfit: 30, durationDays: 30, description: 'Intermediate yield protocol.' },
        { name: 'Bronze Pro', category: 'Bronze', amount: 1000, dailyProfit: 70, durationDays: 30, description: 'Advanced yield protocol.' },
        { name: 'Gold Basic', category: 'Gold', amount: 2000, monthlyProfit: 400, durationDays: 30, description: 'Premium starter protocol.' },
        { name: 'Gold Standard', category: 'Gold', amount: 3000, monthlyProfit: 700, durationDays: 30, description: 'Standard premium protocol.' },
        { name: 'Gold Premium', category: 'Gold', amount: 5000, monthlyProfit: 1600, durationDays: 30, description: 'High-yield premium protocol.' },
        { name: 'Diamond Elite', category: 'Diamond', amount: 10000, monthlyProfit: 2000, durationDays: 30, description: 'Elite high-net-worth protocol.' },
        { name: 'Diamond Royal', category: 'Diamond', amount: 25000, monthlyProfit: 5500, durationDays: 30, description: 'Royal high-net-worth protocol.' },
        { name: 'Diamond Legend', category: 'Diamond', amount: 50000, monthlyProfit: 12000, durationDays: 30, description: 'Legendary high-net-worth protocol.' }
      ];

      const plansRef = collection(db, 'plans');
      const existingPlansSnap = await getDocs(plansRef);
      const existingPlanNames = existingPlansSnap.docs.map(doc => doc.data().name);

      for (const plan of defaultPlans) {
        if (!existingPlanNames.includes(plan.name)) {
          await addDoc(plansRef, { ...plan, createdAt: serverTimestamp() });
        }
      }
      alert('Default plans restored successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to restore plans');
    } finally {
      setIsRestoringPlans(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      if (editingPlan.id) {
        await updateDoc(doc(db, 'plans', editingPlan.id), {
          ...editingPlan,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'plans'), {
          ...editingPlan,
          createdAt: serverTimestamp()
        });
      }
      setIsPlanModalOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan protocol.');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to terminate this plan protocol?')) return;
    try {
      await deleteDoc(doc(db, 'plans', id));
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to terminate plan protocol.');
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    try {
      const roomData = {
        ...editingRoom,
        minSignal: editingRoom.minSignal ? Number(editingRoom.minSignal) : undefined,
        maxSignal: editingRoom.maxSignal ? Number(editingRoom.maxSignal) : undefined,
      };

      if (editingRoom.id) {
        await updateDoc(doc(db, 'mobeitor_rooms', editingRoom.id), {
          ...roomData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'mobeitor_rooms'), {
          ...roomData,
          createdAt: serverTimestamp(),
          isDisabled: false,
          activePlayers: 0
        });
      }
      setIsRoomModalOpen(false);
      setEditingRoom(null);
    } catch (error) {
      console.error('Error saving room:', error);
      alert('Failed to save room protocol.');
    }
  };

  const toggleRoomStatus = async (room: MobeitorRoom) => {
    try {
      await updateDoc(doc(db, 'mobeitor_rooms', room.id), {
        isDisabled: !room.isDisabled
      });
    } catch (error) {
      console.error('Error toggling room status:', error);
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm('Are you sure you want to terminate this room protocol?')) return;
    try {
      await deleteDoc(doc(db, 'mobeitor_rooms', id));
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  useEffect(() => {
    // Stats
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setStats(prev => ({ ...prev, totalUsers: snap.size }));
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubDeposits = onSnapshot(collection(db, 'deposits'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest));
      setDeposits(data);
      setStats(prev => ({ 
        ...prev, 
        pendingDeposits: data.filter(d => d.status === 'pending').length,
        totalDeposits: data.filter(d => d.status === 'approved').reduce((acc, d) => acc + d.amount, 0)
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'deposits'));

    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      setWithdrawals(data);
      setStats(prev => ({ 
        ...prev, 
        pendingWithdrawals: data.filter(w => w.status === 'pending').length,
        totalWithdrawals: data.filter(w => w.status === 'approved').reduce((acc, w) => acc + w.amount, 0)
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals'));

    const unsubInvestments = onSnapshot(collection(db, 'investments'), (snap) => {
      setInvestments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserInvestment)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'investments'));

    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      setAllPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestmentPlan)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plans'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as AppSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/admin'));

    const unsubRooms = onSnapshot(collection(db, 'mobeitor_rooms'), (snap) => {
      setMobeitorRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MobeitorRoom)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'mobeitor_rooms'));

    const unsubBets = onSnapshot(collection(db, 'mobeitor_bets'), (snap) => {
      setMobeitorBets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MobeitorBet)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'mobeitor_bets'));

    return () => {
      unsubUsers();
      unsubDeposits();
      unsubWithdrawals();
      unsubInvestments();
      unsubPlans();
      unsubSettings();
      unsubRooms();
      unsubBets();
    };
  }, []);

  const handleApproveDeposit = async (deposit: DepositRequest) => {
    try {
      await updateDoc(doc(db, 'deposits', deposit.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', deposit.userId), {
        balance: increment(deposit.amount)
      });
      await addDoc(collection(db, 'transactions'), {
        userId: deposit.userId,
        type: 'deposit',
        amount: deposit.amount,
        description: 'Deposit approved by admin',
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'notifications'), {
        userId: deposit.userId,
        title: 'Deposit Approved',
        message: `Your deposit of ${formatCurrency(deposit.amount)} has been approved.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      await sendTelegramNotification(
        `<b>✅ DEPOSIT APPROVED</b>\n\n` +
        `<b>User:</b> ${escapeHTML(deposit.userEmail)}\n` +
        `<b>Amount:</b> ₹${deposit.amount}\n` +
        `<b>UTR:</b> ${escapeHTML(deposit.utrNumber)}\n` +
        `<b>Status:</b> APPROVED`
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectDeposit = async (deposit: DepositRequest) => {
    try {
      await updateDoc(doc(db, 'deposits', deposit.id), { status: 'rejected' });
      await addDoc(collection(db, 'notifications'), {
        userId: deposit.userId,
        title: 'Deposit Rejected',
        message: `Your deposit of ${formatCurrency(deposit.amount)} has been rejected. Please contact support.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      await sendTelegramNotification(
        `<b>❌ DEPOSIT REJECTED</b>\n\n` +
        `<b>User:</b> ${escapeHTML(deposit.userEmail)}\n` +
        `<b>Amount:</b> ₹${deposit.amount}\n` +
        `<b>UTR:</b> ${escapeHTML(deposit.utrNumber)}\n` +
        `<b>Status:</b> REJECTED`
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleApproveWithdrawal = async (withdrawal: WithdrawalRequest) => {
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawal.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', withdrawal.userId), {
        balance: increment(-withdrawal.amount),
        totalWithdrawals: increment(withdrawal.amount)
      });
      await addDoc(collection(db, 'transactions'), {
        userId: withdrawal.userId,
        type: 'withdrawal',
        amount: withdrawal.amount,
        description: 'Withdrawal approved by admin',
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'notifications'), {
        userId: withdrawal.userId,
        title: 'Withdrawal Approved',
        message: `Your withdrawal of ${formatCurrency(withdrawal.amount)} has been approved.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      await sendTelegramNotification(
        `<b>✅ WITHDRAWAL APPROVED</b>\n\n` +
        `<b>User:</b> ${escapeHTML(withdrawal.userEmail)}\n` +
        `<b>Amount:</b> ₹${withdrawal.amount}\n` +
        `<b>Method:</b> ${escapeHTML(withdrawal.method)}\n` +
        `<b>Status:</b> APPROVED`
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectWithdrawal = async (withdrawal: WithdrawalRequest) => {
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawal.id), { status: 'rejected' });
      // Refund balance
      await updateDoc(doc(db, 'users', withdrawal.userId), {
        balance: increment(withdrawal.amount)
      });
      await addDoc(collection(db, 'notifications'), {
        userId: withdrawal.userId,
        title: 'Withdrawal Rejected',
        message: `Your withdrawal of ${formatCurrency(withdrawal.amount)} has been rejected. Funds have been refunded to your portfolio.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      await sendTelegramNotification(
        `<b>❌ WITHDRAWAL REJECTED</b>\n\n` +
        `<b>User:</b> ${escapeHTML(withdrawal.userEmail)}\n` +
        `<b>Amount:</b> ₹${withdrawal.amount}\n` +
        `<b>Method:</b> ${escapeHTML(withdrawal.method)}\n` +
        `<b>Status:</b> REJECTED`
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcement) return;
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const promises = usersSnap.docs.map(userDoc => 
        addDoc(collection(db, 'notifications'), {
          userId: userDoc.id,
          title: 'Admin Announcement',
          message: announcement,
          isRead: false,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      setAnnouncement('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'admin'), {
        adminUpiId: settings.adminUpiId,
        adminQrCodeUrl: settings.adminQrCodeUrl,
        customerServiceLink: settings.customerServiceLink || '',
        referralRedirectLink: settings.referralRedirectLink || '',
        telegramBotToken: settings.telegramBotToken || '',
        telegramChatId: settings.telegramChatId || '',
        whatsappChannelLink: settings.whatsappChannelLink || '',
        appDownloadLink: settings.appDownloadLink || '',
        minDeposit: Number(settings.minDeposit) || 0,
        maxDeposit: Number(settings.maxDeposit) || 0,
        minWithdrawal: Number(settings.minWithdrawal) || 0,
        maxWithdrawal: Number(settings.maxWithdrawal) || 0,
        suspiciousWinThreshold: Number(settings.suspiciousWinThreshold) || 10000
      }, { merge: true });
      alert('Settings synchronized successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to synchronize settings');
    }
  };

  const handleSendBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusUserId || !bonusAmount) return;
    
    setIsSendingBonus(true);
    try {
      const userRef = doc(db, 'users', bonusUserId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        alert('User ID not found in the network.');
        return;
      }

      const amount = Number(bonusAmount);
      await updateDoc(userRef, {
        balance: increment(amount),
        totalProfit: increment(amount)
      });

      await addDoc(collection(db, 'transactions'), {
        userId: bonusUserId,
        type: 'profit',
        amount: amount,
        description: 'System Bonus Protocol',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: bonusUserId,
        title: 'BONUS RECEIVED',
        message: `A bonus of ${formatCurrency(amount)} has been credited to your portfolio.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      alert('Bonus protocol successfully executed.');
      setBonusUserId('');
      setBonusAmount('');
    } catch (error) {
      console.error(error);
      alert('Bonus protocol failure.');
    } finally {
      setIsSendingBonus(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser || !editBalance) return;
    try {
      const newBalance = Number(editBalance);
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        balance: newBalance
      });
      setSelectedUser(prev => prev ? { ...prev, balance: newBalance } : null);
      alert('Balance updated successfully.');
      setEditBalance('');
    } catch (error) {
      console.error(error);
      alert('Failed to update balance.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-10 pb-20"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
            <ShieldCheck size={36} />
          </div>
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tight">Command Center</h2>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">System Protocol & Asset Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="SEARCH PROTOCOLS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-12 pr-6 py-3 w-64 text-[10px] font-black tracking-widest uppercase"
            />
          </div>
          <button className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all">
            <Filter size={20} />
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        {[
          { id: 'stats', label: 'Overview', icon: TrendingUp },
          { id: 'users', label: 'Elite Users', icon: Users },
          { id: 'security', label: 'Security Alerts', icon: AlertTriangle },
          { id: 'investments', label: 'Active Contracts', icon: Crown },
          { id: 'deposits', label: 'Inbound Assets', icon: ArrowDownCircle },
          { id: 'withdrawals', label: 'Outbound Assets', icon: ArrowUpCircle },
          { id: 'bonus', label: 'Bonus Protocol', icon: Zap },
          { id: 'plans', label: 'Plan Management', icon: LayoutGrid },
          { id: 'mobeitor', label: 'Mobeitor Control', icon: Zap },
          { id: 'settings', label: 'Protocol Config', icon: Settings },
          { id: 'announcement', label: 'Global Broadcast', icon: Bell }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap border",
              activeTab === tab.id 
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                : "bg-white/[0.02] text-white/30 border-white/5 hover:bg-white/5 hover:border-white/10"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Total Network Nodes', value: stats.totalUsers, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Cumulative Influx', value: formatCurrency(stats.totalDeposits), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Cumulative Outflux', value: formatCurrency(stats.totalWithdrawals), color: 'text-rose-500', bg: 'bg-rose-500/10' },
                { label: 'Pending Verification', value: stats.pendingDeposits, color: 'text-luxury', bg: 'bg-luxury/10' },
                { label: 'Pending Liquidation', value: stats.pendingWithdrawals, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              ].map((stat, idx) => (
                <div key={idx} className="glass-card p-8 border border-white/[0.05] group hover:border-white/10 transition-all">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">{stat.label}</p>
                  <p className={cn("text-4xl font-black tracking-tighter", stat.color)}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 border border-rose-500/20 bg-rose-500/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-rose-500">High Risk Nodes</h3>
                      <p className="text-[10px] font-black text-rose-500/40 uppercase tracking-widest">Score &gt; 20</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-rose-500">
                    {users.filter(u => (u.suspiciousActivityScore || 0) > 20).length}
                  </p>
                </div>
                <div className="glass-card p-6 border border-orange-500/20 bg-orange-500/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-orange-500">Monitoring Active</h3>
                      <p className="text-[10px] font-black text-orange-500/40 uppercase tracking-widest">Score 10-20</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-orange-500">
                    {users.filter(u => (u.suspiciousActivityScore || 0) > 10 && (u.suspiciousActivityScore || 0) <= 20).length}
                  </p>
                </div>
                <div className="glass-card p-6 border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-emerald-500">Secure Nodes</h3>
                      <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">Score 0-10</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-emerald-500">
                    {users.filter(u => (u.suspiciousActivityScore || 0) <= 10).length}
                  </p>
                </div>
              </div>

              <div className="glass-card border border-white/[0.05] overflow-hidden">
                <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-widest text-white/60">Suspicious Activity Log</h3>
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Live Monitoring</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/[0.05]">
                        <th className="p-8">User Node</th>
                        <th className="p-8">Risk Score</th>
                        <th className="p-8">Win Streak</th>
                        <th className="p-8">Last Activity</th>
                        <th className="p-8 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {users
                        .filter(u => (u.suspiciousActivityScore || 0) > 0)
                        .sort((a, b) => (b.suspiciousActivityScore || 0) - (a.suspiciousActivityScore || 0))
                        .map((user) => (
                        <tr key={user.uid} className="group hover:bg-white/[0.01] transition-all">
                          <td className="p-8">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 font-black border border-rose-500/10">
                                {user.fullName?.[0] || 'U'}
                              </div>
                              <div>
                                <p className="font-black uppercase tracking-tight text-white/80">{user.fullName}</p>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-8">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-1000",
                                    (user.suspiciousActivityScore || 0) > 20 ? "bg-rose-500" : "bg-orange-500"
                                  )}
                                  style={{ width: `${Math.min(100, (user.suspiciousActivityScore || 0) * 2)}%` }}
                                />
                              </div>
                              <span className={cn(
                                "font-black tracking-tighter",
                                (user.suspiciousActivityScore || 0) > 20 ? "text-rose-500" : "text-orange-500"
                              )}>
                                {user.suspiciousActivityScore || 0}
                              </span>
                            </div>
                          </td>
                          <td className="p-8 font-black text-white/60 tracking-tight">{user.winStreak || 0}</td>
                          <td className="p-8">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                              {user.lastActivityAt?.toDate()?.toLocaleString() || 'N/A'}
                            </p>
                          </td>
                          <td className="p-8 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setSelectedUser(user)}
                                className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/20 transition-all"
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm(`Reset risk score for ${user.fullName}?`)) {
                                    await updateDoc(doc(db, 'users', user.uid), {
                                      suspiciousActivityScore: 0,
                                      winStreak: 0
                                    });
                                  }
                                }}
                                className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-emerald-500 hover:border-emerald-500/20 transition-all"
                              >
                                <ShieldCheck size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-card border border-orange-500/20 bg-orange-500/5 overflow-hidden">
                <div className="p-6 border-b border-orange-500/10 flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-widest text-orange-500">Flagged Suspicious Players</h3>
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Manual & Auto Flags</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/[0.05]">
                        <th className="p-8">User Node</th>
                        <th className="p-8">Reason</th>
                        <th className="p-8">Daily Wins</th>
                        <th className="p-8 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {users
                        .filter(u => u.isSuspicious)
                        .map((user) => (
                        <tr key={user.uid} className="group hover:bg-white/[0.01] transition-all">
                          <td className="p-8">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 font-black border border-orange-500/10">
                                {user.fullName?.[0] || 'U'}
                                {user.isWithdrawalBlocked && <ArrowUpCircle size={10} className="absolute -top-1 -right-1 text-rose-500" />}
                              </div>
                              <div>
                                <p className="font-black uppercase tracking-tight text-white/80">{user.fullName}</p>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-8">
                            <p className="text-xs font-black text-orange-500/80 uppercase tracking-tight">{user.suspiciousReason || 'No reason provided'}</p>
                          </td>
                          <td className="p-8">
                            <p className="font-black text-white/60 tracking-tight">{formatCurrency(user.dailyWinnings || 0)}</p>
                            <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{user.lastWinDate || 'N/A'}</p>
                          </td>
                          <td className="p-8 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setSelectedUser(user)}
                                className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/20 transition-all"
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm(`Unflag ${user.fullName}?`)) {
                                    await updateDoc(doc(db, 'users', user.uid), {
                                      isSuspicious: false,
                                      suspiciousReason: ''
                                    });
                                  }
                                }}
                                className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-emerald-500 hover:border-emerald-500/20 transition-all"
                              >
                                <Check size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.filter(u => u.isSuspicious).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-20 text-center">
                            <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em]">No flagged nodes in current protocol</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-card border border-white/[0.05] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/[0.05]">
                      <th className="p-8">Elite Identifier</th>
                      <th className="p-8">Liquidity</th>
                      <th className="p-8">Total Deployment</th>
                      <th className="p-8">Protocol Status</th>
                      <th className="p-8 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {users.map((user) => (
                      <tr key={user.uid} className={cn(
                        "group hover:bg-white/[0.01] transition-all",
                        (user.suspiciousActivityScore || 0) > 10 && "bg-rose-500/[0.02]"
                      )}>
                        <td className="p-8">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/10">
                                {user.fullName?.[0] || 'U'}
                              </div>
                              {(user.suspiciousActivityScore || 0) > 10 && (
                                <div className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full flex items-center justify-center border-2 border-[#050505]">
                                  <AlertTriangle size={8} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black uppercase tracking-tight text-white/80">{user.fullName}</p>
                                {(user.suspiciousActivityScore || 0) > 20 && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest border border-rose-500/20">
                                    High Risk
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-8 font-black text-emerald-500 tracking-tight">{formatCurrency(user.balance)}</td>
                        <td className="p-8 font-black text-white/60 tracking-tight">{formatCurrency(user.totalInvestment)}</td>
                        <td className="p-8">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            user.isBlocked 
                              ? "bg-rose-500/5 text-rose-500 border-rose-500/10" 
                              : "bg-emerald-500/5 text-emerald-500 border-emerald-500/10"
                          )}>
                            {user.isBlocked ? 'Terminated' : 'Operational'}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setSelectedUser(user)}
                              className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/20 transition-all"
                            >
                              <Eye size={18} />
                            </button>
                            <button className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-rose-500 hover:border-rose-500/20 transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'investments' && (
            <div className="glass-card border border-white/[0.05] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/[0.05]">
                      <th className="p-8">Contract Details</th>
                      <th className="p-8">Capital</th>
                      <th className="p-8">Yield Protocol</th>
                      <th className="p-8">Claim Frequency</th>
                      <th className="p-8">Maturity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {investments.map((inv) => (
                      <tr key={inv.id} className="group hover:bg-white/[0.01] transition-all">
                        <td className="p-8">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{inv.category}</p>
                            <p className="font-black uppercase tracking-tight text-white/80">{inv.planName}</p>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">UID: {inv.userId.slice(0, 8)}...</p>
                          </div>
                        </td>
                        <td className="p-8 font-black text-white tracking-tight">{formatCurrency(inv.amount)}</td>
                        <td className="p-8">
                          <p className="text-sm font-black text-emerald-500">+{formatCurrency(inv.dailyProfit)}/day</p>
                        </td>
                        <td className="p-8">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            inv.claimFrequency === 'yearly' 
                              ? "bg-blue-500/5 text-blue-400 border-blue-500/10" 
                              : "bg-primary/5 text-primary border-primary/10"
                          )}>
                            {inv.claimFrequency || 'Monthly'}
                          </span>
                        </td>
                        <td className="p-8">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                            {inv.endDate?.toDate()?.toLocaleDateString()}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'deposits' && (
            <div className="glass-card border border-white/[0.05] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/[0.05]">
                      <th className="p-8">Source Node</th>
                      <th className="p-8">Asset Volume</th>
                      <th className="p-8">UTR Hash</th>
                      <th className="p-8">Protocol State</th>
                      <th className="p-8 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {deposits.map((dep) => (
                      <tr key={dep.id} className="group hover:bg-white/[0.01] transition-all">
                        <td className="p-8">
                          <p className="font-black uppercase tracking-tight text-white/80">{dep.userEmail}</p>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{dep.createdAt?.toDate()?.toLocaleString()}</p>
                        </td>
                        <td className="p-8 font-black text-emerald-500 tracking-tight">{formatCurrency(dep.amount)}</td>
                        <td className="p-8">
                          <p className="font-mono text-[10px] text-primary font-black tracking-widest uppercase bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 inline-block">{dep.utrNumber}</p>
                        </td>
                        <td className="p-8">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            dep.status === 'pending' ? "bg-luxury/5 text-luxury border-luxury/10" :
                            dep.status === 'approved' ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10" :
                            "bg-rose-500/5 text-rose-500 border-rose-500/10"
                          )}>
                            {dep.status}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                          {dep.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleApproveDeposit(dep)}
                                className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                              >
                                <Check size={18} />
                              </button>
                              <button 
                                onClick={() => handleRejectDeposit(dep)}
                                className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="glass-card border border-white/[0.05] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/[0.05]">
                      <th className="p-8">Target Node</th>
                      <th className="p-8">Liquidation Volume</th>
                      <th className="p-8">Method</th>
                      <th className="p-8">Protocol State</th>
                      <th className="p-8 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {withdrawals.map((wit) => (
                      <tr key={wit.id} className="group hover:bg-white/[0.01] transition-all">
                        <td className="p-8">
                          <p className="font-black uppercase tracking-tight text-white/80">{wit.userEmail}</p>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{wit.createdAt?.toDate()?.toLocaleString()}</p>
                        </td>
                        <td className="p-8 font-black text-rose-500 tracking-tight">{formatCurrency(wit.amount)}</td>
                        <td className="p-8">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{wit.method}</p>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                              {wit.method === 'UPI' ? wit.details.upiId : `${wit.details.accountNumber} (${wit.details.ifscCode})`}
                            </p>
                          </div>
                        </td>
                        <td className="p-8">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            wit.status === 'pending' ? "bg-luxury/5 text-luxury border-luxury/10" :
                            wit.status === 'approved' ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10" :
                            "bg-rose-500/5 text-rose-500 border-rose-500/10"
                          )}>
                            {wit.status}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                          {wit.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleApproveWithdrawal(wit)}
                                className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                              >
                                <Check size={18} />
                              </button>
                              <button 
                                onClick={() => handleRejectWithdrawal(wit)}
                                className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="glass-card p-10 border border-white/[0.05]">
                <div className="flex items-center gap-4 mb-10">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Settings size={24} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Protocol Config</h3>
                </div>
                <form onSubmit={handleUpdateSettings} className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">System UPI ID</label>
                    <input 
                      type="text" 
                      value={settings.adminUpiId}
                      onChange={(e) => setSettings({ ...settings, adminUpiId: e.target.value })}
                      className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">System QR Protocol URL</label>
                    <input 
                      type="text" 
                      value={settings.adminQrCodeUrl}
                      onChange={(e) => setSettings({ ...settings, adminQrCodeUrl: e.target.value })}
                      className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Customer Service Protocol Link</label>
                    <input 
                      type="text" 
                      value={settings.customerServiceLink || ''}
                      onChange={(e) => setSettings({ ...settings, customerServiceLink: e.target.value })}
                      className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                      placeholder="https://t.me/your_support"
                    />
                    <p className="text-[9px] text-white/20 uppercase tracking-widest italic">Note: The floating support button will only appear on user pages if this link is configured.</p>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Referral Redirect Protocol Link</label>
                    <input 
                      type="text" 
                      value={settings.referralRedirectLink || ''}
                      onChange={(e) => setSettings({ ...settings, referralRedirectLink: e.target.value })}
                      className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                      placeholder="https://your-custom-domain.com"
                    />
                    <p className="text-[9px] text-white/20 uppercase tracking-widest italic">Note: If left empty, the current application URL will be used for referral links.</p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">WhatsApp Channel Protocol Link</label>
                    <input 
                      type="text" 
                      value={settings.whatsappChannelLink || ''}
                      onChange={(e) => setSettings({ ...settings, whatsappChannelLink: e.target.value })}
                      className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                      placeholder="https://whatsapp.com/channel/..."
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">App Download Protocol Link</label>
                    <input 
                      type="text" 
                      value={settings.appDownloadLink || ''}
                      onChange={(e) => setSettings({ ...settings, appDownloadLink: e.target.value })}
                      className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                      placeholder="https://your-app-download-link.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Min Deposit (INR)</label>
                      <input 
                        type="number" 
                        value={settings.minDeposit || ''}
                        onChange={(e) => setSettings({ ...settings, minDeposit: Number(e.target.value) })}
                        className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                        placeholder="200"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Max Deposit (INR)</label>
                      <input 
                        type="number" 
                        value={settings.maxDeposit || ''}
                        onChange={(e) => setSettings({ ...settings, maxDeposit: Number(e.target.value) })}
                        className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                        placeholder="100000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Min Withdrawal (INR)</label>
                      <input 
                        type="number" 
                        value={settings.minWithdrawal || ''}
                        onChange={(e) => setSettings({ ...settings, minWithdrawal: Number(e.target.value) })}
                        className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Max Withdrawal (INR)</label>
                      <input 
                        type="number" 
                        value={settings.maxWithdrawal || ''}
                        onChange={(e) => setSettings({ ...settings, maxWithdrawal: Number(e.target.value) })}
                        className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                        placeholder="50000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Suspicious Win Threshold (Daily INR)</label>
                      <input 
                        type="number" 
                        value={settings.suspiciousWinThreshold || ''}
                        onChange={(e) => setSettings({ ...settings, suspiciousWinThreshold: Number(e.target.value) })}
                        className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                        placeholder="10000"
                      />
                      <p className="text-[9px] text-white/20 uppercase tracking-widest italic">Players exceeding this daily win amount will be flagged.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Telegram Bot Token</label>
                      <div className="flex gap-4">
                        <input 
                          type="password" 
                          value={settings.telegramBotToken || ''}
                          onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                          className="glass-input flex-1 p-5 font-mono text-xs tracking-widest"
                          placeholder="123456789:ABCdef..."
                        />
                        <button 
                          type="button"
                          onClick={async () => {
                            if (!settings.telegramBotToken) {
                              alert("Please enter Bot Token.");
                              return;
                            }
                            try {
                              const bot = await getBotInfo(settings.telegramBotToken);
                              alert(`✅ Bot Verified!\n\nName: ${bot.first_name}\nUsername: @${bot.username}\n\nYour token is valid.`);
                            } catch (err: any) {
                              alert("❌ Invalid Token: " + err.message);
                            }
                          }}
                          className="px-6 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                          Verify Bot
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Telegram Chat ID</label>
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          value={settings.telegramChatId || ''}
                          onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                          className="glass-input flex-1 p-5 font-mono text-xs tracking-widest"
                          placeholder="-100123456789"
                        />
                        <button 
                          type="button"
                          onClick={async () => {
                            if (!settings.telegramBotToken) {
                              alert("Please enter Bot Token first.");
                              return;
                            }
                            try {
                              const updates = await getTelegramUpdates(settings.telegramBotToken);
                              if (updates.length === 0) {
                                alert("No recent messages found.\n\nIMPORTANT: You must send a message to your bot on Telegram FIRST, then click this button.");
                                return;
                              }
                              
                              const recentChats = updates.map((u: any) => {
                                const chat = u.message?.chat || u.callback_query?.message?.chat || u.channel_post?.chat;
                                if (!chat) return null;
                                const type = chat.type === 'private' ? '👤 Private' : 
                                             chat.type === 'group' ? '👥 Group' : 
                                             chat.type === 'supergroup' ? '🏢 Supergroup' : 
                                             chat.type === 'channel' ? '📢 Channel' : '❓ Unknown';
                                return {
                                  label: `${type} | ${chat.first_name || chat.title || 'Unknown'}`,
                                  id: chat.id.toString()
                                };
                              }).filter(Boolean);
                              
                              // Deduplicate by ID
                              const uniqueChats = Array.from(new Map(recentChats.map((item: any) => [item.id, item])).values());
                              
                              if (uniqueChats.length === 0) {
                                alert("Could not extract chat IDs. Ensure you have messaged the bot or added it to a group.");
                              } else {
                                const chatList = uniqueChats.map((c: any) => `${c.label}\nID: ${c.id}`).join('\n\n');
                                alert("Recent Chat IDs found:\n\n" + chatList + "\n\nCopy the ID (including the minus sign) into the field.");
                              }
                            } catch (err: any) {
                              alert("Failed to fetch updates: " + err.message);
                            }
                          }}
                          className="px-6 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                          Fetch IDs
                        </button>
                        <button 
                          type="button"
                          onClick={async () => {
                            if (!settings.telegramBotToken || !settings.telegramChatId) {
                              alert("Please enter both Bot Token and Chat ID to test.");
                              return;
                            }
                            try {
                              await sendTelegramNotification(
                                "<b>🔔 TEST NOTIFICATION</b>\n\nYour Telegram bot is successfully synchronized with the Command Center.",
                                { token: settings.telegramBotToken, chatId: settings.telegramChatId }
                              );
                              alert("✅ Success! Check your Telegram.");
                            } catch (err: any) {
                              let msg = err.message;
                              if (msg.includes("chat not found")) {
                                msg = "❌ Chat Not Found!\n\n1. Did you send /start to the bot?\n2. Is the bot a member of the group?\n3. Is the Chat ID correct (including the minus sign)?";
                              }
                              alert(msg);
                            }
                          }}
                          className="px-6 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                        >
                          Test
                        </button>
                      </div>
                      
                      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Telegram Setup Protocol</p>
                          <a 
                            href="https://t.me/BotFather" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[8px] font-black text-white/20 hover:text-primary uppercase tracking-widest transition-colors"
                          >
                            Open BotFather
                          </a>
                        </div>
                        <ul className="space-y-3">
                          <li className="text-[9px] text-white/40 uppercase tracking-wider flex gap-3 items-start">
                            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] shrink-0 mt-0.5">1</span> 
                            <span>Create bot via <b>@BotFather</b> and paste the <b>Token</b> above.</span>
                          </li>
                          <li className="text-[9px] text-white/40 uppercase tracking-wider flex gap-3 items-start">
                            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] shrink-0 mt-0.5">2</span> 
                            <span>Send <b>/start</b> to your bot or add it to your <b>Group/Channel</b>.</span>
                          </li>
                          <li className="text-[9px] text-white/40 uppercase tracking-wider flex gap-3 items-start">
                            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] shrink-0 mt-0.5">3</span> 
                            <span>Click <b>Fetch IDs</b> to discover your unique <b>Chat ID</b>.</span>
                          </li>
                          <li className="text-[9px] text-white/40 uppercase tracking-wider flex gap-3 items-start">
                            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] shrink-0 mt-0.5">4</span> 
                            <span>Paste the ID, click <b>Test</b>, then <b>Synchronize Config</b>.</span>
                          </li>
                        </ul>
                        <div className="pt-2 border-t border-white/[0.05]">
                          <p className="text-[8px] text-white/20 uppercase tracking-widest leading-relaxed">
                            Note: Group IDs always start with a minus sign (e.g., <span className="text-white/40">-100...</span>). Channels require the bot to be an <b>Administrator</b>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest italic">Note: Configure these to receive real-time alerts for deposits, withdrawals, and investments.</p>

                  <button type="submit" className="gradient-button w-full py-5 text-[11px] font-black uppercase tracking-[0.3em]">Synchronize Config</button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'bonus' && (
            <div className="glass-card p-10 border border-white/[0.05] max-w-xl">
              <div className="flex items-center gap-4 mb-10">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Zap size={24} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Bonus Protocol</h3>
              </div>
              <form onSubmit={handleSendBonus} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Target Node UID</label>
                  <input 
                    type="text" 
                    value={bonusUserId}
                    onChange={(e) => setBonusUserId(e.target.value)}
                    className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                    placeholder="Enter User ID..."
                    required
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Bonus Payload (INR)</label>
                  <input 
                    type="number" 
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                    className="glass-input w-full p-5 font-mono text-xs tracking-widest"
                    placeholder="Enter amount..."
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSendingBonus}
                  className="gradient-button w-full py-5 flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.3em]"
                >
                  {isSendingBonus ? 'Processing...' : 'Execute Bonus Protocol'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <LayoutGrid size={24} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Plan Management</h3>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleRestoreDefaultPlans}
                    disabled={isRestoringPlans}
                    className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    {isRestoringPlans ? 'Restoring...' : 'Restore Defaults'}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingPlan({ category: 'Bronze', durationDays: 30 });
                      setIsPlanModalOpen(true);
                    }}
                    className="gradient-button px-8 py-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Plus size={18} />
                    New Protocol
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allPlans.map((plan) => (
                  <div key={plan.id} className="glass-card p-8 border border-white/[0.05] group hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                        plan.category === 'Bronze' ? "bg-primary/10 text-primary" :
                        plan.category === 'Gold' ? "bg-luxury/10 text-luxury" :
                        "bg-blue-500/10 text-blue-400"
                      )}>
                        {plan.category}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingPlan(plan);
                            setIsPlanModalOpen(true);
                          }}
                          className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-2 rounded-lg bg-rose-500/5 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-xl font-black uppercase tracking-tight mb-2">{plan.name}</h4>
                    <p className="text-3xl font-black text-white/80 mb-6">{formatCurrency(plan.amount)}</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-white/20">Daily Yield</span>
                        <span className="text-emerald-500">+{formatCurrency(plan.dailyProfit || (plan.monthlyProfit ? plan.monthlyProfit / 30 : 0))}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-white/20">Cycle</span>
                        <span className="text-white/60">{plan.durationDays} Days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'mobeitor' && (
            <div className="space-y-12">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Mobeitor Control</h3>
                </div>
                <button 
                  onClick={() => {
                    setEditingRoom({ time: 30, color: 'from-emerald-500 to-teal-600' });
                    setIsRoomModalOpen(true);
                  }}
                  className="gradient-button px-8 py-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
                >
                  <Plus size={18} />
                  New Room
                </button>
              </div>

              {/* Mobeitor Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Bets', value: mobeitorBets.length, color: 'text-white' },
                  { label: 'Total Volume', value: formatCurrency(mobeitorBets.reduce((acc, b) => acc + b.amount, 0)), color: 'text-primary' },
                  { label: 'Total Wins', value: formatCurrency(mobeitorBets.filter(b => b.status === 'win').reduce((acc, b) => acc + b.payout, 0)), color: 'text-emerald-500' },
                  { label: 'Total Losses', value: formatCurrency(mobeitorBets.filter(b => b.status === 'loss').reduce((acc, b) => acc + b.amount, 0)), color: 'text-rose-500' }
                ].map((stat, idx) => (
                  <div key={idx} className="glass-card p-8 border border-white/5">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                    <p className={cn("text-2xl font-black tracking-tight", stat.color)}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Mobeitor Signal Control */}
              <div className="glass-card p-10 border border-white/[0.05]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <TrendingUp size={20} />
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-tight">Signal Control & Analysis</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Enter Room ID</label>
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          value={analysisRoomId}
                          onChange={(e) => setAnalysisRoomId(e.target.value)}
                          className="glass-input flex-1 p-4 text-xs font-black uppercase tracking-widest"
                          placeholder="ROOM_ID_HERE"
                        />
                        <button 
                          onClick={handleAnalysis}
                          className="px-8 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                          Analysis
                        </button>
                      </div>
                    </div>

                    {analyzedRoom && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 pt-6 border-t border-white/5"
                      >
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Signal History</p>
                          <div className="flex flex-wrap gap-2">
                            {(analyzedRoom.signalHistory || [1.2, 2.5, 1.05, 4.2, 1.8]).map((sig, i) => (
                              <div key={i} className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-black",
                                sig >= 2 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                              )}>
                                {sig.toFixed(2)}x
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Next Round Real Signal</p>
                          <p className="text-3xl font-black text-primary tracking-tighter">
                            {analyzedRoom.nextSignal ? `${analyzedRoom.nextSignal.toFixed(2)}x` : 'PENDING'}
                          </p>
                        </div>
                        {analyzedRoom.signalQueue && analyzedRoom.signalQueue.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Upcoming Signal Queue</p>
                            <div className="flex flex-wrap gap-2">
                              {analyzedRoom.signalQueue.map((sig, i) => (
                                <div key={i} className="px-3 py-1 rounded-lg text-[10px] font-black bg-primary/10 text-primary border border-primary/20">
                                  {sig.toFixed(2)}x
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(analyzedRoom.minSignal !== undefined && analyzedRoom.maxSignal !== undefined) && (
                          <div>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Active Signal Range</p>
                            <p className="text-xl font-black text-emerald-500 tracking-tighter">
                              {analyzedRoom.minSignal.toFixed(2)}x - {analyzedRoom.maxSignal.toFixed(2)}x
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Next Round Override</label>
                        <div className="flex gap-4">
                          <input 
                            type="text" 
                            value={predictionKey}
                            onChange={(e) => setPredictionKey(e.target.value)}
                            className="glass-input flex-1 p-4 text-xs font-black uppercase tracking-widest"
                            placeholder="e.g. 2.50"
                          />
                          <button 
                            onClick={handleSetPrediction}
                            disabled={!analyzedRoom || !predictionKey}
                            className="px-8 rounded-xl gradient-button text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                          >
                            Set
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Random Range (Min - Max)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={minSignal}
                            onChange={(e) => setMinSignal(e.target.value)}
                            className="glass-input w-20 p-4 text-xs font-black uppercase tracking-widest"
                            placeholder="Min"
                          />
                          <input 
                            type="text" 
                            value={maxSignal}
                            onChange={(e) => setMaxSignal(e.target.value)}
                            className="glass-input w-20 p-4 text-xs font-black uppercase tracking-widest"
                            placeholder="Max"
                          />
                          <button 
                            onClick={handleSetSignalRange}
                            disabled={!analyzedRoom || !minSignal || !maxSignal}
                            className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            Set Range
                          </button>
                          <button 
                            onClick={async () => {
                              if (!analyzedRoom) return;
                              await updateDoc(doc(db, 'mobeitor_rooms', analyzedRoom.id), {
                                minSignal: deleteField(),
                                maxSignal: deleteField()
                              });
                              alert('Signal range cleared. Default random active.');
                            }}
                            disabled={!analyzedRoom || (analyzedRoom.minSignal === undefined && analyzedRoom.maxSignal === undefined)}
                            className="px-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all disabled:opacity-50"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-8 border-t border-white/5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Signal Queue (Comma Separated)</label>
                        <textarea 
                          value={signalQueue}
                          onChange={(e) => setSignalQueue(e.target.value)}
                          className="glass-input w-full p-4 text-xs font-black uppercase tracking-widest min-h-[100px]"
                          placeholder="e.g. 1.50, 3.20, 1.10, 5.00"
                        />
                      </div>
                      <button 
                        onClick={handleSetSignalQueue}
                        disabled={!analyzedRoom || !signalQueue}
                        className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                      >
                        Update Signal Queue
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rooms List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mobeitorRooms.map((room) => (
                  <div key={room.id} className={cn(
                    "glass-card p-8 border transition-all group",
                    room.isDisabled ? "opacity-50 border-white/5" : "border-white/10 hover:border-primary/30"
                  )}>
                    <div className="flex items-center justify-between mb-6">
                      <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white", room.color)}>
                        <Zap size={20} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingRoom(room);
                            setIsRoomModalOpen(true);
                          }}
                          className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => toggleRoomStatus(room)}
                          className={cn(
                            "h-10 w-10 rounded-xl border flex items-center justify-center transition-all",
                            room.isDisabled 
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white" 
                              : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                          )}
                        >
                          {room.isDisabled ? <Check size={18} /> : <X size={18} />}
                        </button>
                        <button 
                          onClick={() => deleteRoom(room.id)}
                          className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-xl font-black uppercase tracking-tight mb-2">{room.name}</h4>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-6">{room.description}</p>
                    
                    {(room.minSignal !== undefined && room.maxSignal !== undefined) && (
                      <div className="mb-6 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-[8px] font-black text-emerald-500/40 uppercase tracking-widest mb-1">Active Range</p>
                        <p className="text-xs font-black text-emerald-500">{room.minSignal.toFixed(2)}x - {room.maxSignal.toFixed(2)}x</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Cycle</p>
                        <p className="text-sm font-black text-primary">{room.time}s</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Active</p>
                        <p className="text-sm font-black text-white">{room.activePlayers || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Status</p>
                        <p className={cn("text-[8px] font-black uppercase tracking-widest", room.isDisabled ? "text-rose-500" : "text-emerald-500")}>
                          {room.isDisabled ? 'Disabled' : 'Active'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'announcement' && (
            <div className="glass-card p-10 border border-white/[0.05] max-w-3xl">
              <div className="flex items-center gap-4 mb-10">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Bell size={24} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Global Broadcast</h3>
              </div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Broadcast Payload</label>
                  <textarea 
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    className="glass-input w-full h-48 p-5 resize-none font-light text-lg leading-relaxed"
                    placeholder="Enter global transmission data..."
                  />
                </div>
                <button 
                  onClick={handleSendAnnouncement} 
                  className="gradient-button w-full py-5 flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.3em]"
                >
                  <Bell size={20} />
                  Initiate Broadcast
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlanModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass-card border border-white/10 overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {editingPlan?.id ? 'Edit Protocol' : 'New Protocol'}
                </h3>
                <button 
                  onClick={() => setIsPlanModalOpen(false)}
                  className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Protocol Name</label>
                    <input 
                      type="text"
                      value={editingPlan?.name || ''}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, name: e.target.value }))}
                      className="glass-input w-full p-4 text-xs font-black uppercase tracking-widest"
                      placeholder="e.g. Bronze Starter"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Category</label>
                    <select 
                      value={editingPlan?.category || 'Bronze'}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, category: e.target.value }))}
                      className="glass-input w-full p-4 text-xs font-black uppercase tracking-widest bg-black"
                      required
                    >
                      <option value="Bronze">Bronze</option>
                      <option value="Gold">Gold</option>
                      <option value="Diamond">Diamond</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                {editingPlan?.category === 'Custom' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Custom Category Name</label>
                    <input 
                      type="text"
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, category: e.target.value }))}
                      className="glass-input w-full p-4 text-xs font-black uppercase tracking-widest"
                      placeholder="Enter category name..."
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Investment Amount (INR)</label>
                    <input 
                      type="number"
                      value={editingPlan?.amount || ''}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      className="glass-input w-full p-4 text-xs font-black uppercase tracking-widest"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Daily Yield (INR)</label>
                    <input 
                      type="number"
                      value={editingPlan?.dailyProfit || ''}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, dailyProfit: Number(e.target.value) }))}
                      className="glass-input w-full p-4 text-xs font-black uppercase tracking-widest"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Cycle Duration (Days)</label>
                    <input 
                      type="number"
                      value={editingPlan?.durationDays || ''}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
                      className="glass-input w-full p-4 text-xs font-black uppercase tracking-widest"
                      placeholder="30"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Monthly Yield (Optional)</label>
                    <input 
                      type="number"
                      value={editingPlan?.monthlyProfit || ''}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, monthlyProfit: Number(e.target.value) }))}
                      className="glass-input w-full p-4 text-xs font-black uppercase tracking-widest"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Description</label>
                  <textarea 
                    value={editingPlan?.description || ''}
                    onChange={(e) => setEditingPlan(prev => ({ ...prev, description: e.target.value }))}
                    className="glass-input w-full h-24 p-4 text-xs font-light resize-none"
                    placeholder="Enter protocol details..."
                  />
                </div>

                <button 
                  type="submit"
                  className="gradient-button w-full py-5 text-[11px] font-black uppercase tracking-[0.3em]"
                >
                  {editingPlan?.id ? 'Update Protocol' : 'Initialize Protocol'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRoomModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoomModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass-card border border-white/10 overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  {editingRoom?.id ? 'Modify Room Protocol' : 'Initialize Room Protocol'}
                </h3>
                <button 
                  onClick={() => setIsRoomModalOpen(false)}
                  className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveRoom} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Room Name</label>
                  <input 
                    type="text" 
                    required
                    value={editingRoom?.name || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    className="glass-input w-full p-4 font-black uppercase tracking-widest text-sm"
                    placeholder="e.g. ALPHA PROTOCOL"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Cycle Time (Seconds)</label>
                    <input 
                      type="number" 
                      required
                      value={editingRoom?.time || ''}
                      onChange={(e) => setEditingRoom({ ...editingRoom, time: Number(e.target.value) })}
                      className="glass-input w-full p-4 font-mono text-sm tracking-widest"
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Visual Theme (Gradient)</label>
                    <select 
                      value={editingRoom?.color || ''}
                      onChange={(e) => setEditingRoom({ ...editingRoom, color: e.target.value })}
                      className="glass-input w-full p-4 font-black uppercase tracking-widest text-[10px]"
                    >
                      <option value="from-emerald-500 to-teal-600">Emerald Pulse</option>
                      <option value="from-blue-500 to-indigo-600">Deep Indigo</option>
                      <option value="from-purple-500 to-pink-600">Neon Violet</option>
                      <option value="from-orange-500 to-red-600">Solar Flare</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Min Signal (Random)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={editingRoom?.minSignal || ''}
                      onChange={(e) => setEditingRoom({ ...editingRoom, minSignal: parseFloat(e.target.value) })}
                      className="glass-input w-full p-4 font-mono text-sm tracking-widest"
                      placeholder="1.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Max Signal (Random)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={editingRoom?.maxSignal || ''}
                      onChange={(e) => setEditingRoom({ ...editingRoom, maxSignal: parseFloat(e.target.value) })}
                      className="glass-input w-full p-4 font-mono text-sm tracking-widest"
                      placeholder="6.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Room Description</label>
                  <textarea 
                    required
                    value={editingRoom?.description || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                    className="glass-input w-full p-4 font-medium text-sm min-h-[100px]"
                    placeholder="Describe the room protocol..."
                  />
                </div>

                <button 
                  type="submit"
                  className="gradient-button w-full py-5 text-[11px] font-black uppercase tracking-[0.3em]"
                >
                  {editingRoom?.id ? 'Update Room' : 'Initialize Room'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-card border border-white/10 overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/10">
                    {selectedUser.fullName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">{selectedUser.fullName}</h3>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{selectedUser.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Phone Protocol</p>
                  <p className="font-mono text-sm text-white/80">{selectedUser.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Referral Code</p>
                  <p className="font-mono text-sm text-primary uppercase">{selectedUser.referralCode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Liquidity Balance</p>
                  <p className="text-xl font-black text-emerald-500 tracking-tight">{formatCurrency(selectedUser.balance)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total Deployment</p>
                  <p className="text-xl font-black text-white/80 tracking-tight">{formatCurrency(selectedUser.totalInvestment)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total Yield</p>
                  <p className="text-xl font-black text-luxury tracking-tight">{formatCurrency(selectedUser.totalProfit)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total Outflux</p>
                  <p className="text-xl font-black text-rose-500 tracking-tight">{formatCurrency(selectedUser.totalWithdrawals)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Referred By</p>
                  <p className="font-mono text-xs text-white/40 uppercase">{selectedUser.referredBy || 'DIRECT NODE'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Node Status</p>
                  <p className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    selectedUser.isBlocked ? "text-rose-500" : "text-emerald-500"
                  )}>
                    {selectedUser.isBlocked ? 'TERMINATED' : 'OPERATIONAL'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Security Score</p>
                  <p className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    (selectedUser.suspiciousActivityScore || 0) > 2 ? "text-rose-500" : "text-white/40"
                  )}>
                    {selectedUser.suspiciousActivityScore || 0} / 5
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Current Win Streak</p>
                  <p className="text-xs font-black text-primary uppercase tracking-widest">
                    {selectedUser.winStreak || 0} ROUNDS
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Withdrawal Status</p>
                  <p className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    selectedUser.isWithdrawalBlocked ? "text-rose-500" : "text-emerald-500"
                  )}>
                    {selectedUser.isWithdrawalBlocked ? 'SUSPENDED' : 'AUTHORIZED'}
                  </p>
                </div>
              </div>

              <div className="p-8 border-t border-white/5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Withdrawal Status</label>
                    <button 
                      onClick={async () => {
                        const newStatus = !selectedUser.isWithdrawalBlocked;
                        await updateDoc(doc(db, 'users', selectedUser.uid), { isWithdrawalBlocked: newStatus });
                        setSelectedUser(prev => prev ? { ...prev, isWithdrawalBlocked: newStatus } : null);
                      }}
                      className={cn(
                        "w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all",
                        selectedUser.isWithdrawalBlocked 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
                      )}
                    >
                      {selectedUser.isWithdrawalBlocked ? 'Authorize Withdrawals' : 'Suspend Withdrawals'}
                    </button>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Suspicious Status</label>
                    <button 
                      onClick={async () => {
                        const newStatus = !selectedUser.isSuspicious;
                        const reason = newStatus ? prompt('Enter reason for flagging:') : '';
                        if (newStatus && !reason) return;
                        
                        await updateDoc(doc(db, 'users', selectedUser.uid), { 
                          isSuspicious: newStatus,
                          suspiciousReason: reason || ''
                        });
                        setSelectedUser(prev => prev ? { ...prev, isSuspicious: newStatus, suspiciousReason: reason || '' } : null);
                      }}
                      className={cn(
                        "w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all",
                        selectedUser.isSuspicious 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
                          : "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20"
                      )}
                    >
                      {selectedUser.isSuspicious ? 'Unflag Suspicious' : 'Flag as Suspicious'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Manual Balance Adjustment</label>
                  <div className="flex gap-4">
                    <input 
                      type="number" 
                      value={editBalance}
                      onChange={(e) => setEditBalance(e.target.value)}
                      className="glass-input flex-1 p-4 font-mono text-sm tracking-widest"
                      placeholder="Enter new balance..."
                    />
                    <button 
                      onClick={handleUpdateBalance}
                      className="px-8 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary/80 transition-all"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                <button 
                  onClick={async () => {
                    await updateDoc(doc(db, 'users', selectedUser.uid), { isBlocked: !selectedUser.isBlocked });
                    setSelectedUser(prev => prev ? { ...prev, isBlocked: !prev.isBlocked } : null);
                  }}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border",
                    selectedUser.isBlocked 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white" 
                      : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                  )}
                >
                  {selectedUser.isBlocked ? 'Restore Node' : 'Terminate Node'}
                </button>
                <button 
                  onClick={async () => {
                    await updateDoc(doc(db, 'users', selectedUser.uid), { isWithdrawalBlocked: !selectedUser.isWithdrawalBlocked });
                    setSelectedUser(prev => prev ? { ...prev, isWithdrawalBlocked: !prev.isWithdrawalBlocked } : null);
                  }}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border",
                    selectedUser.isWithdrawalBlocked 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white" 
                      : "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white"
                  )}
                >
                  {selectedUser.isWithdrawalBlocked ? 'Unblock Withdrawal' : 'Block Withdrawal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminPanel;
