import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABMlXWUqnr2cxJ7ANbOQ0NiYPe-cFCR-E",
  authDomain: "baka-pay.firebaseapp.com",
  databaseURL: "https://baka-pay-default-rtdb.firebaseio.com",
  projectId: "baka-pay",
  storageBucket: "baka-pay.firebasestorage.app",
  messagingSenderId: "902371644354",
  appId: "1:902371644354:web:a9f0db37d1d8a44ddc7c5b",
  measurementId: "G-7S1G03C6PL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const seedDatabase = async () => {
  try {
    const plansRef = collection(db, 'plans');
    const roomsRef = collection(db, 'mobeitor_rooms');
    const settingsRef = doc(db, 'settings', 'admin');

    // Check if user is authenticated and is admin before proceeding
    if (!auth.currentUser) return;

    const plansSnap = await getDocs(plansRef);
    if (plansSnap.empty) {
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
      for (const plan of defaultPlans) {
        await addDoc(plansRef, { ...plan, createdAt: serverTimestamp() });
      }
    }

    const roomsSnap = await getDocs(roomsRef);
    const existingRoomNames = roomsSnap.docs.map(doc => doc.data().name);
    
    const defaultRooms = [
      { name: 'Alpha Protocol', time: 30, description: 'High-frequency 30s cycle.', color: 'from-emerald-500 to-teal-600', isDisabled: false, activePlayers: 0 },
      { name: 'Beta Protocol', time: 60, description: 'Standard 60s cycle.', color: 'from-blue-500 to-indigo-600', isDisabled: false, activePlayers: 0 },
      { name: 'Gamma Protocol', time: 120, description: 'Extended 120s cycle.', color: 'from-purple-500 to-fuchsia-600', isDisabled: false, activePlayers: 0 },
      { name: 'Delta Protocol', time: 180, description: 'Extended 180s cycle.', color: 'from-amber-500 to-orange-600', isDisabled: false, activePlayers: 0 },
      { name: 'Omega Protocol', time: 300, description: 'Long-term 300s cycle.', color: 'from-cyan-500 to-blue-600', isDisabled: false, activePlayers: 0 },
      { name: 'Blitz Protocol', time: 15, description: 'Ultra-fast 15s cycle.', color: 'from-rose-500 to-pink-600', isDisabled: false, activePlayers: 0 },
      { name: 'Titan Protocol', time: 600, description: 'Massive 600s cycle.', color: 'from-slate-700 to-slate-900', isDisabled: false, activePlayers: 0 },
      { name: 'Sigma Protocol', time: 45, description: 'Optimized 45s cycle.', color: 'from-lime-500 to-green-600', isDisabled: false, activePlayers: 0 },
      { name: 'Zeta Protocol', time: 90, description: 'Balanced 90s cycle.', color: 'from-indigo-500 to-purple-600', isDisabled: false, activePlayers: 0 },
      { name: 'Orion Protocol', time: 240, description: 'Deep space 240s cycle.', color: 'from-blue-900 to-indigo-950', isDisabled: false, activePlayers: 0 },
      { name: 'Suspicious Protocol', time: 10, description: 'Restricted access protocol.', color: 'from-rose-600 to-red-900', isDisabled: false, activePlayers: 0 }
    ];

    for (const room of defaultRooms) {
      if (!existingRoomNames.includes(room.name)) {
        await addDoc(roomsRef, { ...room, createdAt: serverTimestamp() });
      }
    }

    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        adminUpiId: 'paytm@upi',
        adminQrCodeUrl: 'https://picsum.photos/seed/qr/300/300',
        adminPassword: 'alphakumar',
        minDeposit: 200,
        maxDeposit: 100000,
        minWithdrawal: 500,
        maxWithdrawal: 50000,
        customerServiceLink: 'https://t.me/support',
        referralRedirectLink: 'https://mobestocks.com'
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      console.log('Seeding skipped: insufficient permissions');
    } else {
      console.error('Seeding error:', error);
    }
  }
};

export default app;
