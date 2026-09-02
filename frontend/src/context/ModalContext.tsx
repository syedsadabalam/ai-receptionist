"use client";

import React, { createContext, useContext, useState } from 'react';

type ModalContextType = {
  isNewAppointmentModalOpen: boolean;
  openNewAppointmentModal: () => void;
  closeNewAppointmentModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);

  const openNewAppointmentModal = () => setIsNewAppointmentModalOpen(true);
  const closeNewAppointmentModal = () => setIsNewAppointmentModalOpen(false);

  return (
    <ModalContext.Provider value={{ isNewAppointmentModalOpen, openNewAppointmentModal, closeNewAppointmentModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
