import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { Bell, Check, Trash2, Clock, Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { cn } from '../utils';
import { Notification } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';

const Notifications: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      const sortedNotifs = notifs.sort((a, b) => {
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateB - dateA;
      });
      setNotifications(sortedNotifs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications'));

    return () => unsubscribe();
  }, [profile]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error(error);
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-12"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-4xl font-black uppercase tracking-tight">Intelligence</h2>
          <div className="h-1 w-12 bg-primary rounded-full" />
          <p className="text-white/30 font-light">Real-time alerts and protocol updates for your portfolio.</p>
        </div>
        <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-xl shadow-primary/5">
          <Bell size={32} />
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <AnimatePresence mode="popLayout">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <motion.div 
                layout
                variants={item}
                key={notif.id} 
                className={cn(
                  "glass-card p-8 flex gap-6 transition-all duration-500 relative overflow-hidden group border border-white/[0.05]",
                  !notif.isRead ? "border-primary/30 bg-primary/[0.02]" : "hover:border-white/20"
                )}
              >
                {!notif.isRead && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                )}
                
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500",
                  !notif.isRead 
                    ? "bg-primary text-black border-primary shadow-lg shadow-primary/20" 
                    : "bg-white/[0.03] text-white/30 border-white/[0.05]"
                )}>
                  <ShieldCheck size={24} />
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className={cn(
                      "text-lg font-black uppercase tracking-wider", 
                      !notif.isRead ? "text-white" : "text-white/50"
                    )}>
                      {notif.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                      <Clock size={12} />
                      {notif.createdAt?.toDate()?.toLocaleString()}
                    </div>
                  </div>
                  <p className="text-sm text-white/40 leading-relaxed font-light">{notif.message}</p>
                  
                  <div className="flex gap-6 pt-4">
                    {!notif.isRead && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="text-[10px] font-black text-primary hover:text-white transition-all flex items-center gap-2 uppercase tracking-widest"
                      >
                        <Check size={14} />
                        Acknowledge
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(notif.id)}
                      className="text-[10px] font-black text-rose-400/50 hover:text-rose-400 transition-all flex items-center gap-2 uppercase tracking-widest"
                    >
                      <Trash2 size={14} />
                      Purge
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              variants={item}
              className="glass-card p-32 text-center border border-white/[0.05]"
            >
              <div className="flex flex-col items-center gap-6 opacity-10">
                <Bell size={80} strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No active intelligence reports</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default Notifications;
