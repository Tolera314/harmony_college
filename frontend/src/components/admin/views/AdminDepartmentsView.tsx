'use client';

import React from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Building2, Users, DollarSign } from 'lucide-react';
import { departments } from '../../../data/hrData';
import { employees } from '../../../data/hrData';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';

export const AdminDepartmentsView: React.FC = () => (
  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
    <DHPageHeader title="Departments" subtitle={`${departments.length} departments`} icon={<Building2 className="w-5 h-5" />} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {departments.map(dept => {
        const staff = employees.filter(e => e.departmentId === dept.id && e.status === 'Active');
        const head = employees.find(e => e.id === dept.headId);
        return (
          <Card key={dept.id} hoverable className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <Badge variant="emerald" className="text-[10px]">Active</Badge>
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-(--text-primary) leading-snug">{dept.name}</h3>
              {head && <p className="font-sans text-xs text-(--text-muted) mt-1">Head: {head.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-sans">
              <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <div className="flex items-center gap-1.5 text-(--text-faint) mb-1"><Users className="w-3 h-3" /><span className="font-mono text-[10px] uppercase">Staff</span></div>
                <p className="font-mono font-bold text-(--text-primary)">{staff.length}</p>
              </div>
              <div className="p-2.5 bg-(--hover-overlay) rounded-xl border border-(--border-subtle)">
                <div className="flex items-center gap-1.5 text-(--text-faint) mb-1"><DollarSign className="w-3 h-3" /><span className="font-mono text-[10px] uppercase">Budget</span></div>
                <p className="font-mono font-bold text-(--brand-gold)">ETB {(dept.budget / 1_000_000).toFixed(1)}M</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  </motion.div>
);
