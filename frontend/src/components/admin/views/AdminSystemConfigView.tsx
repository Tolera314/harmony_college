'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings2, Save, CheckCircle2 } from 'lucide-react';
import { gateways } from '../../../data/adminData2';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export const AdminSystemConfigView: React.FC = () => {
  const [activeSection, setActiveSection] = useState('institution');
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const sections = [
    { id: 'institution', label: 'Institution Info' },
    { id: 'academic', label: 'Academic Calendar' },
    { id: 'gateways', label: 'Payment Gateways' },
    { id: 'notifications', label: 'Notification Templates' },
    { id: 'storage', label: 'Storage & Limits' },
    { id: 'localization', label: 'Localization' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader title="System Configuration" subtitle="Global institution settings" icon={<Settings2 className="w-5 h-5" />} />
      {saved && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-2xl font-sans text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Configuration saved.
        </motion.div>
      )}
      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-52 shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center px-3.5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all text-left ${activeSection === s.id ? 'bg-[#E9C349]/12 text-[#E9C349] border border-[#E9C349]/20' : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'}`}>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0">
          {activeSection === 'institution' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-white border-b border-white/10 pb-4">Institution Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Institution Name" defaultValue="Harmony College" />
                <Input label="Short Name / Acronym" defaultValue="HC" />
                <Input label="Official Email" type="email" defaultValue="info@harmony.edu" />
                <Input label="Official Phone" defaultValue="+251 (0)11 234 5678" />
                <Input label="Website" defaultValue="https://harmony.edu.et" />
                <Input label="Address" defaultValue="Burayu, Addis Ababa, Ethiopia" />
              </div>
              <div className="flex justify-end"><Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSave}>Save Changes</Button></div>
            </Card>
          )}

          {activeSection === 'academic' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-white border-b border-white/10 pb-4">Academic Calendar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Current Academic Year" defaultValue="2024–2025" />
                <Input label="Current Semester" defaultValue="Fall 2024" />
                <Input label="Semester Start" type="date" defaultValue="2024-09-01" />
                <Input label="Semester End" type="date" defaultValue="2025-01-15" />
              </div>
              <div className="flex justify-end"><Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSave}>Save</Button></div>
            </Card>
          )}

          {activeSection === 'gateways' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-white border-b border-white/10 pb-4">Payment Gateways</h3>
              <div className="space-y-3">
                {gateways.map(gw => (
                  <div key={gw.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${gw.connected && gw.enabled ? 'bg-emerald-400' : 'bg-white/20'}`} />
                      <div>
                        <p className="font-sans text-sm font-semibold text-white">{gw.name}</p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                          <span>{gw.transactionCount} transactions</span>
                          <span>·</span>
                          <span>Webhook: <span className={gw.webhookStatus === 'Active' ? 'text-emerald-400' : 'text-amber-400'}>{gw.webhookStatus}</span></span>
                          <span>·</span>
                          <span>Tested: {gw.lastTested}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={gw.enabled ? 'emerald' : 'glass'}>{gw.enabled ? 'Enabled' : 'Disabled'}</Badge>
                      <Button variant="ghost" size="sm">Configure</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'storage' && (
            <Card hoverable={false} className="space-y-5">
              <h3 className="font-serif text-xl font-bold text-white border-b border-white/10 pb-4">Storage & File Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Max File Upload Size (MB)" type="number" defaultValue="50" />
                <Input label="Total Storage Limit (GB)" type="number" defaultValue="100" />
                <Input label="Student Document Retention (years)" type="number" defaultValue="7" />
                <Input label="Audit Log Retention (years)" type="number" defaultValue="5" />
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/8">
                <div className="flex justify-between mb-2 text-xs font-mono text-white/50">
                  <span>Storage Used</span><span className="text-amber-400">89.0 GB / 100 GB</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '89%' }} />
                </div>
              </div>
              <div className="flex justify-end"><Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSave}>Save</Button></div>
            </Card>
          )}

          {(activeSection === 'notifications' || activeSection === 'localization') && (
            <Card hoverable={false} className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-white border-b border-white/10 pb-4 capitalize">{sections.find(s => s.id === activeSection)?.label}</h3>
              <p className="font-sans text-sm text-white/50">Configuration options for this section will be available in a future release.</p>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};
