import React, { useState } from 'react';
import { FinancialTransaction, StudentProfile } from '../types';
import {
  CreditCard, CheckCircle2, Receipt, Lock,
  Building2, Smartphone, Zap, Banknote, ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Table, Column } from './ui/Table';

type PaymentMethod = 'bank_transfer' | 'telebirr' | 'chapa' | 'cash';

interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    desc: 'Transfer directly from your bank account',
    icon: <Building2 className="w-6 h-6" />,
    color: 'text-blue-400',
  },
  {
    id: 'telebirr',
    label: 'Telebirr',
    desc: 'Pay with your Telebirr mobile wallet',
    icon: <Smartphone className="w-6 h-6" />,
    color: 'text-green-400',
    badge: 'Popular',
  },
  {
    id: 'chapa',
    label: 'Chapa',
    desc: 'Pay via Chapa payment gateway',
    icon: <Zap className="w-6 h-6" />,
    color: 'text-purple-400',
  },
  {
    id: 'cash',
    label: 'Cash',
    desc: 'Pay in person at the Finance Office',
    icon: <Banknote className="w-6 h-6" />,
    color: 'text-amber-400',
  },
];

interface FinancialsViewProps {
  profile: StudentProfile;
  transactions: FinancialTransaction[];
}

export const FinancialsView: React.FC<FinancialsViewProps> = ({ profile, transactions }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount]       = useState('500.00');
  const [paymentSuccess, setPaymentSuccess]     = useState(false);
  const [selectedMethod, setSelectedMethod]     = useState<PaymentMethod | null>(null);

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setTimeout(() => {
      setSelectedMethod(null);
      setPaymentSuccess(false);
    }, 300);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentSuccess(true);
    setTimeout(() => { handleCloseModal(); }, 2500);
  };

  const columns: Column<FinancialTransaction>[] = [
    {
      header: 'Date',
      cell: (tx) => <span className="font-mono text-white/50">{tx.date}</span>
    },
    {
      header: 'Description',
      cell: (tx) => <span className="font-semibold text-white">{tx.description}</span>
    },
    {
      header: 'Category',
      cell: (tx) => <span className="font-mono text-white/60">{tx.category}</span>
    },
    {
      header: 'Amount',
      cell: (tx) => (
        <span className={`font-mono font-bold ${tx.amount < 0 ? 'text-emerald-400' : 'text-white'}`}>
          {tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
        </span>
      ),
      align: 'right'
    },
    {
      header: 'Receipt',
      cell: (tx) => (
        <button className="px-3 py-1 bg-white/10 hover:bg-white/15 rounded-lg text-[11px] font-mono text-[#E9C349] inline-flex items-center gap-1">
          <Receipt className="w-3.5 h-3.5" />
          {tx.receiptId}
        </button>
      ),
      align: 'center'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 pb-8"
    >
      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-3">
          <p className="font-mono text-xs text-white/50 uppercase font-bold tracking-wider">
            Current Account Balance
          </p>
          <h3 className="font-serif text-4xl font-bold text-white">
            ${profile.accountBalance.toFixed(2)}
          </h3>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Fully Cleared for {profile.clearedTerm}</span>
          </div>
        </Card>

        <Card hoverable={false} className="space-y-3">
          <p className="font-mono text-xs text-white/50 uppercase font-bold tracking-wider">
            Active Financial Aid & Grants
          </p>
          <h3 className="font-serif text-3xl font-bold text-[#E9C349]">
            $20,350.00
          </h3>
          <p className="font-sans text-xs text-white/60">
            Dean's Merit Scholarship ($15,000) + CS Dept Grant ($5,350)
          </p>
        </Card>

        <Card hoverable={false} className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-xs text-white/50 uppercase font-bold tracking-wider">
              Tuition Prepayment
            </p>
            <p className="font-sans text-xs text-white/60 mt-1">
              Prepay for future Spring 2025 credits or housing deposits.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowPaymentModal(true)}
            icon={<CreditCard className="w-4 h-4" />}
            className="mt-4"
          >
            Make Online Payment
          </Button>
        </Card>
      </div>

      {/* Fall 2024 Fee Statement Breakdown */}
      <Card hoverable={false} className="space-y-5">
        <h3 className="font-serif text-2xl font-bold text-white">
          Fall 2024 Term Fee Statement Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
          <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10">
            <h4 className="font-bold text-sm text-white border-b border-white/10 pb-2.5">
              Assessed Tuition & Campus Fees
            </h4>
            <div className="flex justify-between py-1 text-white/70">
              <span>Full-Time Undergraduate Tuition (12-18 cr)</span>
              <span className="font-mono font-semibold text-white">$18,500.00</span>
            </div>
            <div className="flex justify-between py-1 text-white/70">
              <span>Student Health & Campus Insurance Fee</span>
              <span className="font-mono font-semibold text-white">$1,200.00</span>
            </div>
            <div className="flex justify-between py-1 text-white/70">
              <span>Technology & CS Infrastructure Fee</span>
              <span className="font-mono font-semibold text-white">$650.00</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-white/10 font-bold text-sm text-white">
              <span>Total Assessed Charges</span>
              <span className="font-mono">$20,350.00</span>
            </div>
          </div>

          <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10">
            <h4 className="font-bold text-sm text-emerald-400 border-b border-white/10 pb-2.5">
              Applied Credits & Financial Aid
            </h4>
            <div className="flex justify-between py-1 text-white/70">
              <span>Dean's Merit Scholarship</span>
              <span className="font-mono font-semibold text-emerald-400">-$15,000.00</span>
            </div>
            <div className="flex justify-between py-1 text-white/70">
              <span>CS Departmental Research Grant</span>
              <span className="font-mono font-semibold text-emerald-400">-$5,350.00</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-white/10 font-bold text-sm">
              <span>Total Applied Aid</span>
              <span className="font-mono text-emerald-400">-$20,350.00</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction Ledger */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-2xl font-bold text-white">
            Billing & Payment Ledger
          </h3>
          <span className="text-xs font-mono text-white/50">
            {transactions.length} Transactions
          </span>
        </div>

        <div className="hidden sm:block">
          <Table
            data={transactions}
            columns={columns}
            keyExtractor={(tx) => tx.id}
          />
        </div>

        <div className="sm:hidden space-y-3">
          {transactions.map((tx) => (
            <Card key={tx.id} hoverable={false} className="p-4 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-white">{tx.description}</span>
                <span className={`font-mono font-bold ${tx.amount < 0 ? 'text-emerald-400' : 'text-white'}`}>
                  {tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-white/50 font-mono text-[11px]">
                <span>{tx.date}</span>
                <span>{tx.category}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={handleCloseModal}
        title={
          <div className="flex items-center gap-2">
            {selectedMethod && !paymentSuccess && (
              <button
                onClick={() => setSelectedMethod(null)}
                className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors mr-1"
                aria-label="Go back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <Lock className="w-5 h-5 text-[#E9C349]" />
            <span>
              {paymentSuccess
                ? 'Payment Complete'
                : selectedMethod
                ? `Pay via ${PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.label}`
                : 'Choose Payment Method'}
            </span>
          </div>
        }
        maxWidth="max-w-md"
      >
        <AnimatePresence mode="wait">

          {/* ── Success state ─────────────────────────────────────────────── */}
          {paymentSuccess && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 space-y-3"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h4 className="font-serif text-2xl font-bold text-white">Payment Processed!</h4>
              <p className="font-sans text-xs text-white/60">
                Receipt sent to {profile.email}. Balance updated instantly.
              </p>
            </motion.div>
          )}

          {/* ── Step 1: Method selection ──────────────────────────────────── */}
          {!paymentSuccess && !selectedMethod && (
            <motion.div
              key="methods"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <p className="font-sans text-xs text-white/50 mb-1">
                Select how you would like to pay your tuition balance.
              </p>
              {PAYMENT_METHODS.map((method) => (
                <motion.button
                  key={method.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMethod(method.id)}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#E9C349]/30 rounded-2xl transition-all text-left group"
                >
                  <div className={`w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${method.color} group-hover:border-[#E9C349]/20`}>
                    {method.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-sans text-sm font-semibold text-white">{method.label}</p>
                      {method.badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#E9C349]/15 text-[#E9C349] font-mono text-[9px] font-bold border border-[#E9C349]/30">
                          {method.badge}
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-xs text-white/50 mt-0.5">{method.desc}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-white/20 group-hover:text-[#E9C349] rotate-180 transition-colors shrink-0" />
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* ── Step 2a: Bank Transfer form ───────────────────────────────── */}
          {!paymentSuccess && selectedMethod === 'bank_transfer' && (
            <motion.form
              key="bank"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleProcessPayment}
              className="space-y-4 text-xs font-sans"
            >
              <div className="p-3 bg-blue-950/30 border border-blue-800/30 rounded-xl text-xs text-blue-300 font-sans">
                Transfer to <span className="font-mono font-bold">Harmony College — CBE 1000123456789</span>.
                Use your Student ID as reference.
              </div>
              <Input label="Payment Amount (ETB)" type="number" step="0.01"
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
              <Input label="Your Bank Name" type="text" placeholder="e.g. Commercial Bank of Ethiopia" required />
              <Input label="Account Holder Name" type="text" defaultValue={profile.name} required />
              <Input label="Transfer Reference / Slip No." type="text" placeholder="e.g. TXN-2024-XXXX" required />
              <Button variant="primary" type="submit" className="w-full">
                Confirm Bank Transfer — ETB {paymentAmount}
              </Button>
            </motion.form>
          )}

          {/* ── Step 2b: Telebirr form ────────────────────────────────────── */}
          {!paymentSuccess && selectedMethod === 'telebirr' && (
            <motion.form
              key="telebirr"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleProcessPayment}
              className="space-y-4 text-xs font-sans"
            >
              <div className="p-3 bg-green-950/30 border border-green-800/30 rounded-xl text-xs text-green-300 font-sans">
                You will receive a push notification on your Telebirr-linked phone to approve the payment.
              </div>
              <Input label="Payment Amount (ETB)" type="number" step="0.01"
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
              <Input label="Telebirr Phone Number" type="tel"
                placeholder="+251 9X XXX XXXX" required />
              <Input label="Full Name on Account" type="text" defaultValue={profile.name} required />
              <Button variant="primary" type="submit" className="w-full">
                Send Telebirr Request — ETB {paymentAmount}
              </Button>
            </motion.form>
          )}

          {/* ── Step 2c: Chapa form ───────────────────────────────────────── */}
          {!paymentSuccess && selectedMethod === 'chapa' && (
            <motion.form
              key="chapa"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleProcessPayment}
              className="space-y-4 text-xs font-sans"
            >
              <div className="p-3 bg-purple-950/30 border border-purple-800/30 rounded-xl text-xs text-purple-300 font-sans">
                You will be redirected to Chapa's secure checkout page to complete your payment.
              </div>
              <Input label="Payment Amount (ETB)" type="number" step="0.01"
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
              <Input label="Email Address" type="email" defaultValue={profile.email} required />
              <Input label="Full Name" type="text" defaultValue={profile.name} required />
              <Button variant="primary" type="submit" className="w-full">
                Proceed to Chapa — ETB {paymentAmount}
              </Button>
            </motion.form>
          )}

          {/* ── Step 2d: Cash instructions ───────────────────────────────── */}
          {!paymentSuccess && selectedMethod === 'cash' && (
            <motion.div
              key="cash"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-xs font-sans"
            >
              <div className="p-4 bg-amber-950/30 border border-amber-800/30 rounded-2xl space-y-3">
                <p className="font-sans text-sm font-bold text-amber-300">Finance Office — Cash Payment</p>
                <div className="space-y-2 text-white/70">
                  {[
                    ['Location', 'Admin Building, Room 105'],
                    ['Hours',    'Mon–Fri, 8:00 AM – 5:00 PM'],
                    ['Bring',    `Your Student ID: ${profile.id}`],
                    ['Contact',  'finance@harmony.edu'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <span className="font-mono text-white/40 w-16 shrink-0">{label}</span>
                      <span className="font-sans text-white/80">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Input label="Intended Payment Amount (ETB)" type="number" step="0.01"
                  value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                <p className="text-white/40 text-[11px]">
                  Note: Enter the amount you plan to bring. This does not reserve or confirm a payment.
                </p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => {
                setPaymentSuccess(true);
                setTimeout(() => handleCloseModal(), 2500);
              }}>
                I Understand — I Will Pay in Person
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </Modal>
    </motion.div>
  );
};
