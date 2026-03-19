import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Dashboard from './components/Dashboard';
import Plans from './components/Plans';
import Deposit from './components/Deposit';
import Withdraw from './components/Withdraw';
import Referral from './components/Referral';
import Transactions from './components/Transactions';
import Profile from './components/Profile';
import Notifications from './components/Notifications';
import AdminPanel from './components/AdminPanel';
import CustomerService from './components/CustomerService';
import MobeitorGame from './components/MobeitorGame';
import { TrendingUp, Lock, ShieldCheck, ArrowLeft, Bell, Zap } from 'lucide-react';
import { cn } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import { seedDatabase } from './firebase';

const AppContent: React.FC = () => {
  const { user, profile, loading, activeTab, setActiveTab } = useAuth();
  const [view, setView] = useState<'home' | 'auth' | 'dashboard'>('home');
  const [authType, setAuthType] = useState<'login' | 'register'>('login');
  const [logoTaps, setLogoTaps] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    const isAdminEmail = user?.email === 'manidl250587@gmail.com';
    if (user && (profile?.role === 'admin' || isAdminEmail)) {
      seedDatabase();
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) {
      setView('dashboard');
    } else if (!loading) {
      if (view === 'dashboard') setView('home');
    }
  }, [user, profile, loading]);

  const handleLogoTap = () => {
    setLogoTaps(prev => prev + 1);
    if (logoTaps + 1 >= 3) {
      setShowAdminLogin(true);
      setLogoTaps(0);
    }
    setTimeout(() => setLogoTaps(0), 2000);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'alphakumar') {
      setActiveTab('admin');
      setShowAdminLogin(false);
      setAdminPassword('');
      if (view !== 'dashboard') setView('dashboard');
    } else {
      alert('Incorrect admin password');
    }
  };

  const handleBack = () => {
    if (activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    } else {
      // If already on dashboard, maybe go home if logged out, but here we are logged in
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
          className="relative"
        >
          <TrendingUp size={64} className="text-primary" />
          <div className="absolute inset-0 bg-primary/20 blur-2xl -z-10" />
        </motion.div>
        <h2 className="mt-8 text-2xl font-bold text-secondary tracking-[0.3em] luxury-gradient-text">MOBESTOCKS</h2>
      </div>
    );
  }

  const renderTab = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {(() => {
            switch (activeTab) {
              case 'dashboard': return <Dashboard />;
              case 'plans': return <Plans />;
              case 'deposit': return <Deposit />;
              case 'withdraw': return <Withdraw />;
              case 'referral': return <Referral />;
              case 'transactions': return <Transactions />;
              case 'profile': return <Profile />;
              case 'notifications': return <Notifications />;
              case 'mobeitor': return <MobeitorGame />;
              case 'admin': return <AdminPanel />;
              default: return <Dashboard />;
            }
          })()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatePresence mode="wait">
        {(() => {
          if (showAdminLogin) {
            return (
              <motion.div 
                key="admin-login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-screen flex items-center justify-center p-4 bg-background"
              >
                <div className="glass-card p-10 w-full max-w-md space-y-8 text-center">
                  <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
                    <ShieldCheck size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold">Admin Access</h2>
                    <p className="text-white/40 text-sm">Authorized Personnel Only</p>
                  </div>
                  <form onSubmit={handleAdminLogin} className="space-y-6 text-left">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Secret Key</label>
                      <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                        <input 
                          type="password" 
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="glass-input w-full pl-14"
                          autoFocus
                        />
                      </div>
                    </div>
                    <button type="submit" className="gold-button w-full">Enter Command Center</button>
                    <button 
                      type="button" 
                      onClick={() => setShowAdminLogin(false)}
                      className="w-full text-sm text-white/30 hover:text-white transition-all"
                    >
                      Return to Safety
                    </button>
                  </form>
                </div>
              </motion.div>
            );
          }

          if (view === 'home') {
            return (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Home 
                  onLogin={() => { setAuthType('login'); setView('auth'); }} 
                  onRegister={() => { setAuthType('register'); setView('auth'); }} 
                  onAdminTrigger={() => setShowAdminLogin(true)}
                />
              </motion.div>
            );
          }

          if (view === 'auth') {
            return (
              <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AuthPage 
                  type={authType} 
                  onToggle={() => setAuthType(authType === 'login' ? 'register' : 'login')}
                  onSuccess={() => setView('dashboard')}
                  onAdminTrigger={() => setShowAdminLogin(true)}
                />
              </motion.div>
            );
          }

          return (
            <motion.div 
              key="dashboard-layout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex flex-col md:flex-row bg-background overflow-hidden selection:bg-primary/30 relative"
            >
              <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-luxury/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
              </div>

              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
              <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
              
              <main className="flex-1 h-screen overflow-y-auto p-4 md:p-10 relative z-10">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-6">
                      <AnimatePresence>
                        {activeTab !== 'dashboard' && (
                          <motion.button 
                            initial={{ opacity: 0, x: -20, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -20, scale: 0.8 }}
                            onClick={handleBack}
                            className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.08] transition-all group shadow-2xl"
                          >
                            <ArrowLeft size={24} className="text-white/40 group-hover:text-primary transition-all group-hover:-translate-x-1" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <div className="flex items-center gap-5">
                        <button onClick={handleLogoTap} className="p-2 hover:scale-110 transition-all active:scale-95 relative group">
                          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          <TrendingUp className="text-primary relative z-10" size={40} />
                        </button>
                        <div className="hidden sm:block">
                          <h1 className="text-3xl font-black tracking-[0.25em] luxury-gradient-text uppercase leading-none">MOBESTOCKS</h1>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-px w-4 bg-primary/30" />
                            <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-black">Elite Assets Protocol</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => setActiveTab('notifications')}
                        className="relative h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.08] transition-all group"
                      >
                        <Bell size={24} className="text-white/60 group-hover:text-primary transition-colors" />
                        <span className="absolute top-4 right-4 h-2.5 w-2.5 bg-primary rounded-full ring-4 ring-background shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                      </button>
                      
                      <div className="hidden md:flex items-center gap-5 pl-8 border-l border-white/[0.05]">
                        <div className="text-right">
                          <p className="text-sm font-black text-secondary tracking-tight">{profile?.fullName}</p>
                          <p className="text-[9px] text-primary uppercase tracking-[0.2em] font-black mt-0.5">{profile?.role} Clearance</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('profile')}
                          className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-[#B8860B] to-primary flex items-center justify-center font-black text-black shadow-2xl shadow-primary/20 hover:scale-105 transition-all active:scale-95 border border-white/20"
                        >
                          <span className="text-xl">{profile?.fullName?.[0] || 'U'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {renderTab()}
                </div>
              </main>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      <CustomerService />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
