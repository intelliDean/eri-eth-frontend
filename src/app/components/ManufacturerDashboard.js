"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { QRCodeCanvas } from 'qrcode.react';
import { AUTHENTICITY_ABI } from '../resources/authenticity_abi';
import { OWNERSHIP_ABI } from '../resources/ownership_abi';
import { signTypedData } from '../resources/typedData';
import { parseError } from '../resources/error';

const AUTHENTICITY_CONTRACT = process.env.NEXT_PUBLIC_AUTHENTICITY || "0x0000000000000000000000000000000000000000";
const OWNERSHIP_CONTRACT = process.env.NEXT_PUBLIC_OWNERSHIP;

export default function ManufacturerDashboard() {
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

    const [manufacturer, setManufacturer] = useState({
        name: '',
        isRegistered: false,
        registrationStatus: ''
    });

    const [productCertificate, setProductCertificate] = useState({
        name: '',
        uniqueId: '',
        serial: '',
        owner: '',
        metadata: '',
        signature: '',
        qrCodeData: ''
    });

    const [batchProducts, setBatchProducts] = useState([
        { name: '', uniqueId: '', serial: '', owner: '', metadata: '' }
    ]);

    const [analytics, setAnalytics] = useState({
        totalProducts: 0,
        verifiedProducts: 0,
        activeOwners: 0
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

                // Check manufacturer registration status
                await checkManufacturerStatus(address);

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

    const checkManufacturerStatus = async (address) => {
        try {
            if (contracts.authenticityRead) {
                const manufacturerData = await contracts.authenticityRead.getManufacturer(address);
                setManufacturer(prev => ({
                    ...prev,
                    name: manufacturerData.name,
                    isRegistered: manufacturerData.name !== '',
                    registrationStatus: manufacturerData.name ? 'Registered' : 'Not Registered'
                }));
            }
        } catch (error) {
            setManufacturer(prev => ({
                ...prev,
                isRegistered: false,
                registrationStatus: 'Not Registered'
            }));
        }
    };

    const registerManufacturer = async (e) => {
        e.preventDefault();
        if (!wallet.account || !contracts.authenticityWrite) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!manufacturer.name || manufacturer.name.length < 2) {
                throw new Error("Manufacturer name must be at least 2 characters");
            }

            const tx = await contracts.authenticityWrite.manufacturerRegisters(manufacturer.name);
            await tx.wait();

            setManufacturer(prev => ({
                ...prev,
                isRegistered: true,
                registrationStatus: 'Registered'
            }));

            toast.success(`Manufacturer "${manufacturer.name}" registered successfully`);
        } catch (error) {
            console.error("Registration error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const createProductCertificate = async (e) => {
        e.preventDefault();
        if (!wallet.account || !contracts.authenticityWrite || !wallet.signer) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!productCertificate.name || !productCertificate.uniqueId || !productCertificate.serial || !productCertificate.owner || !productCertificate.metadata) {
                throw new Error("All certificate fields are required");
            }

            if (!ethers.isAddress(productCertificate.owner)) {
                throw new Error("Valid owner address required");
            }

            const currentDate = Math.floor(Date.now() / 1000);
            const metadata = productCertificate.metadata
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);

            const cert = {
                name: productCertificate.name,
                uniqueId: productCertificate.uniqueId,
                serial: productCertificate.serial,
                date: currentDate,
                owner: productCertificate.owner,
                metadataHash: ethers.keccak256(
                    ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
                ),
                metadata
            };

            // Generate typed data for signing
            const { domain, types, value } = signTypedData(cert, wallet.chainId);

            // Sign the certificate
            const signature = await wallet.signer.signTypedData(domain, types, value);

            // Verify signature
            const isValid = await contracts.authenticityRead.verifySignature(cert, signature);

            if (isValid) {
                setProductCertificate(prev => ({
                    ...prev,
                    signature,
                    qrCodeData: JSON.stringify({ cert, signature })
                }));

                toast.success("Product certificate created and signed successfully");
            } else {
                throw new Error("Signature verification failed");
            }
        } catch (error) {
            console.error("Certificate creation error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const addBatchProduct = () => {
        setBatchProducts(prev => [...prev, { name: '', uniqueId: '', serial: '', owner: '', metadata: '' }]);
    };

    const removeBatchProduct = (index) => {
        setBatchProducts(prev => prev.filter((_, i) => i !== index));
    };

    const updateBatchProduct = (index, field, value) => {
        setBatchProducts(prev => prev.map((product, i) => 
            i === index ? { ...product, [field]: value } : product
        ));
    };

    const createBatchCertificates = async () => {
        if (!wallet.account || !contracts.authenticityWrite || !wallet.signer) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            const certificates = [];
            
            for (const product of batchProducts) {
                if (!product.name || !product.uniqueId || !product.serial || !product.owner || !product.metadata) {
                    throw new Error(`All fields required for product: ${product.name || 'Unnamed'}`);
                }

                if (!ethers.isAddress(product.owner)) {
                    throw new Error(`Invalid owner address for product: ${product.name}`);
                }

                const currentDate = Math.floor(Date.now() / 1000);
                const metadata = product.metadata
                    .split(',')
                    .map(item => item.trim())
                    .filter(Boolean);

                const cert = {
                    name: product.name,
                    uniqueId: product.uniqueId,
                    serial: product.serial,
                    date: currentDate,
                    owner: product.owner,
                    metadataHash: ethers.keccak256(
                        ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
                    ),
                    metadata
                };

                const { domain, types, value } = signTypedData(cert, wallet.chainId);
                const signature = await wallet.signer.signTypedData(domain, types, value);

                certificates.push({ cert, signature });
            }

            // Here you could save certificates to a file or database
            console.log("Batch certificates created:", certificates);
            toast.success(`${certificates.length} certificates created successfully`);

            // Reset batch products
            setBatchProducts([{ name: '', uniqueId: '', serial: '', owner: '', metadata: '' }]);
        } catch (error) {
            console.error("Batch creation error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const downloadQRCode = () => {
        if (!productCertificate.qrCodeData) {
            toast.error("No QR code data available");
            return;
        }

        const canvas = document.querySelector("canvas");
        if (canvas) {
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `certificate-${productCertificate.uniqueId}-qr.png`;
            link.click();
            toast.success("QR code downloaded successfully");
        }
    };

    const sections = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'registration', label: 'Registration', icon: '🏭' },
        { id: 'single-product', label: 'Single Product', icon: '📦' },
        { id: 'batch-products', label: 'Batch Products', icon: '📋' },
        { id: 'analytics', label: 'Analytics', icon: '📈' }
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
                            <h1 className="text-3xl font-bold text-gray-900">Manufacturer Dashboard</h1>
                            <p className="text-gray-600 mt-1">Create and manage product certificates on the blockchain</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                                manufacturer.isRegistered 
                                    ? 'bg-green-100 text-green-800 border border-green-200' 
                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}>
                                <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${
                                        manufacturer.isRegistered ? 'bg-green-500' : 'bg-yellow-500'
                                    }`}></div>
                                    {manufacturer.registrationStatus}
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
                            <StatCard title="Total Products" value={analytics.totalProducts} icon="📦" color="blue" />
                            <StatCard title="Verified Products" value={analytics.verifiedProducts} icon="✅" color="green" />
                            <StatCard title="Active Owners" value={analytics.activeOwners} icon="👥" color="purple" />
                        </div>

                        <FormSection title="Quick Actions" icon="⚡">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button onClick={() => setUi(prev => ({ ...prev, activeSection: 'single-product' }))}>
                                    📦 Create Single Certificate
                                </Button>
                                <Button onClick={() => setUi(prev => ({ ...prev, activeSection: 'batch-products' }))}>
                                    📋 Create Batch Certificates
                                </Button>
                            </div>
                        </FormSection>

                        {!manufacturer.isRegistered && (
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
                                <div className="flex items-center">
                                    <div className="text-3xl mr-4">⚠️</div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-yellow-800">Registration Required</h3>
                                        <p className="text-yellow-700 mt-1">You need to register as a manufacturer before creating product certificates.</p>
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
                    </div>
                )}

                {ui.activeSection === 'registration' && (
                    <FormSection title="Manufacturer Registration" icon="🏭">
                        {!manufacturer.isRegistered ? (
                            <form onSubmit={registerManufacturer} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Manufacturer Name
                                    </label>
                                    <Input
                                        placeholder="Enter your company name (minimum 2 characters)"
                                        value={manufacturer.name}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setManufacturer(prev => ({ ...prev, name: value }));
                                        }}
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-2">
                                        This name will be permanently associated with your blockchain address.
                                    </p>
                                </div>
                                <Button type="submit" variant="success">
                                    🏭 Register as Manufacturer
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-8xl mb-6">✅</div>
                                <h3 className="text-2xl font-semibold text-green-800 mb-3">Registration Complete!</h3>
                                <p className="text-green-600 text-lg">You are registered as: <strong>{manufacturer.name}</strong></p>
                                <p className="text-gray-600 mt-2">You can now create product certificates and manage your inventory.</p>
                            </div>
                        )}
                    </FormSection>
                )}

                {ui.activeSection === 'single-product' && (
                    <div className="space-y-8">
                        <FormSection title="Create Product Certificate" icon="📦">
                            <form onSubmit={createProductCertificate} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Product Name
                                        </label>
                                        <Input
                                            placeholder="e.g., iPhone 15 Pro"
                                            value={productCertificate.name}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setProductCertificate(prev => ({ ...prev, name: value }));
                                            }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Unique ID
                                        </label>
                                        <Input
                                            placeholder="IMEI, Serial Number, etc."
                                            value={productCertificate.uniqueId}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setProductCertificate(prev => ({ ...prev, uniqueId: value }));
                                            }}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Serial Number
                                        </label>
                                        <Input
                                            placeholder="Manufacturing serial number"
                                            value={productCertificate.serial}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setProductCertificate(prev => ({ ...prev, serial: value }));
                                            }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Owner Address
                                        </label>
                                        <Input
                                            placeholder="0x... (Ethereum wallet address)"
                                            value={productCertificate.owner}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setProductCertificate(prev => ({ ...prev, owner: value }));
                                            }}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Product Metadata
                                    </label>
                                    <Input
                                        placeholder="Color, Storage, Model (comma separated)"
                                        value={productCertificate.metadata}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setProductCertificate(prev => ({ ...prev, metadata: value }));
                                        }}
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-2">
                                        Example: Space Black, 256GB, Pro Max
                                    </p>
                                </div>
                                <Button type="submit" variant="success">
                                    🔐 Create & Sign Certificate
                                </Button>
                            </form>
                        </FormSection>

                        {productCertificate.qrCodeData && (
                            <FormSection title="Generated Certificate" icon="📱">
                                <div className="text-center space-y-6">
                                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
                                        <div className="flex justify-center mb-6">
                                            <div className="p-6 bg-white rounded-2xl shadow-lg">
                                                <QRCodeCanvas 
                                                    value={productCertificate.qrCodeData} 
                                                    size={200}
                                                    level="M"
                                                    includeMargin={true}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-gray-700">
                                            <p className="font-semibold text-lg">{productCertificate.name}</p>
                                            <p className="text-sm">ID: {productCertificate.uniqueId}</p>
                                            <p className="text-sm">Serial: {productCertificate.serial}</p>
                                        </div>
                                    </div>
                                    <div className="max-w-md mx-auto">
                                        <Button onClick={downloadQRCode} variant="secondary">
                                            📥 Download QR Code
                                        </Button>
                                    </div>
                                </div>
                            </FormSection>
                        )}
                    </div>
                )}

                {ui.activeSection === 'batch-products' && (
                    <FormSection title="Batch Product Certificates" icon="📋">
                        <div className="space-y-8">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-center">
                                    <div className="text-2xl mr-3">💡</div>
                                    <div>
                                        <h4 className="font-medium text-blue-900">Batch Certificate Creation</h4>
                                        <p className="text-blue-700 text-sm">Create multiple product certificates at once for efficient inventory management.</p>
                                    </div>
                                </div>
                            </div>

                            {batchProducts.map((product, index) => (
                                <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="font-semibold text-gray-800 text-lg">Product {index + 1}</h4>
                                        {batchProducts.length > 1 && (
                                            <button
                                                onClick={() => removeBatchProduct(index)}
                                                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            placeholder="Product Name"
                                            value={product.name}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                updateBatchProduct(index, 'name', value);
                                            }}
                                        />
                                        <Input
                                            placeholder="Unique ID"
                                            value={product.uniqueId}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                updateBatchProduct(index, 'uniqueId', value);
                                            }}
                                        />
                                        <Input
                                            placeholder="Serial Number"
                                            value={product.serial}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                updateBatchProduct(index, 'serial', value);
                                            }}
                                        />
                                        <Input
                                            placeholder="Owner Address"
                                            value={product.owner}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                updateBatchProduct(index, 'owner', value);
                                            }}
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <Input
                                            placeholder="Metadata (comma separated)"
                                            value={product.metadata}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                updateBatchProduct(index, 'metadata', value);
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            
                            <div className="flex space-x-4">
                                <Button onClick={addBatchProduct} variant="secondary">
                                    ➕ Add Another Product
                                </Button>
                                <Button onClick={createBatchCertificates} variant="success">
                                    🔐 Create All Certificates
                                </Button>
                            </div>
                        </div>
                    </FormSection>
                )}

                {ui.activeSection === 'analytics' && (
                    <FormSection title="Analytics & Reports" icon="📈">
                        <div className="text-center py-16">
                            <div className="text-8xl mb-6">📊</div>
                            <h3 className="text-2xl font-semibold text-gray-800 mb-3">Analytics Coming Soon</h3>
                            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                                Detailed analytics, reporting features, and insights about your product certificates will be available here.
                            </p>
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                                <div className="bg-blue-50 rounded-xl p-4">
                                    <div className="text-2xl mb-2">📈</div>
                                    <p className="text-sm text-blue-800 font-medium">Product Performance</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-4">
                                    <div className="text-2xl mb-2">🔍</div>
                                    <p className="text-sm text-green-800 font-medium">Verification Insights</p>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-4">
                                    <div className="text-2xl mb-2">📊</div>
                                    <p className="text-sm text-purple-800 font-medium">Usage Statistics</p>
                                </div>
                            </div>
                        </div>
                    </FormSection>
                )}
            </div>
        </div>
    );
}