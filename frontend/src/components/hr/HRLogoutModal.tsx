'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

interface HRLogoutModalProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; }

export const HRLogoutModal: React.FC<HRLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <ConfirmModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Sign Out"
    message="You'll be signed out of the Harmony College HR Portal. Any unsaved changes will be lost."
    icon={<LogOut className="w-6 h-6" />}
    variant="danger"
    confirmLabel="Sign Out"
  />
);
