import React, { useState } from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Star,
  Zap,
  Award,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { formatCurrency, cn } from '../utils';
import { motion } from 'motion/react';

interface HomeProps {
  onLogin: () => void;
  onRegister: () => void;
  onAdminTrigger?: () => void;
}

const Home: React.FC<HomeProps> = ({ onLogin, onRegister, onAdminTrigger }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
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

  const stats = [
    { label: 'Total Users', value: '50,000+', icon: Users },
    { label: 'Total Deposits', value: '₹10Cr+', icon: Zap },
    { label: 'Total Withdrawals', value: '₹8Cr+', icon: Award },
    { label: 'Active Investments', value: '12,000+', icon: TrendingUp },
  ];

  const categories = [
    { 
      name: 'Bronze Plans', 
      range: '₹200 – ₹1000', 
      profit: 'Daily', 
      color: 'from-orange-500/20 to-orange-700/20',
      features: ['Daily profit ₹10 - ₹70', '30 Days duration', 'Referral unlock required']
    },
    { 
      name: 'Gold Plans', 
      range: '₹2000 – ₹5000', 
      profit: 'Monthly', 
      color: 'from-primary/20 to-[#B8860B]/20',
      features: ['Monthly profit ₹400 - ₹1600', '7 Plan options', 'Yearly claim options']
    },
    { 
      name: 'Diamond Plans', 
      range: '₹10000 – ₹50000', 
      profit: 'High Returns', 
      color: 'from-blue-500/20 to-blue-700/20',
      features: ['Monthly profit ₹2000 - ₹8000', 'Silver Coin Bonus', 'VIP Support']
    },
  ];

  const faqs = [
    { q: "What is MOBESTOCKS?", a: "MOBESTOCKS is a secure digital investment platform that allows users to invest in various plans and earn consistent profits." },
    { q: "How do I start investing?", a: "Simply register an account, deposit funds using UPI or QR code, and choose an investment plan that suits you." },
    { q: "What is the minimum deposit?", a: "The minimum deposit amount is ₹200, which allows you to start with our Bronze Starter plan." },
    { q: "How do withdrawals work?", a: "You can request a withdrawal to your UPI or bank account. Admin approval is required, and it typically takes 24-48 hours." },
  ];

  return (
    <div className="min-h-screen bg-background text-white overflow-x-hidden selection:bg-primary/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl border-b border-white/[0.05] bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 cursor-pointer group" 
            onClick={handleTap}
          >
            <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="text-black" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-secondary tracking-[0.2em] uppercase luxury-gradient-text">MOBESTOCKS</h1>
              <p className="text-[8px] text-white/20 uppercase tracking-[0.4em] font-bold">Elite Investing</p>
            </div>
          </motion.div>
          
          <nav className="hidden md:flex items-center gap-10">
            {['Home', 'Plans', 'FAQ'].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`} 
                className="text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-primary transition-all"
              >
                {item}
              </a>
            ))}
            <button onClick={onLogin} className="text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-primary transition-all">Login</button>
            <button onClick={onRegister} className="gold-button py-3 px-8 text-xs uppercase tracking-widest">Register</button>
          </nav>

          <button className="md:hidden h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
            <ChevronRight size={24} className="text-white/40" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="pt-52 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.08),transparent_70%)] -z-10" />
        
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/[0.03] border border-white/[0.05] text-primary text-[10px] font-black uppercase tracking-[0.3em]"
          >
            <Star size={14} />
            The Gold Standard of Investing
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] uppercase"
          >
            Elevate Your <br />
            <span className="luxury-gradient-text">Capital</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/40 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Experience a new era of digital asset management. Secure, transparent, and engineered for those who demand excellence in their financial journey.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col md:flex-row items-center justify-center gap-6 pt-6"
          >
            <button onClick={onRegister} className="gold-button px-12 py-5 text-sm uppercase tracking-widest w-full md:w-auto flex items-center justify-center gap-3">
              Start Your Legacy
              <ArrowRight size={20} />
            </button>
            <button onClick={onLogin} className="glass-card px-12 py-5 text-sm uppercase tracking-widest w-full md:w-auto hover:bg-white/[0.06] transition-all border border-white/[0.05] text-white/60">
              Access Vault
            </button>
          </motion.div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-10 text-center space-y-6 hover:border-primary/30 transition-all duration-500 group"
            >
              <div className="h-16 w-16 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto text-primary group-hover:scale-110 transition-transform">
                <stat.icon size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black text-white tracking-tighter">{stat.value}</p>
                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section id="plans" className="py-32 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="text-center space-y-4">
            <h3 className="text-5xl font-black uppercase tracking-tight">Curated Portfolios</h3>
            <p className="text-white/30 max-w-xl mx-auto font-light">Select from our range of elite investment vehicles designed for consistent performance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {categories.map((cat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card overflow-hidden group hover:border-primary/40 transition-all duration-500"
              >
                <div className={cn("h-40 flex flex-col items-center justify-center bg-gradient-to-br border-b border-white/[0.05]", cat.color)}>
                  <h4 className="text-3xl font-black text-white tracking-tighter uppercase">{cat.name}</h4>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2 font-bold">{cat.profit} Returns</p>
                </div>
                <div className="p-10 space-y-8">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">Entry Capital</span>
                    <span className="text-2xl font-black text-primary tracking-tighter">{cat.range}</span>
                  </div>
                  <div className="space-y-4">
                    {cat.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-4 text-sm text-white/50 font-light">
                        <CheckCircle2 size={18} className="text-primary shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <button onClick={onRegister} className="w-full py-5 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] transition-all font-black uppercase text-[10px] tracking-[0.2em] text-white/60">
                    View Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-32 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h3 className="text-5xl font-black uppercase tracking-tight">Intelligence</h3>
            <p className="text-white/30 font-light">Essential information for the sophisticated investor.</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card overflow-hidden border border-white/[0.03]"
              >
                <button 
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-8 text-left flex items-center justify-between hover:bg-white/[0.02] transition-all group"
                >
                  <span className="font-bold text-xl text-white/80 group-hover:text-white transition-colors">{faq.q}</span>
                  <ChevronRight className={cn("transition-all text-white/20", activeFaq === idx ? "rotate-90 text-primary" : "")} />
                </button>
                {activeFaq === idx && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="p-8 pt-0 text-white/40 font-light leading-relaxed border-t border-white/[0.03]"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-6 border-t border-white/[0.05] bg-background">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="space-y-8">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={handleTap}>
              <TrendingUp className="text-primary group-hover:scale-110 transition-transform" size={32} />
              <h1 className="text-2xl font-black text-secondary tracking-[0.2em] uppercase luxury-gradient-text">MOBESTOCKS</h1>
            </div>
            <p className="text-white/30 text-sm font-light leading-relaxed">
              The premier destination for digital asset growth. We provide the tools and security required for elite capital management.
            </p>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-8">Navigation</h5>
            <ul className="space-y-5 text-sm text-white/40 font-light">
              <li><a href="#home" className="hover:text-primary transition-all">Home</a></li>
              <li><a href="#plans" className="hover:text-primary transition-all">Portfolios</a></li>
              <li><a href="#faq" className="hover:text-primary transition-all">Intelligence</a></li>
              <li><button onClick={onLogin} className="hover:text-primary transition-all">Vault Login</button></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-8">Compliance</h5>
            <ul className="space-y-5 text-sm text-white/40 font-light">
              <li><a href="#" className="hover:text-primary transition-all">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Privacy Protocol</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Risk Disclosure</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-8">Concierge</h5>
            <div className="flex items-center gap-4 text-sm text-white/40 font-light mb-6">
              <MessageSquare size={20} className="text-primary" />
              <span>support@mobestocks.com</span>
            </div>
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">24/7 Priority Support</p>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-32 pt-10 border-t border-white/[0.03] text-center text-white/10 text-[10px] font-black uppercase tracking-[0.4em]">
          © 2026 MOBESTOCKS. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;
