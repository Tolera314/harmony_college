'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

interface DHLogoutModalProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; }

export const DHLogoutModal: React.FC<DHLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <ConfirmModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Sign Out"
    message="You'll be signed out of the Harmony College Department Head Portal. Any unsaved changes will be lost."
    icon={<LogOut className="w-6 h-6" />}
    variant="danger"
    confirmLabel="Sign Out"
  />
);
