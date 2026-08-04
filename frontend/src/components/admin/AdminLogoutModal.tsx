'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

interface AdminLogoutModalProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; }

export const AdminLogoutModal: React.FC<AdminLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <ConfirmModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Sign Out"
    message="You'll be signed out of the Harmony College Super Admin Portal."
    icon={<LogOut className="w-6 h-6" />}
    variant="danger"
    confirmLabel="Sign Out"
    warning="All active sessions and any role override will be terminated."
  />
);
