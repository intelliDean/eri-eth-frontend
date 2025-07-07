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

    const connectWallet = async () => {
        if (!wallet.provider) {
            toast.error("MetaMask not detected");
            return;
        }

        try {
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
        } catch (error) {
            console.error("Connection error:", error);
            toast.error(`Error: ${error.message}`);
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
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm font-medium">{title}</p>
                    <p className={`text-3xl font-bold text-${color}-600 mt-2`}>{value}</p>
                </div>
                <div className={`text-4xl`}>{icon}</div>
            </div>
        </div>
    );

    const FormSection = ({ title, children, icon }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
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
            onChange={onChange}
            required={required}
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
        />
    );

    const TextArea = ({ placeholder, value, onChange, rows = 4 }) => (
        <textarea
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            rows={rows}
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
        />
    );

    const Button = ({ onClick, children, variant = 'primary', disabled = false, type = 'button' }) => {
        const baseClasses = "w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
        const variants = {
            primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl",
            secondary: "bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl",
            success: "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl",
            danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl"
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">User Dashboard</h1>
                            <p className="text-gray-600">Manage your products and verify authenticity</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                user.isRegistered 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {user.registrationStatus}
                            </div>
                            <button
                                onClick={connectWallet}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                    wallet.account
                                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                                        : "bg-blue-500 text-white hover:bg-blue-600"
                                }`}
                            >
                                {wallet.account ? `${wallet.account.slice(0, 6)}...${wallet.account.slice(-4)}` : "Connect Wallet"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-white shadow-sm border-b">
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
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard title="My Items" value={analytics.totalItems} icon="📦" color="blue" />
                            <StatCard title="Verified Items" value={analytics.verifiedItems} icon="✅" color="green" />
                            <StatCard title="Pending Transfers" value={analytics.pendingTransfers} icon="🔄" color="orange" />
                        </div>

                        <FormSection title="Quick Actions" icon="⚡">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button onClick={() => setUi(prev => ({ ...prev, activeSection: 'claim-ownership' }))}>
                                    Claim Product Ownership
                                </Button>
                                <Button onClick={() => setUi(prev => ({ ...prev, activeSection: 'verify-product' }))}>
                                    Verify Product Authenticity
                                </Button>
                            </div>
                        </FormSection>

                        {user.isRegistered && myItems.length > 0 && (
                            <FormSection title="Recent Items" icon="📦">
                                <div className="space-y-3">
                                    {myItems.slice(0, 3).map((item, index) => (
                                        <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-800">{item.name}</p>
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
                            <form onSubmit={registerUser} className="space-y-4">
                                <Input
                                    placeholder="Username (min 3 characters)"
                                    value={user.username}
                                    onChange={(e) => setUser(prev => ({ ...prev, username: e.target.value }))}
                                    required
                                />
                                <Button type="submit" variant="success">
                                    Register User
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">✅</div>
                                <h3 className="text-xl font-semibold text-green-800 mb-2">Registration Complete</h3>
                                <p className="text-green-600">Welcome, <strong>{user.username}</strong>!</p>
                            </div>
                        )}
                    </FormSection>
                )}

                {ui.activeSection === 'my-items' && (
                    <FormSection title="My Items" icon="📦">
                        {myItems.length > 0 ? (
                            <div className="space-y-4">
                                {myItems.map((item, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="font-semibold text-gray-800 mb-2">{item.name}</h4>
                                                <div className="space-y-1 text-sm text-gray-600">
                                                    <p><span className="font-medium">ID:</span> {item.itemId}</p>
                                                    <p><span className="font-medium">Serial:</span> {item.serial}</p>
                                                    <p><span className="font-medium">Manufacturer:</span> {item.manufacturer}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="space-y-1 text-sm text-gray-600">
                                                    <p><span className="font-medium">Date:</span> {item.date}</p>
                                                    <p><span className="font-medium">Metadata:</span> {item.metadata}</p>
                                                </div>
                                                <div className="mt-3">
                                                    <Button 
                                                        onClick={() => {
                                                            setOwnership(prev => ({ ...prev, selectedItemId: item.itemId }));
                                                            setUi(prev => ({ ...prev, activeSection: 'transfer-ownership' }));
                                                        }}
                                                        variant="secondary"
                                                    >
                                                        Transfer Ownership
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">📦</div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Items Yet</h3>
                                <p className="text-gray-600">Claim ownership of products to see them here.</p>
                            </div>
                        )}
                    </FormSection>
                )}

                {ui.activeSection === 'claim-ownership' && (
                    <FormSection title="Claim Product Ownership" icon="🔒">
                        <form onSubmit={claimOwnership} className="space-y-4">
                            <TextArea
                                placeholder="Paste certificate signature data (from QR code or manufacturer)"
                                value={ownership.claimSignature}
                                onChange={(e) => setOwnership(prev => ({ ...prev, claimSignature: e.target.value }))}
                                rows={6}
                            />
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-blue-800 text-sm">
                                    <strong>How to claim:</strong> Scan the QR code provided by the manufacturer or paste the certificate signature data above.
                                </p>
                            </div>
                            <Button type="submit" variant="success">
                                Claim Ownership
                            </Button>
                        </form>
                    </FormSection>
                )}

                {ui.activeSection === 'verify-product' && (
                    <div className="space-y-6">
                        <FormSection title="Verify Product Authenticity" icon="✅">
                            <form onSubmit={verifyProduct} className="space-y-4">
                                <TextArea
                                    placeholder="Paste certificate signature data to verify authenticity"
                                    value={verification.signature}
                                    onChange={(e) => setVerification(prev => ({ ...prev, signature: e.target.value }))}
                                    rows={6}
                                />
                                <Button type="submit" variant="success">
                                    Verify Product
                                </Button>
                            </form>
                        </FormSection>

                        {verification.result && (
                            <FormSection title="Verification Result" icon="📋">
                                <div className={`p-4 rounded-lg border ${
                                    verification.result.isValid 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-red-50 border-red-200'
                                }`}>
                                    <h4 className={`font-semibold mb-2 ${
                                        verification.result.isValid ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                        {verification.result.isValid ? '✅ Authentic Product' : '❌ Verification Failed'}
                                    </h4>
                                    {verification.result.isValid && (
                                        <div className="space-y-1 text-sm text-green-700">
                                            <p><span className="font-medium">Product:</span> {verification.result.productName}</p>
                                            <p><span className="font-medium">ID:</span> {verification.result.uniqueId}</p>
                                            <p><span className="font-medium">Manufacturer:</span> {verification.result.manufacturerName}</p>
                                            <p><span className="font-medium">Owner:</span> {verification.result.owner}</p>
                                        </div>
                                    )}
                                </div>
                            </FormSection>
                        )}
                    </div>
                )}

                {ui.activeSection === 'transfer-ownership' && (
                    <div className="space-y-6">
                        <FormSection title="Generate Transfer Code" icon="🔄">
                            <form onSubmit={generateTransferCode} className="space-y-4">
                                <select
                                    value={ownership.selectedItemId}
                                    onChange={(e) => setOwnership(prev => ({ ...prev, selectedItemId: e.target.value }))}
                                    className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Select an item to transfer</option>
                                    {myItems.map((item, index) => (
                                        <option key={index} value={item.itemId}>
                                            {item.name} - {item.itemId}
                                        </option>
                                    ))}
                                </select>
                                <Input
                                    placeholder="New owner's wallet address"
                                    value={ownership.transferToAddress}
                                    onChange={(e) => setOwnership(prev => ({ ...prev, transferToAddress: e.target.value }))}
                                    required
                                />
                                <Button type="submit" variant="success">
                                    Generate Transfer Code
                                </Button>
                            </form>

                            {ownership.transferCode && (
                                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                    <h4 className="font-semibold text-green-800 mb-2">Transfer Code Generated</h4>
                                    <p className="text-green-700 text-sm break-all">{ownership.transferCode}</p>
                                    <p className="text-green-600 text-xs mt-2">Share this code with the new owner to complete the transfer.</p>
                                </div>
                            )}
                        </FormSection>

                        <FormSection title="Claim Transfer" icon="📥">
                            <form onSubmit={claimTransfer} className="space-y-4">
                                <Input
                                    placeholder="Enter transfer code received from current owner"
                                    value={ownership.transferCode}
                                    onChange={(e) => setOwnership(prev => ({ ...prev, transferCode: e.target.value }))}
                                    required
                                />
                                <Button type="submit" variant="success">
                                    Claim Transfer
                                </Button>
                            </form>
                        </FormSection>
                    </div>
                )}
            </div>
        </div>
    );
}