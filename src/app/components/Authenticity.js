"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { QRCodeCanvas } from 'qrcode.react';
import { AUTHENTICITY_ABI } from '../resources/authenticity_abi';
import { signTypedData } from '../resources/typedData';
import { parseError } from '../resources/error';

const AUTHENTICITY_CONTRACT = process.env.NEXT_PUBLIC_AUTHENTICITY || "0x0000000000000000000000000000000000000000";

export default function Authenticity() {
    // State management
    const [wallet, setWallet] = useState({
        provider: null,
        signer: null,
        account: null,
        chainId: null
    });

    const [contracts, setContracts] = useState({
        readContract: null,
        writeContract: null
    });

    const [ui, setUi] = useState({
        activeForm: '',
        loading: false
    });

    const [manufacturer, setManufacturer] = useState({
        name: '',
        queryName: '',
        queryAddress: '',
        details: '',
        address: ''
    });

    const [certificate, setCertificate] = useState({
        name: 'iPhone 15 Pro',
        uniqueId: 'IMEI123456789',
        serial: 'SN123456',
        date: '',
        owner: '',
        metadata: 'Space Black, 256GB, Pro Max'
    });

    const [verification, setVerification] = useState({
        signature: '',
        result: '',
        qrCodeData: '',
        authResult: null
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
                    readContract: new ethers.Contract(AUTHENTICITY_CONTRACT, AUTHENTICITY_ABI, provider)
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
        } else {
            toast.error("Please install MetaMask!");
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
            setContracts(prev => ({ ...prev, writeContract: null }));
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
        setContracts(prev => ({ ...prev, writeContract: null }));
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
                    writeContract: new ethers.Contract(AUTHENTICITY_CONTRACT, AUTHENTICITY_ABI, signer)
                }));

                setCertificate(prev => ({
                    ...prev,
                    owner: address
                }));

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
                    writeContract: null
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

    const validateConnection = () => {
        if (!wallet.account) {
            toast.error("Please connect your wallet first");
            return false;
        }
        return true;
    };

    // Manufacturer operations
    const registerManufacturer = async (e) => {
        e.preventDefault();
        if (!validateConnection() || !contracts.writeContract) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!manufacturer.name || manufacturer.name.length < 2) {
                throw new Error("Manufacturer name must be at least 2 characters");
            }

            const tx = await contracts.writeContract.manufacturerRegisters(manufacturer.name);
            await tx.wait();

            toast.success(`Manufacturer "${manufacturer.name}" registered successfully`);
            setManufacturer(prev => ({ ...prev, name: '' }));
            setUi(prev => ({ ...prev, activeForm: '' }));
        } catch (error) {
            console.error("Registration error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const getManufacturerByName = async (e) => {
        e.preventDefault();
        if (!contracts.readContract) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!manufacturer.queryName) {
                throw new Error("Manufacturer name is required");
            }

            const address = await contracts.readContract.getManufacturerByName(manufacturer.queryName);
            setManufacturer(prev => ({ ...prev, address }));
            toast.success(`Found manufacturer at: ${address}`);
        } catch (error) {
            console.error("Query error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const getManufacturerByAddress = async (e) => {
        e.preventDefault();
        if (!contracts.readContract) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!manufacturer.queryAddress || !ethers.isAddress(manufacturer.queryAddress)) {
                throw new Error("Valid address is required");
            }

            const result = await contracts.readContract.getManufacturer(manufacturer.queryAddress);
            setManufacturer(prev => ({
                ...prev,
                details: `Name: ${result.name}, Address: ${result.manufacturerAddress}`
            }));
            toast.success(`Found manufacturer: ${result.name}`);
        } catch (error) {
            console.error("Query error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    // Certificate operations
    const createAndSignCertificate = async (e) => {
        e.preventDefault();
        if (!validateConnection() || !contracts.writeContract || !wallet.signer) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            // Validate certificate data
            if (!certificate.name || !certificate.uniqueId || !certificate.serial || !certificate.metadata) {
                throw new Error("All certificate fields are required");
            }

            // Set current timestamp
            const currentDate = Math.floor(Date.now() / 1000);
            const updatedCertificate = {
                ...certificate,
                date: currentDate,
                owner: wallet.account
            };

            // Process metadata
            const metadata = certificate.metadata
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);

            // Create certificate object for signing
            const cert = {
                name: updatedCertificate.name,
                uniqueId: updatedCertificate.uniqueId,
                serial: updatedCertificate.serial,
                date: currentDate,
                owner: wallet.account,
                metadataHash: ethers.keccak256(
                    ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
                ),
                metadata
            };

            // Generate typed data for signing
            const { domain, types, value } = signTypedData(cert, wallet.chainId);

            // Sign the certificate
            const signature = await wallet.signer.signTypedData(domain, types, value);

            // Verify signature locally first
            const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
            if (recoveredAddress.toLowerCase() !== wallet.account.toLowerCase()) {
                throw new Error("Signature verification failed");
            }

            // Verify on blockchain
            const isValid = await contracts.readContract.verifySignature(cert, signature);

            setVerification(prev => ({
                ...prev,
                signature,
                result: `Signature is ${isValid ? 'valid' : 'invalid'}`,
                qrCodeData: JSON.stringify({ cert, signature })
            }));

            setCertificate(prev => ({ ...prev, date: currentDate.toString() }));
            toast.success(`Certificate signed and verified: ${isValid ? 'Valid' : 'Invalid'}`);
        } catch (error) {
            console.error("Signing error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const claimOwnership = async (e) => {
        e.preventDefault();
        if (!validateConnection() || !contracts.writeContract) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!verification.signature) {
                throw new Error("No signature available. Please sign a certificate first.");
            }

            // Process metadata
            const metadata = certificate.metadata
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);

            const cert = {
                name: certificate.name,
                uniqueId: certificate.uniqueId,
                serial: certificate.serial,
                date: parseInt(certificate.date),
                owner: certificate.owner,
                metadataHash: ethers.keccak256(
                    ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
                ),
                metadata
            };

            const tx = await contracts.writeContract.userClaimOwnership(cert, verification.signature);
            await tx.wait();

            toast.success(`Ownership claimed for item: ${cert.uniqueId}`);
            setUi(prev => ({ ...prev, activeForm: '' }));
        } catch (error) {
            console.error("Claim error:", error);
            toast.error(`Error: ${parseError(error)}`);
        } finally {
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const verifyAuthenticity = async (e) => {
        e.preventDefault();
        if (!contracts.readContract) return;

        setUi(prev => ({ ...prev, loading: true }));
        try {
            if (!verification.signature) {
                throw new Error("Signature is required for verification");
            }

            // Process metadata
            const metadata = certificate.metadata
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);

            const cert = {
                name: certificate.name,
                uniqueId: certificate.uniqueId,
                serial: certificate.serial,
                date: parseInt(certificate.date),
                owner: certificate.owner,
                metadataHash: ethers.keccak256(
                    ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
                ),
                metadata
            };

            const result = await contracts.readContract.verifyAuthenticity(cert, verification.signature);

            setVerification(prev => ({
                ...prev,
                authResult: {
                    isValid: result[0],
                    manufacturerName: result[1],
                    productName: certificate.name,
                    uniqueId: certificate.uniqueId,
                    owner: certificate.owner
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

    const downloadQRCode = () => {
        if (!verification.qrCodeData) {
            toast.error("No QR code data available");
            return;
        }

        const canvas = document.querySelector("canvas");
        if (canvas) {
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `certificate-${certificate.uniqueId}-qr.png`;
            link.click();
            toast.success("QR code downloaded successfully");
        }
    };

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

    const Button = ({ onClick, children, variant = 'primary', disabled = false, type = 'button' }) => {
        const baseClasses = "w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
        const variants = {
            primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl",
            secondary: "bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl",
            success: "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl"
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

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Authenticity</h1>
                <p className="text-gray-600">Verify product authenticity using blockchain technology and cryptographic signatures.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Manufacturer Operations */}
                <FormSection title="Manufacturer Operations" icon="🏭">
                    <div className="space-y-4">
                        <Button
                            onClick={() => setUi(prev => ({ 
                                ...prev, 
                                activeForm: prev.activeForm === 'register' ? '' : 'register' 
                            }))}
                        >
                            {ui.activeForm === 'register' ? 'Hide' : 'Register Manufacturer'}
                        </Button>

                        {ui.activeForm === 'register' && (
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
                        )}

                        <Button
                            onClick={() => setUi(prev => ({ 
                                ...prev, 
                                activeForm: prev.activeForm === 'queryName' ? '' : 'queryName' 
                            }))}
                        >
                            {ui.activeForm === 'queryName' ? 'Hide' : 'Find by Name'}
                        </Button>

                        {ui.activeForm === 'queryName' && (
                            <form onSubmit={getManufacturerByName} className="space-y-4">
                                <Input
                                    placeholder="Manufacturer Name"
                                    value={manufacturer.queryName}
                                    onChange={(e) => setManufacturer(prev => ({ ...prev, queryName: e.target.value }))}
                                    required
                                />
                                <Button type="submit" variant="success">
                                    Search
                                </Button>
                                {manufacturer.address && (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-green-800 text-sm font-medium">Found Address:</p>
                                        <p className="text-green-700 text-sm break-all">{manufacturer.address}</p>
                                    </div>
                                )}
                            </form>
                        )}

                        <Button
                            onClick={() => setUi(prev => ({ 
                                ...prev, 
                                activeForm: prev.activeForm === 'queryAddress' ? '' : 'queryAddress' 
                            }))}
                        >
                            {ui.activeForm === 'queryAddress' ? 'Hide' : 'Find by Address'}
                        </Button>

                        {ui.activeForm === 'queryAddress' && (
                            <form onSubmit={getManufacturerByAddress} className="space-y-4">
                                <Input
                                    placeholder="Manufacturer Address"
                                    value={manufacturer.queryAddress}
                                    onChange={(e) => setManufacturer(prev => ({ ...prev, queryAddress: e.target.value }))}
                                    required
                                />
                                <Button type="submit" variant="success">
                                    Search
                                </Button>
                                {manufacturer.details && (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-green-700 text-sm">{manufacturer.details}</p>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </FormSection>

                {/* Certificate Operations */}
                <FormSection title="Certificate Operations" icon="📜">
                    <div className="space-y-4">
                        <Button
                            onClick={() => setUi(prev => ({ 
                                ...prev, 
                                activeForm: prev.activeForm === 'sign' ? '' : 'sign' 
                            }))}
                        >
                            {ui.activeForm === 'sign' ? 'Hide' : 'Create & Sign Certificate'}
                        </Button>

                        {ui.activeForm === 'sign' && (
                            <form onSubmit={createAndSignCertificate} className="space-y-4">
                                <Input
                                    placeholder="Product Name"
                                    value={certificate.name}
                                    onChange={(e) => setCertificate(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                                <Input
                                    placeholder="Unique ID (e.g., IMEI, Serial Number)"
                                    value={certificate.uniqueId}
                                    onChange={(e) => setCertificate(prev => ({ ...prev, uniqueId: e.target.value }))}
                                    required
                                />
                                <Input
                                    placeholder="Serial Number"
                                    value={certificate.serial}
                                    onChange={(e) => setCertificate(prev => ({ ...prev, serial: e.target.value }))}
                                    required
                                />
                                <Input
                                    placeholder="Metadata (comma-separated: Color, Storage, Model)"
                                    value={certificate.metadata}
                                    onChange={(e) => setCertificate(prev => ({ ...prev, metadata: e.target.value }))}
                                    required
                                />
                                <Button type="submit" variant="success">
                                    Sign Certificate
                                </Button>

                                {verification.result && (
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-blue-800 text-sm font-medium">Signature Result:</p>
                                        <p className="text-blue-700 text-sm">{verification.result}</p>
                                        {verification.signature && (
                                            <p className="text-blue-600 text-xs mt-2 break-all">
                                                Signature: {verification.signature.slice(0, 50)}...
                                            </p>
                                        )}
                                    </div>
                                )}
                            </form>
                        )}

                        <Button
                            onClick={() => setUi(prev => ({ 
                                ...prev, 
                                activeForm: prev.activeForm === 'claim' ? '' : 'claim' 
                            }))}
                        >
                            {ui.activeForm === 'claim' ? 'Hide' : 'Claim Ownership'}
                        </Button>

                        {ui.activeForm === 'claim' && (
                            <form onSubmit={claimOwnership} className="space-y-4">
                                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <p className="text-yellow-800 text-sm">
                                        This will claim ownership using the currently signed certificate.
                                    </p>
                                </div>
                                <Button type="submit" variant="success">
                                    Claim Ownership
                                </Button>
                            </form>
                        )}

                        <Button
                            onClick={() => setUi(prev => ({ 
                                ...prev, 
                                activeForm: prev.activeForm === 'verify' ? '' : 'verify' 
                            }))}
                        >
                            {ui.activeForm === 'verify' ? 'Hide' : 'Verify Authenticity'}
                        </Button>

                        {ui.activeForm === 'verify' && (
                            <form onSubmit={verifyAuthenticity} className="space-y-4">
                                <Input
                                    placeholder="Signature for verification"
                                    value={verification.signature}
                                    onChange={(e) => setVerification(prev => ({ ...prev, signature: e.target.value }))}
                                    required
                                />
                                <Button type="submit" variant="success">
                                    Verify Authenticity
                                </Button>

                                {verification.authResult && (
                                    <div className={`p-4 rounded-lg border ${
                                        verification.authResult.isValid 
                                            ? 'bg-green-50 border-green-200' 
                                            : 'bg-red-50 border-red-200'
                                    }`}>
                                        <h4 className={`font-semibold mb-2 ${
                                            verification.authResult.isValid ? 'text-green-800' : 'text-red-800'
                                        }`}>
                                            {verification.authResult.isValid ? '✅ Authentic Product' : '❌ Verification Failed'}
                                        </h4>
                                        {verification.authResult.isValid && (
                                            <div className="space-y-1 text-sm text-green-700">
                                                <p><span className="font-medium">Product:</span> {verification.authResult.productName}</p>
                                                <p><span className="font-medium">ID:</span> {verification.authResult.uniqueId}</p>
                                                <p><span className="font-medium">Manufacturer:</span> {verification.authResult.manufacturerName}</p>
                                                <p><span className="font-medium">Owner:</span> {verification.authResult.owner}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </FormSection>
            </div>

            {/* QR Code Section */}
            {verification.qrCodeData && (
                <FormSection title="Certificate QR Code" icon="📱">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-4 bg-white rounded-lg shadow-lg">
                                <QRCodeCanvas 
                                    value={verification.qrCodeData} 
                                    size={200}
                                    level="M"
                                    includeMargin={true}
                                />
                            </div>
                        </div>
                        <p className="text-gray-600">Scan this QR code to verify product authenticity</p>
                        <div className="max-w-md mx-auto">
                            <Button onClick={downloadQRCode} variant="secondary">
                                Download QR Code
                            </Button>
                        </div>
                    </div>
                </FormSection>
            )}
        </div>
    );
}