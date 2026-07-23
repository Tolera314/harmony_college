'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, ShieldAlert, CheckCircle, Save, Info, 
  HelpCircle, Settings, Plus, Trash2, Power
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const RegistrationSettings: React.FC = () => {
  const [dates, setDates] = useState({
    openDate: '2026-08-01',
    closeDate: '2026-08-20',
    addDeadline: '2026-08-05',
    dropDeadline: '2026-08-12',
    lateFeeDate: '2026-08-25'
  });

  const [toggles, setToggles] = useState({
    lateRegistration: true,
    waitlistEnable: true,
    autoPromotion: true,
    seatAvailability: true,
    advisorApproval: false,
    gpaCapCheck: true
  });

  const [rules, setRules] = useState([
    { id: 'r1', name: 'Credit Hour Cap', desc: 'Maximum allowed credits for regular semester is 18.', enabled: true },
    { id: 'r2', name: 'GPA Honor Overload', desc: 'Students with CGPA >= 3.50 can register for up to 21 credits.', enabled: true },
    { id: 'r3', name: 'Prerequisite Verification', desc: 'Verify all course prerequisite trees before final course checkout.', enabled: true },
    { id: 'r4', name: 'Financial Clearance Block', desc: 'Block course registration if outstanding student tuition balance is > 0.', enabled: true },
    { id: 'r5', name: 'Probation Credit Limiter', desc: 'Limit probation students to a maximum of 12 credit hours.', enabled: false }
  ]);

  const [newRule, setNewRule] = useState({ name: '', desc: '' });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRuleToggle = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name) return;

    setRules(prev => [
      ...prev,
      { id: 'r' + (prev.length + 1), name: newRule.name, desc: newRule.desc || 'No description provided.', enabled: true }
    ]);
    setNewRule({ name: '', desc: '' });
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveSettings = () => {
    alert('Settings Saved Successfully!\nAcademic registration engine re-initialized with updated rules.');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Registration Settings</h2>
          <p className="text-xs text-white/50">Manage semester enrollment windows, waitlist structures, and compliance rules.</p>
        </div>
        <Button 
          variant="gold" 
          size="sm" 
          onClick={handleSaveSettings}
          className="flex items-center gap-1.5 py-2 font-semibold text-xs"
        >
          <Save className="w-4 h-4" /> Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Periods & Toggles (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Registration Period Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4AF37]" /> Registration Windows
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-white/40 uppercase">Open Date</label>
                <input
                  type="date"
                  value={dates.openDate}
                  onChange={(e) => setDates(prev => ({ ...prev, openDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-white/40 uppercase">Close Date</label>
                <input
                  type="date"
                  value={dates.closeDate}
                  onChange={(e) => setDates(prev => ({ ...prev, closeDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-white/40 uppercase">Add Course Deadline</label>
                <input
                  type="date"
                  value={dates.addDeadline}
                  onChange={(e) => setDates(prev => ({ ...prev, addDeadline: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-white/40 uppercase">Drop Course Deadline</label>
                <input
                  type="date"
                  value={dates.dropDeadline}
                  onChange={(e) => setDates(prev => ({ ...prev, dropDeadline: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-white/8 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          {/* Feature Switches */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#D4AF37]" /> Enrollment Feature Switches
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'lateRegistration', label: 'Late Registration Period', desc: 'Allows students to register after the Close date.' },
                { key: 'waitlistEnable', label: 'Waitlist Functionality', desc: 'Enables waitlists when sections hit capacity.' },
                { key: 'autoPromotion', label: 'Automatic Waitlist Promotion', desc: 'Automatically fills dropped seats from waitlists.' },
                { key: 'seatAvailability', label: 'Live Seat Availability Info', desc: 'Displays live capacity statistics to students.' },
                { key: 'advisorApproval', label: 'Advisor Sign-off Required', desc: 'Blocks checks until academic advisors sign off.' },
                { key: 'gpaCapCheck', label: 'GPA Overload Rule Engine', desc: 'Applies dynamic credit cap overrides based on GPA.' }
              ].map((sw) => (
                <div 
                  key={sw.key} 
                  className="p-4 bg-black/20 border border-white/5 rounded-xl flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">{sw.label}</p>
                    <p className="text-[10px] text-white/40 leading-relaxed">{sw.desc}</p>
                  </div>
                  
                  {/* Slider Toggle */}
                  <button
                    onClick={() => handleToggle(sw.key as any)}
                    className={`w-9 h-5 rounded-full shrink-0 relative transition-colors duration-200 focus:outline-none ${
                      toggles[sw.key as keyof typeof toggles] ? 'bg-[#D4AF37]' : 'bg-white/10'
                    }`}
                  >
                    <span 
                      className={`block w-4 h-4 rounded-full bg-[#0F0F10] shadow absolute top-0.5 transition-transform duration-200 ${
                        toggles[sw.key as keyof typeof toggles] ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Registration Rules Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Rules List */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h3 className="font-serif text-lg font-bold text-white">Curriculum Verification Rules</h3>
            <p className="text-[11px] text-white/40">Enable or disable compliance checks inside the registration portal.</p>

            <div className="space-y-3">
              {rules.map((rule) => (
                <div 
                  key={rule.id}
                  className={`p-3.5 border rounded-xl flex items-start gap-3 transition-colors ${
                    rule.enabled 
                      ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20' 
                      : 'bg-white/[0.02] border-white/5 opacity-55'
                  }`}
                >
                  {/* Toggle Indicator Button */}
                  <button 
                    onClick={() => handleRuleToggle(rule.id)}
                    className={`p-1 rounded-lg border transition-colors ${
                      rule.enabled 
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]' 
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white">{rule.name}</p>
                      <button 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-white/30 hover:text-red-400 transition-colors"
                        title="Remove Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Rule Form */}
            <form onSubmit={handleAddRule} className="border-t border-white/5 pt-4 space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-white/40">Add Registration Rule</h4>
              
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Rule Identifier (e.g. Min Credit Cap)"
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                />
                <input
                  type="text"
                  placeholder="Rule Description / constraints details..."
                  value={newRule.desc}
                  onChange={(e) => setNewRule(prev => ({ ...prev, desc: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <Button 
                variant="secondary" 
                size="sm" 
                type="submit"
                className="w-full py-2.5 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Rule
              </Button>
            </form>
          </div>

          <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex gap-3 text-xs leading-relaxed text-yellow-300">
            <Info className="w-4 h-4 shrink-0 text-[#D4AF37]" />
            <div>
              <strong>Rule Modification Alert:</strong> Disabling standard verification rules (e.g. prerequisite trees) takes effect immediately and affects ongoing checkouts. Verify with deans before applying changes.
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
