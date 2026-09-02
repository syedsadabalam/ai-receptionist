import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Dental Receptionist | Dashboard",
  description: "Manage your clinic with AI-powered receptionist",
};

import { ModalProvider } from "@/context/ModalContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import NewAppointmentModal from "@/components/NewAppointmentModal";
import LayoutContent from "@/components/LayoutContent";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <AuthProvider>
          <ToastProvider>
            <ModalProvider>
              <LayoutContent>{children}</LayoutContent>
              <NewAppointmentModal />
            </ModalProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
