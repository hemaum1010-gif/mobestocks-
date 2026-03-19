import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { 
  TrendingUp, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { auth, db } from '../firebase';
import { generateReferralCode } from '../utils';
import { motion } from 'motion/react';

interface AuthPageProps {
  type: 'login' | 'register';
  onToggle: () => void;
  onSuccess: () => void;
  onAdminTrigger?: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ type, onToggle, onSuccess, onAdminTrigger }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [taps, setTaps] = useState(0);

  const handleTap = () => {
    if (!onAdminTrigger) return;
    setTaps(prev => prev + 1);
    if (taps + 1 >= 3) {
      onAdminTrigger();
      setTaps(0);
    }
    setTimeout(() => setTaps(0), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (type === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      if (type === 'register') {
        let referrerId = null;
        
        // Validate referral code if provided
        if (formData.referralCode) {
          const q = query(collection(db, 'users'), where('referralCode', '==', formData.referralCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            referrerId = snap.docs[0].id;
          } else {
            setError('Invalid referral code.');
            setLoading(false);
            return;
          }
        }

        const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        const referralCode = generateReferralCode();
        
        // Create user profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          referralCode: referralCode,
          referredBy: referrerId,
          balance: 0,
          totalInvestment: 0,
          totalProfit: 0,
          totalWithdrawals: 0,
          role: 'user',
          createdAt: serverTimestamp()
        });

        // Create referral record if referred
        if (referrerId) {
          await addDoc(collection(db, 'referrals'), {
            referrerId: referrerId,
            referredId: user.uid,
            referredName: formData.fullName,
            hasInvested: false,
            commissionEarned: 0,
            createdAt: serverTimestamp()
          });
        }

        onSuccess();
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setMessage('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background selection:bg-primary/30">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_20%,rgba(212,175,55,0.05),transparent_70%)] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-12"
      >
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-4 mb-4 cursor-pointer group" 
            onClick={handleTap}
          >
            <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="text-black" size={32} />
            </div>
            <h1 className="text-3xl font-black text-secondary tracking-[0.2em] uppercase luxury-gradient-text">MOBESTOCKS</h1>
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight uppercase">{type === 'login' ? 'The Vault' : 'New Legacy'}</h2>
            <p className="text-white/30 font-light">
              {type === 'login' ? 'Authorized access only. Enter your credentials.' : 'Initialize your elite investment portfolio.'}
            </p>
          </div>
        </div>

        <div className="glass-card p-10 border border-white/[0.05]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs flex items-center gap-3"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}
            
            {message && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-primary text-xs flex items-center gap-3"
              >
                <CheckCircle2 size={18} />
                {message}
              </motion.div>
            )}

            {type === 'register' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Identity</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                    <input 
                      type="text" 
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="glass-input w-full pl-14"
                      placeholder="Full Name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Communication</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="glass-input w-full pl-14"
                      placeholder="Phone Number"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Credentials</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass-input w-full pl-14"
                  placeholder="Email Address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Security</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-input w-full pl-14"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {type === 'register' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Verification</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                    <input 
                      type="password" 
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="glass-input w-full pl-14"
                      placeholder="Confirm Password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Referral (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.referralCode}
                    onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Enter Code"
                  />
                </div>
              </>
            )}

            {type === 'login' && (
              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-all"
                >
                  Reset Credentials
                </button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full gold-button py-5 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
            >
              {loading ? 'Processing...' : type === 'login' ? 'Authorize Access' : 'Initialize Account'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/[0.05] text-center">
            <p className="text-xs text-white/30 font-light">
              {type === 'login' ? "New to the platform?" : "Already a member?"}
              <button 
                onClick={onToggle}
                className="ml-3 font-black text-white uppercase tracking-widest hover:text-primary transition-all"
              >
                {type === 'login' ? 'Register' : 'Login'}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-[9px] text-white/10 px-12 uppercase tracking-[0.2em] font-black leading-relaxed">
          By accessing this platform, you agree to the elite terms of service and privacy protocols.
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
