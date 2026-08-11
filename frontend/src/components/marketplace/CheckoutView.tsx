'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, CheckCircle2, ArrowRight, Tag, CreditCard, Smartphone, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { MarketplaceEmptyState } from './MarketplaceShared';
import { useMarketplace } from '@/src/context/MarketplaceContext';

const PAYMENT_METHODS = [
  { id: 'chapa',    label: 'Chapa',                       icon: '🟢', desc: 'Pay with Chapa — Ethiopia\'s leading payment gateway' },
  { id: 'telebirr', label: 'telebirr',                    icon: '📱', desc: 'Pay via Ethio Telecom\'s mobile money service' },
  { id: 'cbe',      label: 'Commercial Bank of Ethiopia', icon: '🏦', desc: 'Bank transfer via CBE internet banking or branch' },
  { id: 'transfer', label: 'Bank Transfer',               icon: '💳', desc: 'Transfer to Harmony College\'s bank account directly' },
];

export function CheckoutView() {
  const { state, removeFromCart, checkout, navigate } = useMarketplace();
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [payMethod, setPayMethod] = useState('chapa');
  const [processing, setProcessing] = useState(false);

  const subtotal = state.cart.reduce((s, c) => s + c.price, 0);
  const discount = couponApplied ? Math.floor(subtotal * 0.1) : 0;
  const total = subtotal - discount;

  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === 'HARMONY10') setCouponApplied(true);
  };

  const handleCheckout = async () => {
    if (!state.cart.length) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1800));
    checkout(payMethod);
    setProcessing(false);
  };

  if (!state.cart.length) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-3xl">
        <h1 className="font-serif text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Your Cart</h1>
        <MarketplaceEmptyState icon={ShoppingCart} title="Your cart is empty"
          description="Browse the marketplace and add items to your cart."
          action={{ label: 'Browse Resources', onClick: () => navigate('home') }} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('home')} className="flex items-center gap-2 text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Checkout</h1>
        <Badge variant="glass">{state.cart.length} item{state.cart.length > 1 ? 's' : ''}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Cart items + payment */}
        <div className="lg:col-span-3 space-y-6">
          {/* Items */}
          <div className="space-y-3">
            <AnimatePresence>
              {state.cart.map(item => (
                <motion.div key={item.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10, height: 0 }}
                  className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: 'var(--brand-gold)' }}>{item.type}</p>
                    <p className="text-sm font-semibold font-sans line-clamp-1" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-sm font-bold" style={{ color: item.price === 0 ? 'var(--status-success)' : 'var(--brand-gold)' }}>
                      {item.price === 0 ? 'FREE' : `ETB ${item.price.toLocaleString()}`}
                    </span>
                    <button onClick={() => removeFromCart(item.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--status-danger)' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Coupon */}
          <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <p className="text-xs font-semibold font-sans flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Tag className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
              Coupon Code
            </p>
            <div className="flex gap-2">
              <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="e.g. HARMONY10"
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: couponApplied ? 'var(--status-success-border)' : 'var(--border-default)', color: 'var(--text-primary)' }} />
              <Button variant={couponApplied ? 'secondary' : 'outline'} size="sm" onClick={handleApplyCoupon} disabled={couponApplied}>
                {couponApplied ? '✓ Applied' : 'Apply'}
              </Button>
            </div>
            {!couponApplied && <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>Try: HARMONY10 for 10% off</p>}
          </div>

          {/* Payment method */}
          <div className="space-y-3">
            <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>Payment Method</p>
            {PAYMENT_METHODS.map(pm => (
              <label key={pm.id} className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
                style={{ backgroundColor: payMethod === pm.id ? 'var(--accent-gold-subtle)' : 'var(--bg-card)', border: `1px solid ${payMethod === pm.id ? 'var(--accent-gold-border)' : 'var(--border-card)'}` }}>
                <input type="radio" name="payment" value={pm.id} checked={payMethod === pm.id}
                  onChange={() => setPayMethod(pm.id)} className="sr-only" />
                <span className="text-2xl">{pm.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{pm.label}</p>
                  <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>{pm.desc}</p>
                </div>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: payMethod === pm.id ? 'var(--brand-gold)' : 'var(--border-strong)' }}>
                  {payMethod === pm.id && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--brand-gold)' }} />}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl p-6 space-y-4 sticky top-20 shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <h3 className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>Order Summary</h3>
            <div className="space-y-2.5 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex justify-between text-sm font-sans">
                <span style={{ color: 'var(--text-muted)' }}>Subtotal ({state.cart.length} items)</span>
                <span style={{ color: 'var(--text-primary)' }}>ETB {subtotal.toLocaleString()}</span>
              </div>
              {couponApplied && (
                <div className="flex justify-between text-sm font-sans">
                  <span style={{ color: 'var(--status-success)' }}>Discount (10%)</span>
                  <span style={{ color: 'var(--status-success)' }}>- ETB {discount.toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-baseline">
              <span className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>Total</span>
              <span className="font-mono text-xl font-black" style={{ color: 'var(--brand-gold)' }}>ETB {total.toLocaleString()}</span>
            </div>
            <Button variant="gold" size="lg" className="w-full" onClick={handleCheckout} disabled={processing}
              icon={processing
                ? <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                : <ArrowRight className="w-4 h-4" />}>
              {processing ? 'Processing…' : 'Complete Purchase'}
            </Button>
            <p className="text-[11px] font-sans text-center" style={{ color: 'var(--text-faint)' }}>
              🔒 Secure mock checkout · No real payment processed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PurchaseSuccessView() {
  const { state, navigate } = useMarketplace();
  const order = state.orders[0];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
        className="w-full max-w-lg text-center space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
          className="w-24 h-24 rounded-full mx-auto flex items-center justify-center"
          style={{ backgroundColor: 'var(--status-success-bg)', border: '2px solid var(--status-success-border)' }}>
          <CheckCircle2 className="w-12 h-12" style={{ color: 'var(--status-success)' }} />
        </motion.div>

        <div>
          <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Purchase Successful!</h1>
          <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>Your resources are now available in your library.</p>
        </div>

        {order && (
          <div className="rounded-2xl p-5 text-left space-y-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-faint)' }}>Order ID</p>
              <p className="font-mono text-sm font-bold" style={{ color: 'var(--brand-gold)' }}>{order.id}</p>
            </div>
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <p className="text-xs font-sans truncate" style={{ color: 'var(--text-secondary)' }}>{item.title}</p>
                  <p className="text-xs font-mono ml-3 shrink-0" style={{ color: 'var(--text-primary)' }}>
                    {item.price === 0 ? 'FREE' : `ETB ${item.price.toLocaleString()}`}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>Total Paid</span>
              <span className="font-mono text-sm font-black" style={{ color: 'var(--brand-gold)' }}>ETB {order.total.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button variant="gold" size="lg" onClick={() => navigate('library')} icon={<ArrowRight className="w-4 h-4" />}>
            Go to My Library
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('home')}>
            Continue Browsing
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
