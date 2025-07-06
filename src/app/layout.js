import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "./components/ErrorBoundary";
import WalletProvider from "./components/WalletProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ERI Protocol - Product Authenticity & Ownership",
  description: "Blockchain-based product authenticity verification and ownership management platform",
  keywords: "blockchain, authenticity, ownership, verification, ethereum, web3",
  authors: [{ name: "ERI Protocol Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <WalletProvider>
            {children}
            <ToastContainer 
              position="top-right" 
              autoClose={5000} 
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              toastClassName="text-sm"
            />
          </WalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}