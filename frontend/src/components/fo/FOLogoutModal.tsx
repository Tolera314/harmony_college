'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

interface FOLogoutModalProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; }

export const FOLogoutModal: React.FC<FOLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <ConfirmModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Sign Out"
    message="You're about to sign out of the Harmony College Finance Portal."
    icon={<LogOut className="w-6 h-6" />}
    variant="danger"
    confirmLabel="Sign Out"
    warning="Any unsaved changes or open payment forms will be discarded."
  />
);
