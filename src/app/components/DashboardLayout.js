"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function DashboardLayout({ children }) {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        initializeProvider();
        setupEventListeners();
    }, []);

    const initializeProvider = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(web3Provider);
                
                // Check if already connected
                await checkConnection();
            } catch (error) {
                console.error("Provider initialization error:", error);
            }
        }
    };

    const setupEventListeners = () => {
        if (typeof window.ethereum !== "undefined") {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
            window.ethereum.on('disconnect', handleDisconnect);
        }
    };

    const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
            setAccount(null);
            toast.info("Wallet disconnected");
        } else if (accounts[0] !== account) {
            setAccount(accounts[0]);
            toast.info(`Account changed to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
        }
    };

    const handleChainChanged = (chainId) => {
        toast.info("Network changed");
        window.location.reload();
    };

    const handleDisconnect = () => {
        setAccount(null);
        toast.info("Wallet disconnected");
    };

    const checkConnection = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                }
            } catch (error) {
                console.error("Error checking connection:", error);
            }
        }
    };

    const connectWallet = async () => {
        if (typeof window.ethereum === "undefined") {
            toast.error("MetaMask not detected. Please install MetaMask!");
            return;
        }

        if (!provider) {
            toast.error("Provider not initialized");
            return;
        }

        setIsConnecting(true);

        try {
            if (!account) {
                // Connect wallet
                await window.ethereum.request({ method: "eth_requestAccounts" });
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                setAccount(address);
                toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
            } else {
                // Disconnect wallet
                setAccount(null);
                toast.success("Wallet disconnected");
            }
        } catch (error) {
            if (error.code === 4001) {
                toast.error("Connection rejected by user");
            } else {
                toast.error(`Connection error: ${error.message}`);
            }
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="bg-white shadow-lg border-b">
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">E</span>
                            </div>
                            <span className="text-gray-800 text-xl font-bold">ERI Protocol</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link href="/manufacturer" className="text-gray-600 hover:text-blue-600 transition-colors">
                                Manufacturer
                            </Link>
                            <Link href="/user" className="text-gray-600 hover:text-blue-600 transition-colors">
                                User
                            </Link>
                            <Link href="/#features" className="text-gray-600 hover:text-blue-600 transition-colors">
                                Features
                            </Link>
                            <Link href="/#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">
                                How It Works
                            </Link>
                        </div>

                        {/* Wallet Connection */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={connectWallet}
                                disabled={isConnecting}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    account
                                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                                        : "bg-blue-500 text-white hover:bg-blue-600"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isConnecting ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                        Connecting...
                                    </div>
                                ) : account ? (
                                    `${account.slice(0, 6)}...${account.slice(-4)}`
                                ) : (
                                    "Connect Wallet"
                                )}
                            </button>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    {isMenuOpen && (
                        <div className="md:hidden py-4 border-t">
                            <div className="flex flex-col space-y-2">
                                <Link href="/manufacturer" className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                                    Manufacturer
                                </Link>
                                <Link href="/user" className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                                    User
                                </Link>
                                <Link href="/#features" className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                                    Features
                                </Link>
                                <Link href="/#how-it-works" className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                                    How It Works
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main>
                {children}
            </main>

            {/* Toast Container */}
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
            />
        </div>
    );
}