import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Key, 
  LogOut, 
  CheckCircle2,
  Camera,
  ChevronRight,
  ShieldCheck,
  Award,
  Calendar,
  Users,
  Copy,
  Check,
  Wallet,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

const Profile: React.FC = () => {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [upiId, setUpiId] = useState(profile?.upiId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveUpi = async () => {
    if (!profile) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        upiId: upiId
      });
      setSaveMessage({ type: 'success', text: 'UPI Protocol Updated' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'Update Failed' });
    } finally {
      setIsSaving(false);
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
      className="max-w-6xl mx-auto space-y-12 pb-20"
    >
      <motion.div variants={item} className="text-center md:text-left space-y-4">
        <h2 className="text-5xl font-black uppercase tracking-tight">Identity Vault</h2>
        <div className="h-1 w-24 bg-primary rounded-full hidden md:block" />
        <p className="text-white/30 font-light text-lg">Manage your elite credentials and security protocols.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Avatar & Quick Stats */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div variants={item} className="glass-card p-10 text-center space-y-8 border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -z-10 group-hover:bg-primary/10 transition-all" />
            
            <div className="relative inline-block">
              <div className="h-40 w-40 rounded-[2.5rem] bg-gradient-to-br from-primary via-[#B8860B] to-primary flex items-center justify-center text-6xl font-black text-black shadow-2xl shadow-primary/20 border-4 border-white/10">
                {profile?.fullName?.[0] || 'U'}
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -bottom-2 -right-2 p-4 bg-white text-black rounded-2xl border-4 border-background shadow-xl hover:bg-primary transition-all"
              >
                <Camera size={20} />
              </motion.button>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight">{profile?.fullName}</h3>
              <p className="text-sm text-white/30 font-medium tracking-wider">{profile?.email}</p>
            </div>

            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
              <ShieldCheck size={14} />
              Elite Verified
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card p-8 space-y-8 border border-white/[0.05]">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Protocol Metrics</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
                    <Calendar size={18} />
                  </div>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Initialization</span>
                </div>
                <span className="text-sm font-black tracking-tight">{profile?.createdAt?.toDate()?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
                    <Users size={18} />
                  </div>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Network Size</span>
                </div>
                <span className="text-sm font-black tracking-tight">12 Elite</span>
              </div>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
                    <Award size={18} />
                  </div>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Clearance</span>
                </div>
                <span className="text-sm font-black text-primary uppercase tracking-widest">{profile?.role}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Details & Security */}
        <div className="lg:col-span-8 space-y-8">
          <motion.div variants={item} className="glass-card p-10 border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            
            <h3 className="text-xl font-black uppercase tracking-wider mb-10 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <User size={20} />
              </div>
              Personal Dossier
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Full Legal Name</label>
                <div className="glass-input w-full py-5 px-6 font-black tracking-tight text-white/80">
                  {profile?.fullName}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Email Identifier</label>
                <div className="glass-input w-full py-5 px-6 font-black tracking-tight text-white/80">
                  {profile?.email}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Communication Link</label>
                <div className="glass-input w-full py-5 px-6 font-black tracking-tight text-white/80">
                  {profile?.phone}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Referral Protocol</label>
                <div className="relative group/input">
                  <div className="glass-input w-full py-5 px-6 font-mono font-black text-primary tracking-[0.2em]">
                    {profile?.referralCode}
                  </div>
                  <button 
                    onClick={() => copyToClipboard(profile?.referralCode || '')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/10 rounded-lg text-white/20 hover:text-primary transition-all"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card p-10 border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />
            
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black uppercase tracking-wider flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <Wallet size={20} />
                </div>
                Financial Protocol
              </h3>
              <AnimatePresence>
                {saveMessage && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                      saveMessage.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}
                  >
                    {saveMessage.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {saveMessage.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Personal UPI Identifier</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="text" 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@bank"
                    className="glass-input flex-1 py-5 px-6 font-black tracking-tight text-white/80"
                  />
                  <button 
                    onClick={handleSaveUpi}
                    disabled={isSaving}
                    className="gradient-button px-8 py-5 flex items-center justify-center gap-3 min-w-[180px]"
                  >
                    {isSaving ? (
                      <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {isSaving ? 'Syncing...' : 'Save Protocol'}
                    </span>
                  </button>
                </div>
                <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest ml-2">
                  Used for automated liquidation and profit harvesting.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card p-10 border border-white/[0.05]">
            <h3 className="text-xl font-black uppercase tracking-wider mb-10 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Key size={20} />
              </div>
              Security Protocols
            </h3>
            
            <div className="space-y-4">
              <button className="w-full p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between hover:bg-white/[0.05] transition-all group">
                <div className="flex items-center gap-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                    <Key size={22} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-widest">Update Access Key</p>
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1">Modify your account password</p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              <button className="w-full p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between hover:bg-white/[0.05] transition-all group">
                <div className="flex items-center gap-6">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all">
                    <Shield size={22} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-widest">Dual-Factor Auth</p>
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1">Multi-layer verification protocol</p>
                  </div>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 text-[9px] font-black text-white/20 uppercase tracking-widest">Inactive</div>
              </button>
            </div>
          </motion.div>

          <motion.button 
            variants={item}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => auth.signOut()}
            className="w-full p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 text-rose-500 font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4 hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-rose-500/5"
          >
            <LogOut size={20} />
            Terminate Current Session
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
