"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { QRCodeCanvas } from 'qrcode.react';
import { AUTHENTICITY_ABI } from '../resources/authenticity_abi';
import { OWNERSHIP_ABI } from '../resources/ownership_abi';
import { parseError } from '../resources/error';
import { getEvents } from '../resources/getEvents';

const AUTHENTICITY_CONTRACT = process.env.NEXT_PUBLIC_AUTHENTICITY || "0x0000000000000000000000000000000000000000";
const OWNERSHIP_CONTRACT = process.env.NEXT_PUBLIC_OWNERSHIP || "0x0000000000000000000000000000000000000000";

export default function UserDashboard() {
    const [wallet, setWallet] = useState({
        provider: null,
        signer: null,
        account: null,
        chainId: null
    });

    const [contracts, setContracts] = useState({
        authenticityRead: null,
        authenticityWrite: null,
        ownershipRead: null,
        ownershipWrite: null
    });

    const [ui, setUi] = useState({
        activeSection: 'overview',
        loading: false
    });

    const [user, setUser] = useState({
        username: '',
        isRegistered: false,
        registrationStatus: ''
    });

    const [myItems, setMyItems] = useState([]);

    const [verification, setVerification] = useState({
        productId: '',
        signature: '',
        result: null,
        qrScanData: ''
    });

    const [ownership, setOwnership] = useState({
        claimSignature: '',
        transferCode: '',
        transferToAddress: '',
        selectedItemId: ''
    });

    const [analytics, setAnalytics] = useState({
        totalItems: 0,
        verifiedItems: 0,
        pendingTransfers: 0
    });

    // Initialize wallet and contracts
    useEffect(() => {
        initializeWallet();
        setupEventListeners();
    }, []);

    const initializeWallet = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const network = await provider.getNetwork();
                
                setWallet(prev => ({
                    ...prev,
                    provider,
                    chainId: network.chainId
                }));

                setContracts(prev => ({
                    ...prev,
                    authenticityRead: new ethers.Contract(AUTHENTICITY_CONTRACT, AUTHENTICITY_ABI, provider),
                    ownershipRead: new ethers.Contract(OWNERSHIP_CONTRACT, OWNERSHIP_ABI, provider)
                }));

                // Check if already connected
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts.length > 0) {
                    await connectWallet();
                }
            } catch (error) {
                console.error("Wallet initialization error:", error);
                toast.error("Failed to initialize wallet");
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
            setWallet(prev => ({ ...prev, signer: null, account: null }));
            setContracts(prev => ({ ...prev, authenticityWrite: null, ownershipWrite: null }));
            toast.info("Wallet disconnected");
        } else if (accounts[0] !== wallet.account) {
            connectWallet();
        }
    };

    const handleChainChanged = (chainId) => {
        setWallet(prev => ({ ...prev, chainId: parseInt(chainId, 16) }));
        toast.info("Network changed");
        window.location.reload();
    };

    const handleDisconnect = () => {
        setWallet(prev => ({ ...prev, signer: null, account: null }));
        setContracts(prev => ({ ...prev, authenticityWrite: null, ownershipWrite: null }));
        toast.info("Wallet disconnected");
    };

    const connectWallet = async () => {
        if (typeof window.ethereum === "undefined") {
            toast.error("MetaMask not detected. Please install MetaMask!");
            return;
        }

        if (!wallet.provider) {
            toast.error("Provider not initialized");
            return;
        }

        try {
            if (!wallet.account) {
                await window.ethereum.request({ method: "eth_requestAccounts" });
                const signer = await wallet.provider.getSigner();
                const address = await signer.getAddress();

                setWallet(prev => ({
                    ...prev,
                    signer,
                    account: address
                }));

                setContracts(prev => ({
                    ...prev,
                    authenticityWrite: new ethers.Contract(AUTHENTICITY_CONTRACT, AUTHENTICITY_ABI, signer),
                    ownershipWrite: new ethers.Contract(OWNERSHIP_CONTRACT, OWNERSHIP_ABI, signer)
                }));

                // Check user registration status
                await checkUserStatus(address);
                
                // Load user's items
                await loadMyItems();

                toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
            } else {
                // Disconnect
                setWallet(prev => ({
                    ...prev,
                    signer: null,
                    account: null
                }));

                setContracts(prev => ({
                    ...prev,
                    authenticityWrite: null,
                    ownershipWrite: null
                }));

                toast.success("Wallet disconnected");
            }
        } catch (error) {
            if (error.code === 4001) {
                toast.error("Connection rejected by user");
            } else {
                console.error("Connection error:", error);
                toast.error(`Connection error: ${error.message}`);
            }
        }
    };

    const checkUserStatus = async (address) => {
        try {
            if (contracts.ownershipRead) {
                const userData = await contracts.ownershipRead.getUser(address);
                setUser(prev => ({
                    ...prev,
                    username: userData.username,
                    isRegistered: userData.isRegistered,
                    registrationStatus: userData.isRegistered ? 'Registered' : 'Not Registered'
                }));
            }
        } catch (error) {
            setUser(prev => ({
                ...prev,
                isRegistered: false,
                registrationStatus: 'Not Registered'
            }));
        }
    };

    const loadMyItems = async () => {
        try {
            if (contracts.ownershipRead && wallet.account) {
                const items = await contracts.ownershipRead.getAllMyItems();
                setMyItems(items.map(item => ({
                    itemId: item.itemId,
                    name: item.name,
                    serial: item.serial,
                    date: new Date(Number(item.date) * 1000).toLocaleString(),
                    manufacturer: item.manufacturer,
                    metadata: item.metadata.join(", ")
                })));

                setAnalytics(prev => ({
                    ...prev,
                    totalItems: items.length,
                    verifiedItems: items.length // Assuming all items are verified
                }));
            }
        } catch (error) {
            console.error("Error loading items:", error);
        }
    };

    const registerUser = async (e) => {
        e.preventDefault();
        if (!wallet.account || !contracts.ownershipWrite) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!user.username || user.username.length < 3) {
                throw new Error("Username must be at least 3 characters");
            }

            const tx = await contracts.ownershipWrite.userRegisters(user.username);
            await tx.wait();

            setUser(prev => ({
                ...prev,
                isRegistered: true,
                registrationStatus: 'Registered'
            }));

            toast.success(`User "${user.username}" registered successfully`);
        } catch (error) {
            console.error("Registration error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const claimOwnership = async (e) => {
        e.preventDefault();
        if (!wallet.account || !contracts.authenticityWrite) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!ownership.claimSignature) {
                throw new Error("Signature is required to claim ownership");
            }

            // Parse the signature data (this would come from QR code or manual input)
            const signatureData = JSON.parse(ownership.claimSignature);
            const { cert, signature } = signatureData;

            const tx = await contracts.authenticityWrite.userClaimOwnership(cert, signature);
            await tx.wait();

            toast.success(`Ownership claimed for item: ${cert.uniqueId}`);
            await loadMyItems(); // Refresh items list
            setOwnership(prev => ({ ...prev, claimSignature: '' }));
        } catch (error) {
            console.error("Claim error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const verifyProduct = async (e) => {
        e.preventDefault();
        if (!contracts.authenticityRead) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!verification.signature) {
                throw new Error("Signature is required for verification");
            }

            // Parse the signature data
            const signatureData = JSON.parse(verification.signature);
            const { cert, signature } = signatureData;

            const result = await contracts.authenticityRead.verifyAuthenticity(cert, signature);

            setVerification(prev => ({
                ...prev,
                result: {
                    isValid: result[0],
                    manufacturerName: result[1],
                    productName: cert.name,
                    uniqueId: cert.uniqueId,
                    owner: cert.owner
                }
            }));

            if (result[0]) {
                toast.success(`Product is authentic! Manufactured by: ${result[1]}`);
            } else {
                toast.error("Product authenticity verification failed");
            }
        } catch (error) {
            console.error("Verification error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const generateTransferCode = async (e) => {
        e.preventDefault();
        if (!wallet.account || !contracts.ownershipWrite) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!ownership.selectedItemId || !ownership.transferToAddress) {
                throw new Error("Item ID and transfer address are required");
            }

            if (!ethers.isAddress(ownership.transferToAddress)) {
                throw new Error("Valid transfer address required");
            }

            const tx = await contracts.ownershipWrite.generateChangeOfOwnershipCode(
                ownership.selectedItemId, 
                ownership.transferToAddress
            );

            const receipt = await tx.wait();
            const { ownershipCode } = getEvents(contracts.ownershipWrite, receipt, "OwnershipCode");

            setOwnership(prev => ({ ...prev, transferCode: ownershipCode }));
            toast.success("Transfer code generated successfully");
        } catch (error) {
            console.error("Transfer code generation error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const claimTransfer = async (e) => {
        e.preventDefault();
        if (!wallet.account || !contracts.ownershipWrite) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!ownership.transferCode) {
                throw new Error("Transfer code is required");
            }

            const tx = await contracts.ownershipWrite.newOwnerClaimOwnership(ownership.transferCode);
            await tx.wait();

            toast.success("Ownership transfer completed successfully");
            await loadMyItems(); // Refresh items list
            setOwnership(prev => ({ ...prev, transferCode: '' }));
        } catch (error) {
            console.error("Transfer claim error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const sections = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'registration', label: 'Registration', icon: '👤' },
        { id: 'my-items', label: 'My Items', icon: '📦' },
        { id: 'claim-ownership', label: 'Claim Ownership', icon: '🔒' },
        { id: 'verify-product', label: 'Verify Product', icon: '✅' },
        { id: 'transfer-ownership', label: 'Transfer Ownership', icon: '🔄' }
    ];

    const StatCard = ({ title, value, icon, color = 'blue' }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm font-medium">{title}</p>
                    <p className={`text-3xl font-bold text-${color}-600 mt-2`}>{value}</p>
                </div>
                <div className={`text-4xl opacity-80`}>{icon}</div>
            </div>
        </div>
    );

    const FormSection = ({ title, children, icon }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <span className="mr-3 text-2xl">{icon}</span>
                    {title}
                </h2>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );

    const Input = ({ placeholder, value, onChange, type = 'text', required = false }) => (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e)}
            required={required}
            className="w-full p-4 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 focus:bg-white"
        />
    );

    const TextArea = ({ placeholder, value, onChange, rows = 4 }) => (
        <textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e)}
            rows={rows}
            className="w-full p-4 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 focus:bg-white"
        />
    );

    const Button = ({ onClick, children, variant = 'primary', disabled = false, type = 'button' }) => {
        const baseClasses = "w-full py-4 px-6 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
        const variants = {
            primary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl",
            secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300",
            success: "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl",
            danger: "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl"
        };

        return (
            <button
                type={type}
                onClick={onClick}
                disabled={disabled || ui.loading}
                className={`${baseClasses} ${variants[variant]}`}
            >
                {ui.loading ? (
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                    </div>
                ) : children}
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">User Dashboard</h1>
                            <p className="text-gray-600 mt-1">Verify products and manage your digital ownership</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                                user.isRegistered 
                                    ? 'bg-green-100 text-green-800 border border-green-200' 
                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}>
                                <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${
                                        user.isRegistered ? 'bg-green-500' : 'bg-yellow-500'
                                    }`}></div>
                                    {user.registrationStatus}
                                </div>
                            </div>
                            <button
                                onClick={connectWallet}
                                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                                    wallet.account
                                        ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                                        : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                                }`}
                            >
                                {wallet.account ? (
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                        {`${wallet.account.slice(0, 6)}...${wallet.account.slice(-4)}`}
                                    </div>
                                ) : "Connect Wallet"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="container mx-auto px-6">
                    <div className="flex space-x-1 overflow-x-auto">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setUi(prev => ({ ...prev, activeSection: section.id }))}
                                className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-all duration-300 whitespace-nowrap ${
                                    ui.activeSection === section.id
                                        ? "border-blue-500 text-blue-600 bg-blue-50"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                <span className="text-lg">{section.icon}</span>
                                <span>{section.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto p-6">
                {ui.activeSection === 'overview' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard title="My Items" value={analytics.totalItems} icon="📦" color="blue" />
                            <StatCard title="Verified Items" value={analytics.verifiedItems} icon="✅" color="green" />
                            <StatCard title="Pending Transfers" value={analytics.pendingTransfers} icon="🔄" color="orange" />
                        </div>

                        <FormSection title="Quick Actions" icon="⚡">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button onClick={() => setUi(prev => ({ ...prev, activeSection: 'claim-ownership' }))}>
                                    🔒 Claim Product Ownership
                                </Button>
                                <Button onClick={() => setUi(prev => ({ ...prev, activeSection: 'verify-product' }))}>
                                    ✅ Verify Product Authenticity
                                </Button>
                            </div>
                        </FormSection>

                        {!user.isRegistered && (
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
                                <div className="flex items-center">
                                    <div className="text-3xl mr-4">⚠️</div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-yellow-800">Registration Required</h3>
                                        <p className="text-yellow-700 mt-1">Register to claim ownership of products and access all features.</p>
                                        <button
                                            onClick={() => setUi(prev => ({ ...prev, activeSection: 'registration' }))}
                                            className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Register Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {user.isRegistered && myItems.length > 0 && (
                            <FormSection title="Recent Items" icon="📦">
                                <div className="space-y-4">
                                    {myItems.slice(0, 3).map((item, index) => (
                                        <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{item.name}</p>
                                                    <p className="text-sm text-gray-600">ID: {item.itemId}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-600">{item.manufacturer}</p>
                                                    <p className="text-xs text-gray-500">{item.date}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </FormSection>
                        )}
                    </div>
                )}

                {ui.activeSection === 'registration' && (
                    <FormSection title="User Registration" icon="👤">
                        {!user.isRegistered ? (
                            <form onSubmit={registerUser} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Username
                                    </label>
                                    <Input
                                        placeholder="Enter your username (minimum 3 characters)"
                                        value={user.username}
                                        onChange={(e) => setUser(prev => ({ ...prev, username: e.target.value }))}
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-2">
                                        This username will be associated with your blockchain address.
                                    </p>
                                </div>
                                <Button type="submit" variant="success">
                                    👤 Register User
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-8xl mb-6">✅</div>
                                <h3 className="text-2xl font-semibold text-green-800 mb-3">Registration Complete!</h3>
                                <p className="text-green-600 text-lg">Welcome, <strong>{user.username}</strong>!</p>
                                <p className="text-gray-600 mt-2">You can now claim ownership of products and access all features.</p>
                            </div>
                        )}
                    </FormSection>
                )}

                {ui.activeSection === 'my-items' && (
                    <FormSection title="My Items" icon="📦">
                        {myItems.length > 0 ? (
                            <div className="space-y-6">
                                {myItems.map((item, index) => (
                                    <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-semibold text-gray-800 mb-3 text-lg">{item.name}</h4>
                                                <div className="space-y-2 text-sm text-gray-600">
                                                    <p><span className="font-medium">ID:</span> {item.itemId}</p>
                                                    <p><span className="font-medium">Serial:</span> {item.serial}</p>
                                                    <p><span className="font-medium">Manufacturer:</span> {item.manufacturer}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="space-y-2 text-sm text-gray-600 mb-4">
                                                    <p><span className="font-medium">Date:</span> {item.date}</p>
                                                    <p><span className="font-medium">Metadata:</span> {item.metadata}</p>
                                                </div>
                                                <Button 
                                                    onClick={() => {
                                                        setOwnership(prev => ({ ...prev, selectedItemId: item.itemId }));
                                                        setUi(prev => ({ ...prev, activeSection: 'transfer-ownership' }));
                                                    }}
                                                    variant="secondary"
                                                >
                                                    🔄 Transfer Ownership
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="text-8xl mb-6">📦</div>
                                <h3 className="text-2xl font-semibold text-gray-800 mb-3">No Items Yet</h3>
                                <p className="text-gray-600 text-lg">Claim ownership of products to see them here.</p>
                                <button
                                    onClick={() => setUi(prev => ({ ...prev, activeSection: 'claim-ownership' }))}
                                    className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    Claim Your First Product
                                </button>
                            </div>
                        )}
                    </FormSection>
                )}

                {ui.activeSection === 'claim-ownership' && (
                    <FormSection title="Claim Product Ownership" icon="🔒">
                        <form onSubmit={claimOwnership} className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-center">
                                    <div className="text-2xl mr-3">💡</div>
                                    <div>
                                        <h4 className="font-medium text-blue-900">How to claim ownership</h4>
                                        <p className="text-blue-700 text-sm">Scan the QR code provided by the manufacturer or paste the certificate signature data below.</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Certificate Signature Data
                                </label>
                                <TextArea
                                    placeholder="Paste certificate signature data (from QR code or manufacturer)"
                                    value={ownership.claimSignature}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setVerification(prev => ({ ...prev, signature: value }));
                                    }}
                                        const value = e.target.value;
                                        setOwnership(prev => ({ ...prev, claimSignature: value }));
                                    }}
                                        const value = e.target.value;
                                        setUser(prev => ({ ...prev, username: value }));
                                    }}
                                    rows={6}
                                />
                            </div>
                            <Button type="submit" variant="success">
                                🔒 Claim Ownership
                            </Button>
                        </form>
                    </FormSection>
                )}

                {ui.activeSection === 'verify-product' && (
                    <div className="space-y-8">
                        <FormSection title="Verify Product Authenticity" icon="✅">
                            <form onSubmit={verifyProduct} className="space-y-6">
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-center">
                                        <div className="text-2xl mr-3">🔍</div>
                                        <div>
                                            <h4 className="font-medium text-green-900">Product Verification</h4>
                                            <p className="text-green-700 text-sm">Verify the authenticity of any product by checking its certificate signature.</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Certificate Signature Data
                                    </label>
                                    <TextArea
                                        placeholder="Paste certificate signature data to verify authenticity"
                                        value={verification.signature}
                                        onChange={(e) => setVerification(prev => ({ ...prev, signature: e.target.value }))}
                                        rows={6}
                                    />
                                </div>
                                <Button type="submit" variant="success">
                                    ✅ Verify Product
                                </Button>
                            </form>
                        </FormSection>

                        {verification.result && (
                            <FormSection title="Verification Result" icon="📋">
                                <div className={`p-6 rounded-xl border ${
                                    verification.result.isValid 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-red-50 border-red-200'
                                }`}>
                                    <h4 className={`font-semibold mb-4 text-xl ${
                                        verification.result.isValid ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                        {verification.result.isValid ? '✅ Authentic Product' : '❌ Verification Failed'}
                                    </h4>
                                    {verification.result.isValid && (
                                        <div className="space-y-3 text-green-700">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium">Product Name</p>
                                                    <p className="text-lg">{verification.result.productName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Product ID</p>
                                                    <p className="text-lg">{verification.result.uniqueId}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Manufacturer</p>
                                                    <p className="text-lg">{verification.result.manufacturerName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Owner</p>
                                                    <p className="text-lg font-mono text-sm">{verification.result.owner}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </FormSection>
                        )}
                    </div>
                )}

                {ui.activeSection === 'transfer-ownership' && (
                    <div className="space-y-8">
                        <FormSection title="Generate Transfer Code" icon="🔄">
                            <form onSubmit={generateTransferCode} className="space-y-6">
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                    <div className="flex items-center">
                                        <div className="text-2xl mr-3">🔄</div>
                                        <div>
                                            <h4 className="font-medium text-purple-900">Ownership Transfer</h4>
                                            <p className="text-purple-700 text-sm">Generate a secure transfer code to transfer ownership to another user.</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Item to Transfer
                                    </label>
                                    <select
                                        value={ownership.selectedItemId}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setOwnership(prev => ({ ...prev, selectedItemId: value }));
                                        }}
                                        className="w-full p-4 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
                                        required
                                    >
                                        <option value="">Select an item to transfer</option>
                                        {myItems.map((item, index) => (
                                            <option key={index} value={item.itemId}>
                                                {item.name} - {item.itemId}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        New Owner's Wallet Address
                                    </label>
                                    <Input
                                        placeholder="0x... (Ethereum wallet address)"
                                        value={ownership.transferToAddress}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setOwnership(prev => ({ ...prev, transferToAddress: value }));
                                        }}
                                        required
                                    />
                                </div>
                                <Button type="submit" variant="success">
                                    🔄 Generate Transfer Code
                                </Button>
                            </form>

                            {ownership.transferCode && (
                                <div className="mt-6 p-6 bg-green-50 rounded-xl border border-green-200">
                                    <h4 className="font-semibold text-green-800 mb-3 text-lg">Transfer Code Generated</h4>
                                    <div className="bg-white p-4 rounded-lg border border-green-300 mb-3">
                                        <p className="text-green-700 font-mono text-sm break-all">{ownership.transferCode}</p>
                                    </div>
                                    <p className="text-green-600 text-sm">Share this code with the new owner to complete the transfer.</p>
                                </div>
                            )}
                        </FormSection>

                        <FormSection title="Claim Transfer" icon="📥">
                            <form onSubmit={claimTransfer} className="space-y-6">
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                    <div className="flex items-center">
                                        <div className="text-2xl mr-3">📥</div>
                                        <div>
                                            <h4 className="font-medium text-orange-900">Claim Ownership Transfer</h4>
                                            <p className="text-orange-700 text-sm">Enter the transfer code received from the current owner to claim ownership.</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Transfer Code
                                    </label>
                                    <Input
                                        placeholder="Enter transfer code received from current owner"
                                        value={ownership.transferCode}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setOwnership(prev => ({ ...prev, transferCode: value }));
                                        }}
                                        required
                                    />
                                </div>
                                <Button type="submit" variant="success">
                                    📥 Claim Transfer
                                </Button>
                            </form>
                        </FormSection>
                    </div>
                )}
            </div>
        </div>
    );
}