export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  referralCode: string;
  referredBy?: string;
  balance: number;
  totalInvestment: number;
  totalProfit: number;
  totalWithdrawals: number;
  role: UserRole;
  upiId?: string;
  createdAt: any;
  isBlocked?: boolean;
  isWithdrawalBlocked?: boolean;
  suspiciousActivityScore?: number;
  winStreak?: number;
  lastActivityAt?: any;
  dailyWinnings?: number;
  lastWinDate?: string;
  isSuspicious?: boolean;
  suspiciousReason?: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  category: string;
  amount: number;
  dailyProfit?: number;
  monthlyProfit?: number;
  durationDays: number;
  description: string;
}

export interface UserInvestment {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  category: string;
  amount: number;
  dailyProfit: number;
  startDate: any;
  endDate: any;
  lastProfitUpdate: any;
  status: 'active' | 'completed';
  claimFrequency?: 'monthly' | 'yearly';
}

export interface DepositRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  utrNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  upiId: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: 'UPI' | 'Bank';
  details: {
    upiId?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'profit' | 'referral';
  amount: number;
  description: string;
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: any;
}

export interface MobeitorRoom {
  id: string;
  name: string;
  time: number;
  description: string;
  color: string;
  isDisabled?: boolean;
  activePlayers?: number;
  signalHistory?: number[];
  nextSignal?: number;
  signalQueue?: number[];
  minSignal?: number;
  maxSignal?: number;
}

export interface MobeitorBet {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  roomId: string;
  amount: number;
  multiplier: number;
  payout: number;
  status: 'win' | 'loss' | 'pending';
  timestamp: any;
  autoCashout?: number;
  completedAt?: any;
}

export interface AppSettings {
  adminUpiId: string;
  adminQrCodeUrl: string;
  adminPassword: string;
  customerServiceLink?: string;
  referralRedirectLink?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  whatsappChannelLink?: string;
  appDownloadLink?: string;
  minDeposit?: number;
  maxDeposit?: number;
  minWithdrawal?: number;
  maxWithdrawal?: number;
  suspiciousWinThreshold?: number;
}
