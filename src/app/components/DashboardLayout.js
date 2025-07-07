"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import { toast } from "react-toastify";

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
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-xl">E</span>
                            </div>
                            <span className="text-gray-900 text-xl font-bold">ERI Protocol</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link href="/manufacturer" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                                Manufacturer
                            </Link>
                            <Link href="/user" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                                User
                            </Link>
                            <Link href="/#features" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                                Features
                            </Link>
                            <Link href="/#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                                How It Works
                            </Link>
                        </div>

                        {/* Wallet Connection */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={connectWallet}
                                disabled={isConnecting}
                                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                                    account
                                        ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                                        : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                            >
                                {isConnecting ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                        Connecting...
                                    </div>
                                ) : account ? (
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                        {`${account.slice(0, 6)}...${account.slice(-4)}`}
                                    </div>
                                ) : (
                                    "Connect Wallet"
                                )}
                            </button>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    {isMenuOpen && (
                        <div className="md:hidden py-4 border-t border-gray-200">
                            <div className="flex flex-col space-y-2">
                                <Link href="/manufacturer" className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                                    🏭 Manufacturer
                                </Link>
                                <Link href="/user" className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                                    👤 User
                                </Link>
                                <Link href="/#features" className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                                    ✨ Features
                                </Link>
                                <Link href="/#how-it-works" className="px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                                    🚀 How It Works
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
        </div>
    );
}