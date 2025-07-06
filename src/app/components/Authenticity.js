// src/app/components/Authenticity.js
"use client"; // Required for client-side interactivity in Next.js App Router

import React, {useState, useEffect} from 'react';
import {ethers} from 'ethers';
import axios from 'axios';

import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {signTypedData} from "../resources/typedData.js";
import {parseError} from "../resources/error.js";
import {QRCodeCanvas} from "qrcode.react";

const AUTHENTICITY = process.env.NEXT_PUBLIC_AUTHENTICITY;

import {AUTHENTICITY_ABI} from '../resources/authenticity_abi';

export default function Authenticity() {

    const [rContract, setRContract] = useState(null);
    const [sContract, setSContract] = useState(null);
    const [formVisible, setFormVisible] = useState("");
    const [manufacturerName, setManufacturerName] = useState("");
    const [queryName, setQueryName] = useState("");
    const [queryAddress, setQueryAddress] = useState("");
    const [manufacturerDetails, setManufacturerDetails] = useState("");
    const [manufacturerAddress, setManufacturerAddress] = useState("");
    const [signatureResult, setSignatureResult] = useState("");
    const [signature, setSignature] = useState("");
    const [veriSignature, setVeriSignature] = useState("");
    const [qrCodeData, setQrCodeData] = useState("");
    const [veriResult, setVeriResult] = useState({});
    const [certificate, setCertificate] = useState({
        name: "iPhone 12",
        uniqueId: "IMEI123",
        serial: "123456",
        date: "",
        owner: "0xF2E7E2f51D7C9eEa9B0313C2eCa12f8e43bd1855",
        metadata: "BLACK, 128GB",
    });

    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState("");

    useEffect(() => {
        if (typeof window.ethereum !== "undefined") {
            const web3Provider = new ethers.BrowserProvider(window.ethereum)
            setProvider(web3Provider);
            setRContract(new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, web3Provider));
            
            // Check if already connected
            checkConnection();
        } else {
            setProvider(ethers.getDefaultProvider);
            toast.error("Please install MetaMask!");
        }
    }, []);

    const checkConnection = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts.length > 0) {
                    const web3Provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await web3Provider.getSigner();
                    const network = await web3Provider.getNetwork();
                    
                    setAccount(accounts[0]);
                    setSigner(signer);
                    setChainId(network.chainId);
                    setSContract(new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, signer));
                }
            } catch (error) {
                console.error("Error checking connection:", error);
            }
        }
    };

    const connectWallet = async () => {
        if (!provider) {
            return toast.error("MetaMask not detected");
        }

        try {

            if (!account) {
                await window.ethereum.request({method: "eth_requestAccounts"});
                const signer = await provider.getSigner();

                const network = await provider.getNetwork();
                setChainId(network.chainId);

                const address = await signer.getAddress();
                setSigner(signer);
                setAccount(address);
                setSContract(new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, signer));


                console.log("Chain ID", network.chainId);

                toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);

                return;
            }

            //to disconnect wallet
            setSigner(null);
            setAccount(null);
            const network = await provider.getNetwork();
            setChainId(network.chainId);

            setRContract(new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, provider)); // to call view function
            toast.success("Wallet disconnected");

        } catch (error) {
            toast.error(`Error: ${error.message}`);
        }
    };

    const checkConnection = () => {
        if (!account) {
            toast.error("Connect wallet!");
            return false;
        }
        return true;
    };

    const registerManufacturer = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !sContract) return;
        try {
            if (!manufacturerName) throw new Error("Manufacturer name required");
            const tx = await sContract.manufacturerRegisters(manufacturerName);
            await tx.wait();
            toast.success(`Manufacturer ${manufacturerName} registered`);
            setManufacturerName("");
            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const getManufacturerByName = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !rContract) return;
        try {
            if (!queryName) throw new Error("Manufacturer name required");
            const address = await rContract.getManufacturerByName(queryName);
            setManufacturerAddress(`Address: ${address}`);
            toast.success(`Found manufacturer at ${address}`);
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };


    const getManufacturer = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !rContract) return;
        try {
            if (!queryAddress)
                throw new Error("Valid address required");
            const result = await rContract.getManufacturer(queryAddress);
            setManufacturerDetails(`Address: ${result.manufacturerAddress}, Name: ${result.name}`);
            toast.success(`Found manufacturer: ${result.name}`);
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const verifySignature = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !sContract || !signer) return;
        try {
            if (
                !certificate.name ||
                !certificate.uniqueId ||
                !certificate.serial ||
                // !certificate.date ||
                !certificate.metadata
            ) {
                throw new Error("All certificate fields required");
            }

            console.log("AUTHENTICITY: ", AUTHENTICITY);

            const metadata = createMetadata(certificate.metadata);

            certificate.date = Math.floor(Date.now() / 1000).toString();
            console.log("Created Date: ", certificate.date);

            //the certificate that goes into the backend has unique_id
            const cert = {
                name: certificate.name,
                uniqueId: certificate.uniqueId,
                serial: certificate.serial,
                date: parseInt(certificate.date),
                owner: account,
                metadataHash: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])), //hash the metadata array
                metadata: metadata
            };

            console.log("Cert", cert);

            console.log("Chain ID", chainId);


            //todo: you could make the frontend build the certificate for you
            const {domain, types, value} = signTypedData(cert, chainId);

            console.log("Typed Data: ", JSON.stringify({domain, types, value}, null, 2));


            //todo: you could get the backend build the certificate for you
            //backend takes unique_id instead of uniqueId
            // const certificateData = {
            //     name: certificate.name,
            //     unique_id: certificate.uniqueId,
            //     serial: certificate.serial,
            //     date: parseInt(certificate.date),
            //     owner: account,
            //     metadata
            // };
            // const response = await axios.post('http://localhost:8080/create_certificate', certificateData);
            //
            // console.log("Backend Response: ", JSON.stringify(response.data, null, 2));
            //
            // const {domain, types, value} = response.data;

            const inSign = await signer.signTypedData(
                domain,
                types,
                value
            );
            console.log("Signature: ", inSign);

            console.log("Account Address: ", account);
            console.log("Certificate Owner: ", cert.owner);

            // todo: Frontend verification before smart contract verification
            const recoveredAddress = ethers.verifyTypedData(
                domain,
                types,
                value,
                inSign
            );

            console.log("Signature Signer: ", recoveredAddress);


            if (recoveredAddress.toLowerCase() !== cert.owner.toLowerCase()) {
                throw new Error("Frontend verification failed: Signer does not match owner");
            }
            toast.info("Frontend signature verification passed");

            const isValid =  rContract.verifySignature(cert, inSign);

            setSignatureResult(`Signature valid: ${isValid}`);
            setSignature(inSign);

            // Generate QR code data
            const qrData = JSON.stringify({cert, signature: inSign});
            setQrCodeData(qrData);

            toast.success(`Signature verification: ${isValid}`);
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const userClaimOwnership = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !sContract) return;
        try {


            const metadata = createMetadata(certificate.metadata);

            //the certificate that goes into the backend has unique_id
            const cert = {
                name: certificate.name,
                uniqueId: certificate.uniqueId,
                serial: certificate.serial,
                date: parseInt(certificate.date),
                owner: certificate.owner,
                metadataHash: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])), //hash the metadata array
                metadata: metadata
            };

            console.log("Cert", cert);

            const tx = await sContract.userClaimOwnership(cert, veriSignature);
            await tx.wait();

            toast.success(`Item ${cert.uniqueId} claimed successfully`);

            setCertificate({
                name: "",
                uniqueId: "",
                serial: "",
                date: "",
                owner: "",
                metadata: "",
            });
            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const verifyProductAuthenticity = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !rContract) return;
        try {

            const metadata = createMetadata(certificate.metadata);

            //the certificate that goes into the backend has unique_id
            const cert = {
                name: certificate.name,
                uniqueId: certificate.uniqueId,
                serial: certificate.serial,
                date: parseInt(certificate.date),
                owner: certificate.owner,
                metadataHash: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])), //hash the metadata array
                metadata: metadata
            };

            //==================================== LOCAL VERIFICATION ============================================

            // const {domain, types, value} = signTypedData(cert, chainId);
            //
            // //frontend verification
            // const signerAddress = ethers.verifyTypedData(
            //     domain,
            //     types,
            //     value,
            //     veriSignature
            // );
            //
            // if (signerAddress.toLowerCase() !== cert.owner.toLowerCase()) {
            //     throw new Error("Signer does not match owner");
            // }
            //
            // const retrievedManufacturer = await rContract.getManufacturer(signerAddress);

            //==================================== ONCHAIN VERIFICATION ============================================


            // const isValid = await rContract.verifySignature(cert, veriSignature);

            // todo: when i deploy the current contract (one call did what both calls are doing)

            const result = await rContract.verifyAuthenticity(cert, veriSignature);

            const authResult = {
                isValid: result[0],
                manuName: result[1]
            }

            if (!authResult.isValid) {
                throw new Error("Verification failed");
            }

            //=====================================================================================================
            // const retrievedManufacturer = await rContract.getManufacturer(cert.owner);

            setVeriResult({
                name: certificate.name,
                uniqueId: certificate.uniqueId,
                serial: certificate.serial,
                date: certificate.date,
                owner: certificate.owner,
                metadata: certificate.metadata,
                manufacturer: authResult.manuName // retrievedManufacturer.name //or manufacturerName
            });

            toast.success(`${certificate.name} with ID ${certificate.uniqueId} is authentic`);

            // setCertificate({
            //     name: "",
            //     uniqueId: "",
            //     serial: "",
            //     date: "",
            //     owner: "",
            //     metadata: "",
            // });
            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    function createMetadata(value) {
        return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }


    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Authenticity</h1>
                <p className="text-gray-600">Verify product authenticity using blockchain technology and cryptographic signatures.</p>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                            <span className="mr-2">🏭</span>
                            Manufacturer Operations
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "register" ? "" : "register")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                                >
                                    {formVisible === "register" ? "Hide" : "Register Manufacturer"}
                                </button>
                                {formVisible === "register" && (
                                    <form onSubmit={registerManufacturer} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Manufacturer Name"
                                            value={manufacturerName}
                                            onChange={(e) => setManufacturerName(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                    </form>
                                )}
                            </div>
                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "byName" ? "" : "byName")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "byName" ? "Hide" : "Get Manufacturer by Name"}
                                </button>
                                {formVisible === "byName" && (
                                    <form onSubmit={getManufacturerByName} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Manufacturer Name"
                                            value={queryName}
                                            onChange={(e) => setQueryName(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        {manufacturerAddress && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-gray-700 text-sm">{manufacturerAddress}</p>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>
                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "byAddress" ? "" : "byAddress")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "byAddress" ? "Hide" : "Get Manufacturer by Address"}
                                </button>
                                {formVisible === "byAddress" && (
                                    <form onSubmit={getManufacturer} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Manufacturer Address"
                                            value={queryAddress}
                                            onChange={(e) => setQueryAddress(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        {manufacturerDetails && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-gray-700 text-sm">{manufacturerDetails}</p>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                            <span className="mr-2">📜</span>
                            Certificate Operations
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "verify" ? "" : "verify")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "verify" ? "Hide" : "Verify Signature"}
                                </button>
                                {formVisible === "verify" && (
                                    <form onSubmit={verifySignature} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Certificate Name"
                                            value={certificate.name}
                                            onChange={(e) => setCertificate({...certificate, name: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Unique ID"
                                            value={certificate.uniqueId}
                                            onChange={(e) => setCertificate({
                                                ...certificate,
                                                uniqueId: e.target.value
                                            })}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Serial"
                                            value={certificate.serial}
                                            onChange={(e) => setCertificate({
                                                ...certificate,
                                                serial: e.target.value
                                            })}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Metadata (comma-separated)"
                                            value={certificate.metadata}
                                            onChange={(e) => setCertificate({...certificate, metadata: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        {signatureResult &&
                                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                                <p className="text-green-700 text-sm">{signatureResult}</p>
                                            </div>
                                        }

                                        {qrCodeData && (
                                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border text-center">
                                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Certificate QR Code</h3>
                                                <div className="flex justify-center mb-3">
                                                    <QRCodeCanvas value={qrCodeData} size={200} />
                                                </div>
                                                <p className="text-sm text-gray-600 mb-3">Scan to verify product authenticity</p>
                                                <button
                                                    onClick={() => {
                                                        const canvas = document.querySelector("canvas");
                                                        const link = document.createElement("a");
                                                        link.href = canvas.toDataURL("image/png");
                                                        link.download = "certificate-qr.png";
                                                        link.click();
                                                    }}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
                                                >
                                                    Download QR Code
                                                </button>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>

                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "claim" ? "" : "claim")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "claim" ? "Hide" : "Claim Ownership"}
                                </button>
                                {formVisible === "claim" && (
                                    <form onSubmit={userClaimOwnership} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Certificate Name"
                                            value={certificate.name}
                                            onChange={(e) => setCertificate({...certificate, name: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Unique ID"
                                            value={certificate.uniqueId}
                                            onChange={(e) => setCertificate({
                                                ...certificate,
                                                uniqueId: e.target.value
                                            })}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Serial"
                                            value={certificate.serial}
                                            onChange={(e) => setCertificate({
                                                ...certificate,
                                                serial: e.target.value
                                            })}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Date (Unix timestamp)"
                                            value={certificate.date}
                                            onChange={(e) => setCertificate({...certificate, date: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Owner Address"
                                            value={certificate.owner}
                                            onChange={(e) => setCertificate({
                                                ...certificate,
                                                owner: e.target.value
                                            })}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Metadata (comma-separated)"
                                            value={certificate.metadata}
                                            onChange={(e) => setCertificate({...certificate, metadata: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Signature"
                                            value={veriSignature}
                                            onChange={(e) => setVeriSignature(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                    </form>
                                )}
                            </div>

                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "verifyAuth" ? "" : "verifyAuth")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "verifyAuth" ? "Hide" : "Verify Authenticity"}
                                </button>
                                {formVisible === "verifyAuth" && (
                                    <form onSubmit={verifyProductAuthenticity} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Certificate Name"
                                            value={certificate.name}
                                            onChange={(e) => setCertificate({...certificate, name: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Unique ID"
                                            value={certificate.uniqueId}
                                            onChange={(e) => setCertificate({
                                                ...certificate,
                                                uniqueId: e.target.value
                                            })}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Serial"
                                            value={certificate.serial}
                                            onChange={(e) => setCertificate({
                                                ...certificate,
                                                serial: e.target.value
                                            })}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Date (Unix timestamp)"
                                            value={certificate.date}
                                            onChange={(e) => setCertificate({...certificate, date: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Owner Address"
                                            value={certificate.owner}
                                            onChange={(e) => setCertificate({
                                                ...certificate,
                                                owner: e.target.value
                                            })}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Metadata (comma-separated)"
                                            value={certificate.metadata}
                                            onChange={(e) => setCertificate({...certificate, metadata: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Signature"
                                            value={veriSignature}
                                            onChange={(e) => setVeriSignature(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        {veriResult && (
                                            <div className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
                                                <h4 className="font-semibold text-green-800 mb-2">Verification Result</h4>
                                                <div className="space-y-1 text-sm text-green-700">
                                                    <p><span className="font-medium">Name:</span> {veriResult.name}</p>
                                                    <p><span className="font-medium">ID:</span> {veriResult.uniqueId}</p>
                                                    <p><span className="font-medium">Serial:</span> {veriResult.serial}</p>
                                                    <p><span className="font-medium">Date:</span> {veriResult.date}</p>
                                                    <p><span className="font-medium">Owner:</span> {veriResult.owner}</p>
                                                    <p><span className="font-medium">Metadata:</span> {veriResult.metadata}</p>
                                                    <p><span className="font-medium">Manufacturer:</span> {veriResult.manufacturer}</p>
                                                </div>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}