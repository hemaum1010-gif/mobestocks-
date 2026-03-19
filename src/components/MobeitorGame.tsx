import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Wallet, 
  Clock, 
  ShieldCheck, 
  Zap, 
  ArrowLeft,
  ChevronRight,
  History,
  Trophy,
  Plane,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, cn } from '../utils';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc, 
  increment, 
  addDoc, 
  serverTimestamp,
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, seedDatabase } from '../firebase';
import { MobeitorRoom, MobeitorBet, AppSettings } from '../types';
import { sendTelegramNotification, escapeHTML } from '../services/telegramService';

const MobeitorGame: React.FC = () => {
  const { profile, user } = useAuth();
  const [rooms, setRooms] = useState<MobeitorRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<MobeitorRoom | null>(null);
  const [multiplier, setMultiplier] = useState(1.00);
  const [isFlying, setIsFlying] = useState(false);
  const [predictionKey, setPredictionKey] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState<string>('');
  const [autoCashout, setAutoCashout] = useState<string>('2.00');
  const [activeBet, setActiveBet] = useState<MobeitorBet | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomBets, setRoomBets] = useState<MobeitorBet[]>([]);
  const [myBets, setMyBets] = useState<MobeitorBet[]>([]);
  
  const planeRef = useRef<HTMLDivElement>(null);
  const isCashingOutRef = useRef(false);
  const activeBetRef = useRef<MobeitorBet | null>(null);

  // Keep refs in sync with state for use in intervals
  useEffect(() => {
    activeBetRef.current = activeBet;
  }, [activeBet]);

  useEffect(() => {
    isCashingOutRef.current = isCashingOut;
  }, [isCashingOut]);

  // Sync selectedRoom with real-time rooms data
  useEffect(() => {
    if (selectedRoom) {
      const updated = rooms.find(r => r.id === selectedRoom.id);
      if (updated) {
        // Only update if data actually changed to avoid unnecessary re-renders
        if (JSON.stringify(updated) !== JSON.stringify(selectedRoom)) {
          setSelectedRoom(updated);
        }
      }
    }
  }, [rooms, selectedRoom]);

  // Fetch rooms
  useEffect(() => {
    setIsLoadingRooms(true);
    const q = query(collection(db, 'mobeitor_rooms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MobeitorRoom[];
      setRooms(roomsData);
      setIsLoadingRooms(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mobeitor_rooms');
      setIsLoadingRooms(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch real-time bets for the current room
  useEffect(() => {
    if (!selectedRoom) {
      setRoomBets([]);
      return;
    }

    // Fetch last bets for this room
    // Removed orderBy and limit from query to avoid composite index requirement
    const q = query(
      collection(db, 'mobeitor_bets'),
      where('roomId', '==', selectedRoom.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const betsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MobeitorBet[];
      
      // Sort and limit client-side to avoid index errors
      const sortedBets = betsData
        .sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || a.timestamp || 0;
          const timeB = b.timestamp?.toMillis?.() || b.timestamp || 0;
          return timeB - timeA;
        })
        .slice(0, 50);
        
      setRoomBets(sortedBets);
    }, (error) => {
      console.error("Error fetching bets:", error);
    });

    return () => unsubscribe();
  }, [selectedRoom?.id]);

  // Fetch user's personal bets
  useEffect(() => {
    if (!selectedRoom || !profile) {
      setMyBets([]);
      return;
    }

    const q = query(
      collection(db, 'mobeitor_bets'),
      where('roomId', '==', selectedRoom.id),
      where('userId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MobeitorBet[];
      
      // Sort by timestamp client-side to avoid index requirement
      const sortedBets = bets.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || a.timestamp || 0;
        const timeB = b.timestamp?.toMillis?.() || b.timestamp || 0;
        return timeB - timeA;
      });
      
      setMyBets(sortedBets.slice(0, 20));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mobeitor_bets');
    });

    return () => unsubscribe();
  }, [selectedRoom?.id, profile?.uid]);

  // Force suspicious players into the Suspicious Protocol room
  useEffect(() => {
    if (profile && (profile.suspiciousActivityScore || 0) > 50 && rooms.length > 0) {
      const suspiciousRoom = rooms.find(r => r.name === 'Suspicious Protocol');
      if (suspiciousRoom && (!selectedRoom || selectedRoom.id !== suspiciousRoom.id)) {
        setSelectedRoom(suspiciousRoom);
      }
    }
  }, [profile?.suspiciousActivityScore, rooms, selectedRoom?.id]);

  // Update active players count
  useEffect(() => {
    if (selectedRoom && user) {
      const roomRef = doc(db, 'mobeitor_rooms', selectedRoom.id);
      updateDoc(roomRef, {
        activePlayers: increment(1)
      });

      return () => {
        updateDoc(roomRef, {
          activePlayers: increment(-1)
        });
      };
    }
  }, [selectedRoom?.id, user?.uid]);

  // Generate a new prediction key
  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    if (selectedRoom) {
      setPredictionKey(generateKey());
      setTimeLeft(selectedRoom.time);
    }
  }, [selectedRoom?.id]);

  // Timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedRoom && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && selectedRoom && !isFlying) {
      // Round starts
      startRound();
    }
    return () => clearInterval(timer);
  }, [timeLeft, selectedRoom, isFlying]);

  const startRound = async () => {
    if (!selectedRoom) return;
    
    setIsFlying(true);
    setMultiplier(1.00);
    
    // Use nextSignal from room if available, then signalQueue, otherwise generate random
    const roomRef = doc(db, 'mobeitor_rooms', selectedRoom.id);
    const roomSnap = await getDoc(roomRef);
    const roomData = roomSnap.data() as MobeitorRoom;
    
    // Suspicious room always crashes at 1.00
    const isSuspiciousRoom = roomData.name === 'Suspicious Protocol';
    let crashPoint = 1 + Math.random() * 5;

    if (isSuspiciousRoom) {
      crashPoint = 1.00;
    } else if (roomData.nextSignal) {
      crashPoint = roomData.nextSignal;
    } else if (roomData.signalQueue && roomData.signalQueue.length > 0) {
      crashPoint = roomData.signalQueue[0];
    } else if (roomData.minSignal !== undefined && roomData.maxSignal !== undefined) {
      // Generate random within range
      crashPoint = roomData.minSignal + Math.random() * (roomData.maxSignal - roomData.minSignal);
    }
    
    const interval = setInterval(() => {
      setMultiplier(prev => {
        const next = prev + 0.01 + (prev * 0.01);
        
        // Auto cashout check
        if (activeBetRef.current && activeBetRef.current.status === 'pending' && next >= (activeBetRef.current.autoCashout || 2.00) && !isCashingOutRef.current) {
          handleCashout(next);
        }

        if (next >= crashPoint) {
          clearInterval(interval);
          setIsFlying(false);
          const finalMultiplier = Number(next.toFixed(2));
          
          setHistory(h => [finalMultiplier, ...h].slice(0, 10));
          setPredictionKey(generateKey());
          setTimeLeft(selectedRoom?.time || 30);
          
          // Update room signal history, clear nextSignal, and update queue
          const updatedHistory = [finalMultiplier, ...(roomData.signalHistory || [])].slice(0, 20);
          const updatedQueue = roomData.signalQueue ? roomData.signalQueue.slice(1) : [];
          
          updateDoc(roomRef, {
            signalHistory: updatedHistory,
            nextSignal: null,
            signalQueue: updatedQueue
          });

          // If bet was still pending, it's a loss
          if (activeBet && activeBet.status === 'pending') {
            updateBetStatus(activeBet.id!, 'loss', 0);
          }
          setActiveBet(null);
          
          return finalMultiplier;
        }
        return Number(next.toFixed(2));
      });
    }, 100);
  };

  const handlePlaceBet = async () => {
    if (!user || !profile || !selectedRoom) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 10) {
      setError('Minimum bet is ₹10');
      return;
    }
    if (amount > profile.balance) {
      setError('Insufficient balance');
      return;
    }

    setIsPlacingBet(true);
    setError(null);

    try {
      // Deduct balance
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(-amount)
      });

      // Create transaction record for bet
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'withdrawal', // Using withdrawal type for deduction or I could add a 'bet' type
        amount: amount,
        description: `Mobeitor Bet (${selectedRoom.name})`,
        createdAt: serverTimestamp()
      });

      // Create bet record
      const betData: Omit<MobeitorBet, 'id'> = {
        userId: user.uid,
        userName: profile.fullName || 'Anonymous',
        roomId: selectedRoom.id,
        amount,
        multiplier: 0,
        payout: 0,
        status: 'pending',
        timestamp: Date.now(),
        autoCashout: parseFloat(autoCashout) || 2.00
      };

      const docRef = await addDoc(collection(db, 'mobeitor_bets'), betData);
      setActiveBet({ id: docRef.id, ...betData });
      setBetAmount('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      setError('Failed to place bet');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleCashout = async (currentMultiplier: number) => {
    if (!activeBetRef.current || !user || activeBetRef.current.status !== 'pending' || !profile || isCashingOutRef.current) return;

    setIsCashingOut(true);
    isCashingOutRef.current = true;
    
    const payout = activeBetRef.current.amount * currentMultiplier;
    const profit = payout - activeBetRef.current.amount;
    const betId = activeBetRef.current.id!;
    
    // Optimistically clear active bet to prevent double triggers
    setActiveBet(null);
    activeBetRef.current = null;
    
    try {
      // Update win streak and suspicious activity score
      const newWinStreak = (profile.winStreak || 0) + 1;
      let newSuspiciousScore = profile.suspiciousActivityScore || 0;
      let isWithdrawalBlocked = profile.isWithdrawalBlocked || false;
      let isSuspicious = profile.isSuspicious || false;
      let suspiciousReason = profile.suspiciousReason || '';

      // Daily Winnings Tracking
      const today = new Date().toISOString().split('T')[0];
      let dailyWinnings = profile.lastWinDate === today ? (profile.dailyWinnings || 0) : 0;
      dailyWinnings += profit;

      // Fetch settings for threshold
      const settingsSnap = await getDoc(doc(db, 'settings', 'admin'));
      const settings = settingsSnap.exists() ? settingsSnap.data() as AppSettings : null;
      const threshold = settings?.suspiciousWinThreshold || 10000; // Default 10k

      if (dailyWinnings >= threshold && !isSuspicious) {
        isSuspicious = true;
        suspiciousReason = `High daily winnings: ${formatCurrency(dailyWinnings)} (Threshold: ${formatCurrency(threshold)})`;
        
        // Send Telegram Notification
        await sendTelegramNotification(
          `<b>⚠️ SUSPICIOUS ACTIVITY DETECTED</b>\n\n` +
          `<b>User:</b> ${escapeHTML(profile.fullName)}\n` +
          `<b>Email:</b> ${escapeHTML(profile.email)}\n` +
          `<b>Reason:</b> ${escapeHTML(suspiciousReason)}\n` +
          `<b>Daily Wins:</b> ${formatCurrency(dailyWinnings)}\n` +
          `<b>Action:</b> Marked as suspicious`
        );
      }

      // Logic: If user wins 5 times in a row, increment suspicious score
      if (newWinStreak >= 5) {
        newSuspiciousScore += 1;
        if (newSuspiciousScore >= 3) {
          isWithdrawalBlocked = true;
          if (!isSuspicious) {
            isSuspicious = true;
            suspiciousReason = 'High win streak (5+ wins 3 times)';
            
            await sendTelegramNotification(
              `<b>⚠️ SUSPICIOUS ACTIVITY DETECTED</b>\n\n` +
              `<b>User:</b> ${escapeHTML(profile.fullName)}\n` +
              `<b>Email:</b> ${escapeHTML(profile.email)}\n` +
              `<b>Reason:</b> ${escapeHTML(suspiciousReason)}\n` +
              `<b>Action:</b> Withdrawal Blocked`
            );
          }
        }
      }

      // Add to balance, totalProfit and update security fields
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(payout),
        totalProfit: increment(profit),
        winStreak: newWinStreak,
        suspiciousActivityScore: newSuspiciousScore,
        isWithdrawalBlocked: isWithdrawalBlocked,
        isSuspicious: isSuspicious,
        suspiciousReason: suspiciousReason,
        dailyWinnings: dailyWinnings,
        lastWinDate: today,
        lastActivityAt: serverTimestamp()
      });

      // Create transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'profit',
        amount: payout,
        description: `Mobeitor Win (${currentMultiplier.toFixed(2)}x)`,
        createdAt: serverTimestamp()
      });

      await updateBetStatus(betId, 'win', currentMultiplier, payout);
      
      // Visual feedback for win
      setSuccess(`Protocol Success! ${formatCurrency(payout)} added to wallet.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      // If it fails, we might want to restore the bet, but usually it's better to just log it
    } finally {
      setIsCashingOut(false);
    }
  };

  const updateBetStatus = async (betId: string, status: 'win' | 'loss', finalMultiplier: number, payout: number = 0) => {
    try {
      const betRef = doc(db, 'mobeitor_bets', betId);
      const updateData: any = {
        status,
        multiplier: finalMultiplier,
        payout,
        completedAt: serverTimestamp()
      };

      // Reset win streak on loss
      if (status === 'loss' && user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          winStreak: 0,
          lastActivityAt: serverTimestamp()
        });
      }

      await updateDoc(betRef, updateData);
    } catch (err) {
      console.error('Error updating bet status:', err);
    }
  };

  if (!selectedRoom) {
    return (
      <div className="space-y-12 pb-20">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-5xl font-black tracking-tight uppercase">Mobeitor Protocol</h2>
          <div className="h-1 w-24 bg-primary mx-auto rounded-full" />
          <p className="text-white/30 font-light text-lg">Select a high-frequency trading room to initialize the Mobeitor engine.</p>
        </div>

        {isLoadingRooms ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Zap size={48} className="text-primary animate-pulse" />
            <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs">Synchronizing Protocols...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="glass-card p-20 text-center border border-white/5 space-y-8">
            <div className="h-20 w-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto text-white/20">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight">No Protocols Found</h3>
              <p className="text-white/30 text-sm max-w-md mx-auto">The Mobeitor engine has not been initialized with any trading rooms yet.</p>
            </div>
            {(profile?.role === 'admin' || user?.email === 'manidl250587@gmail.com') && (
              <button 
                onClick={() => {
                  seedDatabase();
                }}
                className="gold-button px-10"
              >
                Initialize Engine
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {rooms.map((room) => (
              <motion.button
                key={room.id}
                whileHover={room.isDisabled ? {} : { y: -10, scale: 1.02 }}
                whileTap={room.isDisabled ? {} : { scale: 0.98 }}
                onClick={() => !room.isDisabled && setSelectedRoom(room)}
                disabled={room.isDisabled}
                className={cn(
                  "glass-card p-10 text-left border transition-all duration-500 group relative overflow-hidden",
                  room.isDisabled 
                    ? "opacity-50 grayscale cursor-not-allowed border-white/5" 
                    : "border-white/[0.05] hover:border-primary/30"
                )}
              >
                <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 group-hover:opacity-20 transition-all bg-gradient-to-br", room.color)} />
                
                <div className="flex items-center justify-between mb-8">
                  <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Clock size={28} className="text-white/40" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Cycle Time</p>
                    <p className="text-xl font-black text-primary">{room.time}s</p>
                  </div>
                </div>

                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{room.name}</h3>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-8">
                  {room.name === 'Suspicious Protocol' ? 'RESTRICTED ACCESS - MONITORING ACTIVE' : room.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                    {room.isDisabled ? 'Protocol Offline' : 'Initialize Room'} <ChevronRight size={14} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{room.activePlayers || 0} Active</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <button 
        onClick={() => setSelectedRoom(null)}
        disabled={(profile?.suspiciousActivityScore || 0) > 50}
        className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all uppercase text-[10px] font-black tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowLeft size={16} /> { (profile?.suspiciousActivityScore || 0) > 50 ? 'Protocol Locked' : 'Exit Room' }
      </button>

      {/* Header Info Stack */}
      <div className="glass-card p-8 border border-white/5 flex flex-col items-center text-center space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Available Capital</p>
          <p className="text-4xl font-black text-emerald-500 tracking-tighter">{formatCurrency(profile?.balance || 0)}</p>
        </div>
        <div className="h-px w-20 bg-white/10" />
        <div className="space-y-1">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Active Protocol ID</p>
          <p className="text-xl font-black text-primary tracking-widest">{selectedRoom.id.toUpperCase()}</p>
        </div>
        <div className="h-px w-20 bg-white/10" />
        <div className="space-y-1">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Next Round Prediction Key</p>
          <div className="flex items-center gap-3 px-6 py-2 rounded-xl bg-primary/5 border border-primary/20">
            <ShieldCheck size={14} className="text-primary" />
            <span className="text-sm font-mono font-black text-primary tracking-widest">{predictionKey}</span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Game Screen */}
          <div className="glass-card aspect-video relative overflow-hidden border border-white/10 flex flex-col items-center justify-center">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-5" style={{ 
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />

            {/* Multiplier Display */}
            <div className="relative z-10 text-center">
              <motion.h2 
                key={multiplier}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "text-8xl md:text-9xl font-black tracking-tighter",
                  isFlying ? "text-white" : "text-rose-500"
                )}
              >
                {multiplier.toFixed(2)}x
              </motion.h2>
              {!isFlying && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <p className="text-[12px] font-black uppercase tracking-[0.4em] text-rose-500/60">Protocol Crashed</p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <Clock size={16} className="text-primary animate-spin" />
                    <span className="text-xl font-black text-primary">Next Round in {timeLeft}s</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Plane Animation */}
            <AnimatePresence>
              {isFlying && (
                <motion.div
                  initial={{ x: -100, y: 100, opacity: 0 }}
                  animate={{ 
                    x: [0, 10, 0], 
                    y: [0, -10, 0],
                    opacity: 1 
                  }}
                  transition={{ 
                    x: { repeat: Infinity, duration: 2 },
                    y: { repeat: Infinity, duration: 1.5 }
                  }}
                  className="absolute bottom-1/4 left-1/4 text-primary"
                >
                  <Plane size={64} className="rotate-[-45deg] drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-6">
            <div className="glass-card p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Bet Amount</span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Min: ₹10</span>
              </div>
              <input 
                type="number" 
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="0.00"
                disabled={isPlacingBet || activeBet !== null || isFlying}
                className="glass-input w-full text-2xl font-black tracking-tighter"
              />
              {activeBet ? (
                <button 
                  onClick={() => handleCashout(multiplier)}
                  disabled={!isFlying || activeBet.status !== 'pending' || isCashingOut}
                  className="gradient-button w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] disabled:opacity-50"
                >
                  {isCashingOut ? 'Processing...' : `Cashout ${formatCurrency(activeBet.amount * multiplier)}`}
                </button>
              ) : (
                <button 
                  onClick={handlePlaceBet}
                  disabled={isPlacingBet || isFlying || !betAmount}
                  className="gradient-button w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] disabled:opacity-50"
                >
                  {isPlacingBet ? 'Processing...' : 'Place Bet'}
                </button>
              )}
              {error && (
                <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest">
                  <AlertCircle size={12} /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck size={12} /> {success}
                </div>
              )}
            </div>
            <div className="glass-card p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Auto Cashout</span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Multiplier</span>
              </div>
              <input 
                type="number" 
                value={autoCashout}
                onChange={(e) => setAutoCashout(e.target.value)}
                placeholder="2.00"
                disabled={activeBet !== null}
                className="glass-input w-full text-2xl font-black tracking-tighter"
              />
              <button className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase text-[11px] tracking-[0.3em] hover:bg-white/10 transition-all">
                Auto Protocol
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          {/* History */}
          <div className="glass-card p-8 border border-white/5">
            <div className="flex items-center gap-4 mb-8">
              <History size={20} className="text-primary" />
              <h3 className="text-lg font-black uppercase tracking-tight">Recent Crashes</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(selectedRoom?.signalHistory || history).length > 0 ? (selectedRoom?.signalHistory || history).map((val, idx) => (
                <div key={idx} className={cn(
                  "p-3 rounded-xl border text-center font-black text-sm",
                  val >= 2 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                )}>
                  {val.toFixed(2)}x
                </div>
              )) : (
                <div className="col-span-2 py-10 text-center text-white/10 uppercase text-[10px] font-black tracking-widest">
                  No Data Available
                </div>
              )}
            </div>
          </div>

          {/* Live Bets */}
          <div className="glass-card p-8 border border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Trophy size={20} className="text-luxury" />
                <h3 className="text-lg font-black uppercase tracking-tight">Live Operatives</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{roomBets.length} Active</span>
              </div>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {roomBets.length > 0 ? roomBets.map((bet, idx) => (
                <div key={bet.id || idx} className={cn(
                  "flex items-center justify-between p-4 rounded-2xl transition-all border",
                  bet.status === 'win' ? "bg-emerald-500/5 border-emerald-500/10" : 
                  bet.status === 'loss' ? "bg-rose-500/5 border-rose-500/10" : 
                  "bg-white/[0.02] border-white/[0.05]"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black border",
                      bet.status === 'win' ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-500" :
                      bet.status === 'loss' ? "bg-rose-500/20 border-rose-500/20 text-rose-500" :
                      "bg-primary/10 border-primary/20 text-primary"
                    )}>
                      {bet.userName?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/80">{bet.userName}</p>
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{formatCurrency(bet.amount)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {bet.status === 'win' ? (
                      <>
                        <p className="text-[10px] font-black text-emerald-500 tracking-tighter">{bet.multiplier.toFixed(2)}x</p>
                        <p className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest">+{formatCurrency(bet.payout)}</p>
                      </>
                    ) : bet.status === 'loss' ? (
                      <p className="text-[10px] font-black text-rose-500/40 uppercase tracking-widest">Crashed</p>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest animate-pulse">Flying...</span>
                        {isFlying && (
                          <span className="text-[9px] font-bold text-primary tracking-tighter">{multiplier.toFixed(2)}x</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">Waiting for Operatives...</p>
                </div>
              )}
            </div>
          </div>

          {/* My Bets */}
          <div className="glass-card p-8 border border-white/5">
            <div className="flex items-center gap-4 mb-8">
              <History size={20} className="text-primary" />
              <h3 className="text-lg font-black uppercase tracking-tight">My Operations</h3>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {myBets.length > 0 ? myBets.map((bet, idx) => (
                <div key={bet.id || idx} className={cn(
                  "flex items-center justify-between p-4 rounded-2xl transition-all border",
                  bet.status === 'win' ? "bg-emerald-500/5 border-emerald-500/10" : 
                  bet.status === 'loss' ? "bg-rose-500/5 border-rose-500/10" : 
                  "bg-white/[0.02] border-white/[0.05]"
                )}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
                      {bet.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 
                       (typeof bet.timestamp === 'number' ? new Date(bet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending')}
                    </p>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{formatCurrency(bet.amount)}</p>
                  </div>
                  <div className="text-right">
                    {bet.status === 'win' ? (
                      <>
                        <p className="text-[10px] font-black text-emerald-500 tracking-tighter">{bet.multiplier.toFixed(2)}x</p>
                        <p className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest">+{formatCurrency(bet.payout)}</p>
                      </>
                    ) : bet.status === 'loss' ? (
                      <p className="text-[10px] font-black text-rose-500/40 uppercase tracking-widest">Crashed</p>
                    ) : (
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest animate-pulse">Active</span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">No Recent Operations</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobeitorGame;
