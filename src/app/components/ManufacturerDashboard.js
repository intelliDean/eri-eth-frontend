"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { QRCodeCanvas } from 'qrcode.react';
import { AUTHENTICITY_ABI } from '../resources/authenticity_abi';
import { OWNERSHIP_ABI } from '../resources/ownership_abi';
import { signTypedData } from '../resources/typedData';
import { parseError } from '../resources/error';

const AUTHENTICITY_CONTRACT = process.env.NEXT_PUBLIC_AUTHENTICITY;
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

            // Check manufacturer registration status
            await checkManufacturerStatus(address);

            toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
        } catch (error) {
            console.error("Connection error:", error);
            toast.error(`Error: ${error.message}`);
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
                            <h1 className="text-2xl font-bold text-gray-900">Manufacturer Dashboard</h1>
                            <p className="text-gray-600">Manage your products and certificates</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                manufacturer.isRegistered 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {manufacturer.registrationStatus}
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
                    <div className="flex space-x-1">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setUi(prev => ({ ...prev, activeSection: section.id }))}
                                className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-all duration-300 ${
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
                            <StatCard title="Total Products" value={analytics.totalProducts} icon="📦" color="blue" />
                            <StatCard title="Verified Products" value={analytics.verifiedProducts} icon="✅" color="green" />
                            <StatCard title="Active Owners" value={analytics.activeOwners} icon="👥" color="purple" />
                        </div>

                        <FormSection title="Quick Actions" icon="⚡">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button onClick={() => setUi(prev => ({ ...prev, activeSection: 'single-product' }))}>
                                    Create Single Certificate
                                </Button>
                                <Button onClick={() => setUi(prev => ({ ...prev, activeSection: 'batch-products' }))}>
                                    Create Batch Certificates
                                </Button>
                            </div>
                        </FormSection>
                    </div>
                )}

                {ui.activeSection === 'registration' && (
                    <FormSection title="Manufacturer Registration" icon="🏭">
                        {!manufacturer.isRegistered ? (
                            <form onSubmit={registerManufacturer} className="space-y-4">
                                <Input
                                    placeholder="Manufacturer Name (min 2 characters)"
                                    value={manufacturer.name}
                                    onChange={(e) => setManufacturer(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                                <Button type="submit" variant="success">
                                    Register Manufacturer
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">✅</div>
                                <h3 className="text-xl font-semibold text-green-800 mb-2">Registration Complete</h3>
                                <p className="text-green-600">You are registered as: <strong>{manufacturer.name}</strong></p>
                            </div>
                        )}
                    </FormSection>
                )}

                {ui.activeSection === 'single-product' && (
                    <div className="space-y-6">
                        <FormSection title="Create Product Certificate" icon="📦">
                            <form onSubmit={createProductCertificate} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Product Name"
                                        value={productCertificate.name}
                                        onChange={(e) => setProductCertificate(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                    <Input
                                        placeholder="Unique ID (IMEI, Serial, etc.)"
                                        value={productCertificate.uniqueId}
                                        onChange={(e) => setProductCertificate(prev => ({ ...prev, uniqueId: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Serial Number"
                                        value={productCertificate.serial}
                                        onChange={(e) => setProductCertificate(prev => ({ ...prev, serial: e.target.value }))}
                                        required
                                    />
                                    <Input
                                        placeholder="Owner Address"
                                        value={productCertificate.owner}
                                        onChange={(e) => setProductCertificate(prev => ({ ...prev, owner: e.target.value }))}
                                        required
                                    />
                                </div>
                                <Input
                                    placeholder="Metadata (Color, Storage, Model - comma separated)"
                                    value={productCertificate.metadata}
                                    onChange={(e) => setProductCertificate(prev => ({ ...prev, metadata: e.target.value }))}
                                    required
                                />
                                <Button type="submit" variant="success">
                                    Create Certificate
                                </Button>
                            </form>
                        </FormSection>

                        {productCertificate.qrCodeData && (
                            <FormSection title="Generated Certificate" icon="📱">
                                <div className="text-center space-y-4">
                                    <div className="flex justify-center">
                                        <div className="p-4 bg-white rounded-lg shadow-lg">
                                            <QRCodeCanvas 
                                                value={productCertificate.qrCodeData} 
                                                size={200}
                                                level="M"
                                                includeMargin={true}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-gray-600">Product: {productCertificate.name}</p>
                                    <p className="text-gray-600">ID: {productCertificate.uniqueId}</p>
                                    <div className="max-w-md mx-auto">
                                        <Button onClick={downloadQRCode} variant="secondary">
                                            Download QR Code
                                        </Button>
                                    </div>
                                </div>
                            </FormSection>
                        )}
                    </div>
                )}

                {ui.activeSection === 'batch-products' && (
                    <FormSection title="Batch Product Certificates" icon="📋">
                        <div className="space-y-6">
                            {batchProducts.map((product, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-medium text-gray-800">Product {index + 1}</h4>
                                        {batchProducts.length > 1 && (
                                            <Button 
                                                onClick={() => removeBatchProduct(index)} 
                                                variant="danger"
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            placeholder="Product Name"
                                            value={product.name}
                                            onChange={(e) => updateBatchProduct(index, 'name', e.target.value)}
                                        />
                                        <Input
                                            placeholder="Unique ID"
                                            value={product.uniqueId}
                                            onChange={(e) => updateBatchProduct(index, 'uniqueId', e.target.value)}
                                        />
                                        <Input
                                            placeholder="Serial Number"
                                            value={product.serial}
                                            onChange={(e) => updateBatchProduct(index, 'serial', e.target.value)}
                                        />
                                        <Input
                                            placeholder="Owner Address"
                                            value={product.owner}
                                            onChange={(e) => updateBatchProduct(index, 'owner', e.target.value)}
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <Input
                                            placeholder="Metadata (comma separated)"
                                            value={product.metadata}
                                            onChange={(e) => updateBatchProduct(index, 'metadata', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                            
                            <div className="flex space-x-4">
                                <Button onClick={addBatchProduct} variant="secondary">
                                    Add Another Product
                                </Button>
                                <Button onClick={createBatchCertificates} variant="success">
                                    Create All Certificates
                                </Button>
                            </div>
                        </div>
                    </FormSection>
                )}

                {ui.activeSection === 'analytics' && (
                    <FormSection title="Analytics & Reports" icon="📈">
                        <div className="text-center py-8">
                            <div className="text-6xl mb-4">📊</div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Analytics Coming Soon</h3>
                            <p className="text-gray-600">Detailed analytics and reporting features will be available here.</p>
                        </div>
                    </FormSection>
                )}
            </div>
        </div>
    );
}