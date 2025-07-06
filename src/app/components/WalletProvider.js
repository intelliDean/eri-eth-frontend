"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';

const WalletContext = createContext();

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};

export default function WalletProvider({ children }) {
    const [wallet, setWallet] = useState({
        provider: null,
        signer: null,
        account: null,
        chainId: null,
        isConnected: false,
        isConnecting: false
    });

    useEffect(() => {
        initializeProvider();
        setupEventListeners();
    }, []);

    const initializeProvider = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const network = await provider.getNetwork();
                
                setWallet(prev => ({
                    ...prev,
                    provider,
                    chainId: network.chainId
                }));

                // Check if already connected
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts.length > 0) {
                    await connectWallet();
                }
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
            disconnectWallet();
        } else if (accounts[0] !== wallet.account) {
            setWallet(prev => ({ ...prev, account: accounts[0] }));
            toast.info(`Account changed to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
        }
    };

    const handleChainChanged = (chainId) => {
        setWallet(prev => ({ ...prev, chainId: parseInt(chainId, 16) }));
        toast.info("Network changed");
        window.location.reload();
    };

    const handleDisconnect = () => {
        disconnectWallet();
        toast.info("Wallet disconnected");
    };

    const connectWallet = async () => {
        if (!wallet.provider) {
            toast.error("MetaMask not detected. Please install MetaMask!");
            return false;
        }

        setWallet(prev => ({ ...prev, isConnecting: true }));

        try {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            const signer = await wallet.provider.getSigner();
            const address = await signer.getAddress();
            const network = await wallet.provider.getNetwork();

            setWallet(prev => ({
                ...prev,
                signer,
                account: address,
                chainId: network.chainId,
                isConnected: true,
                isConnecting: false
            }));

            toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
            return true;
        } catch (error) {
            console.error("Connection error:", error);
            toast.error(`Connection failed: ${error.message}`);
            setWallet(prev => ({ ...prev, isConnecting: false }));
            return false;
        }
    };

    const disconnectWallet = () => {
        setWallet(prev => ({
            ...prev,
            signer: null,
            account: null,
            isConnected: false
        }));
    };

    const switchNetwork = async (targetChainId) => {
        if (!wallet.provider) return false;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${targetChainId.toString(16)}` }],
            });
            return true;
        } catch (error) {
            console.error("Network switch error:", error);
            toast.error("Failed to switch network");
            return false;
        }
    };

    const value = {
        ...wallet,
        connectWallet,
        disconnectWallet,
        switchNetwork
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}