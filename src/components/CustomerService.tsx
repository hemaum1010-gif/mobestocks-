import React, { useState, useEffect } from 'react';
import { Headset } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AppSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const CustomerService: React.FC = () => {
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppSettings;
        setLink(data.customerServiceLink || null);
      } else {
        setLink(null);
        console.warn("Customer service link not found in Firestore. Please set it in the Admin Panel > Protocol Config.");
      }
    }, (err) => {
      console.error("Error fetching customer service link:", err);
    });
    return () => unsub();
  }, []);

  if (!link) return null;

  return (
    <motion.a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50 h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-black shadow-2xl shadow-primary/20 border border-primary/20 group"
    >
      <Headset size={28} className="group-hover:rotate-12 transition-transform" />
      <div className="absolute right-full mr-4 px-4 py-2 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Elite Support
      </div>
    </motion.a>
  );
};

export default CustomerService;
