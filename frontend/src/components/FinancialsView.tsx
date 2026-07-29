import React, { useState } from 'react';
import { FinancialTransaction, StudentProfile } from '../types';
import {
  CreditCard,
  CheckCircle2,
  Receipt,
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { SlidePanel } from './ui/SlidePanel';
import { Input } from './ui/Input';
import { Table, Column } from './ui/Table';

interface FinancialsViewProps {
  profile: StudentProfile;
  transactions: FinancialTransaction[];
}

export const FinancialsView: React.FC<FinancialsViewProps> = ({ profile, transactions }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('500.00');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentSuccess(true);
    setTimeout(() => {
      setPaymentSuccess(false);
      setShowPaymentModal(false);
    }, 2500);
  };

  const columns: Column<FinancialTransaction>[] = [
    {
      header: 'Date',
      cell: (tx) => <span className="font-mono" style={{ color: "var(--text-faint)" }}>{tx.date}</span>
    },
    {
      header: 'Description',
      cell: (tx) => <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{tx.description}</span>
    },
    {
      header: 'Category',
      cell: (tx) => <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{tx.category}</span>
    },
    {
      header: 'Amount',
      cell: (tx) => (
        <span className={`font-mono font-bold`} style={{ color: tx.amount < 0 ? "var(--status-success)" : "var(--text-primary)" }}>
          {tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
        </span>
      ),
      align: 'right'
    },
    {
      header: 'Receipt',
      cell: (tx) => (
        <button className="px-3 py-1 rounded-lg text-[11px] font-mono inline-flex items-center gap-1 transition-colors" style={{ backgroundColor: "var(--hover-overlay)", color: "var(--brand-gold)" }}>
          <Receipt className="w-3.5 h-3.5" />
          {tx.receiptId}
        </button>
      ),
      align: 'center'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable={false} className="space-y-3">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: "var(--text-faint)" }}>
            Current Account Balance
          </p>
          <h3 className="font-serif text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
            ${profile.accountBalance.toFixed(2)}
          </h3>
          <div className="flex items-center gap-2 text-xs font-mono font-bold" style={{ color: "var(--status-success)" }}>
            <CheckCircle2 className="w-4 h-4" />
            <span>Fully Cleared for {profile.clearedTerm}</span>
          </div>
        </Card>

        <Card hoverable={false} className="space-y-3">
          <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: "var(--text-faint)" }}>
            Active Financial Aid & Grants
          </p>
          <h3 className="font-serif text-3xl font-bold" style={{ color: "var(--brand-gold)" }}>
            $20,350.00
          </h3>
          <p className="font-sans text-xs" style={{ color: "var(--text-secondary)" }}>  Dean's Merit Scholarship ($15,000) + CS Dept Grant ($5,350)
          </p>
        </Card>

        <Card hoverable={false} className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-xs uppercase font-bold tracking-wider" style={{ color: "var(--text-faint)" }}>
              Tuition Prepayment
            </p>
            <p className="font-sans text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
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
        <h3 className="font-serif text-2xl font-bold" style={{ color: "var(--text-primary)" }}>  Fall 2024 Term Fee Statement Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
          <div className="space-y-3 p-5 rounded-2xl border" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-default)" }}>
            <h4 className="font-bold text-sm border-b pb-2.5" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
              Assessed Tuition & Campus Fees
            </h4>
            <div className="flex justify-between py-1" style={{ color: "var(--text-secondary)" }}>
              <span>Full-Time Undergraduate Tuition (12-18 cr)</span>
              <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>$18,500.00</span>
            </div>
            <div className="flex justify-between py-1" style={{ color: "var(--text-secondary)" }}>
              <span>Student Health & Campus Insurance Fee</span>
              <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>$1,200.00</span>
            </div>
            <div className="flex justify-between py-1" style={{ color: "var(--text-secondary)" }}>
              <span>Technology & CS Infrastructure Fee</span>
              <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>$650.00</span>
            </div>
            <div className="flex justify-between pt-3 border-t font-bold text-sm" style={{ color: "var(--text-primary)", borderColor: "var(--border-default)" }}>
              <span>Total Assessed Charges</span>
              <span className="font-mono">$20,350.00</span>
            </div>
          </div>

          <div className="space-y-3 p-5 rounded-2xl border" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-default)" }}>
            <h4 className="font-bold text-sm border-b pb-2.5" style={{ color: "var(--status-success)", borderColor: "var(--border-default)" }}>
              Applied Credits & Financial Aid
            </h4>
            <div className="flex justify-between py-1" style={{ color: "var(--text-secondary)" }}>
              <span>Dean's Merit Scholarship</span>
              <span className="font-mono font-semibold" style={{ color: "var(--status-success)" }}>-$15,000.00</span>
            </div>
            <div className="flex justify-between py-1" style={{ color: "var(--text-secondary)" }}>
              <span>CS Departmental Research Grant</span>
              <span className="font-mono font-semibold" style={{ color: "var(--status-success)" }}>-$5,350.00</span>
            </div>
            <div className="flex justify-between pt-3 border-t font-bold text-sm" style={{ borderColor: "var(--border-default)" }}>
              <span>Total Applied Aid</span>
              <span className="font-mono" style={{ color: "var(--status-success)" }}>-$20,350.00</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction Ledger */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-2xl font-bold" style={{ color: "var(--text-primary)" }}>  Billing & Payment Ledger
          </h3>
          <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>  {transactions.length} Transactions
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
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{tx.description}</span>
                <span className={`font-mono font-bold`} style={{ color: tx.amount < 0 ? "var(--status-success)" : "var(--text-primary)" }}>
                  {tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `$${tx.amount.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
                <span>{tx.date}</span>
                <span>{tx.category}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment — SlidePanel */}
      <SlidePanel
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: "var(--brand-gold)" }} />
            <span>Secure Online Payment</span>
          </div>
        }
        subtitle="Financials & Tuition"
        width="max-w-md"
      >
        {paymentSuccess ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto animate-bounce" style={{ color: "var(--status-success)" }} />
            <h4 className="font-serif text-2xl font-bold" style={{ color: "var(--text-primary)" }}>  Payment Processed!
            </h4>
            <p className="font-sans text-xs" style={{ color: "var(--text-secondary)" }}>  Receipt sent to {profile.email}. Balance updated instantly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleProcessPayment} className="space-y-4 text-xs font-sans">
            <Input
              label="Payment Amount ($)"
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
            />
            <Input
              label="Cardholder Name"
              type="text"
              defaultValue={profile.name}
              required
            />
            <Input
              label="Card Number"
              type="text"
              placeholder="•••• •••• •••• 4821"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Expiry"
                type="text"
                placeholder="08 / 28"
                required
              />
              <Input
                label="CVC"
                type="text"
                placeholder="892"
                required
              />
            </div>
            <Button variant="primary" type="submit" className="w-full mt-2">
              Pay ${paymentAmount} Securely
            </Button>
          </form>
        )}
      </SlidePanel>
    </motion.div>
  );
};
