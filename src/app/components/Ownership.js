"use client";

import React, {useState, useEffect} from "react";
import {ethers} from "ethers";
import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {addressZero, parseError} from "../resources/error.js";
import {getEvents} from "../resources/getEvents.js";
import {OWNERSHIP_ABI} from "../resources/ownership_abi.js";


const OWNERSHIP = process.env.NEXT_PUBLIC_OWNERSHIP;

export default function Ownership() {

    const [rContract, setRContract] = useState(null);
    const [sContract, setSContract] = useState(null);
    const [formVisible, setFormVisible] = useState("");
    const [username, setUsername] = useState("");
    const [queryAddress, setQueryAddress] = useState("");
    const [queryItemHash, setQueryItemHash] = useState("");
    const [owner, setOwner] = useState("");
    const [userAddress, setUserAddress] = useState("");
    const [authe, setAuthe] = useState("");
    const [isOwn, setIsOwn] = useState("");
    const [temOwner, setTemOwner] = useState("");
    const [queryItemId, setQueryItemId] = useState("");
    const [userDetails, setUserDetails] = useState("");
    const [itemDetails, setItemDetails] = useState("");
    const [itemsList, setItemsList] = useState([]);
    const [ownershipCode, setOwnershipCode] = useState("");
    const [tempOwnerAddress, setTempOwnerAddress] = useState("");
    const [claimCode, setClaimCode] = useState("");
    const [revokeCode, setRevokeCode] = useState("");

    const [certificate, setCertificate] = useState({
        name: "iPhone 12",
        uniqueId: "IMEI123",
        serial: "123456",
        date: "2813184000", // Jan 1, 2059
        owner: "",
        metadata: "BLACK,128GB",
    });

    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState(null);

    useEffect(() => {
        if (typeof window.ethereum !== "undefined") {
            const web3Provider = new ethers.BrowserProvider(window.ethereum)
            setProvider(web3Provider);
            setRContract(new ethers.Contract(OWNERSHIP, OWNERSHIP_ABI, web3Provider));
            
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
                    
                    setAccount(accounts[0]);
                    setSigner(signer);
                    setSContract(new ethers.Contract(OWNERSHIP, OWNERSHIP_ABI, signer));
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
                const address = await signer.getAddress();
                setSigner(signer);
                setAccount(address);
                setSContract(new ethers.Contract(OWNERSHIP, OWNERSHIP_ABI, signer));
                toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);

                return;
            }

            //to disconnect wallet
            setSigner(null);
            setAccount(null);
            setRContract(new ethers.Contract(OWNERSHIP, OWNERSHIP_ABI, provider)); // to call view function
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
    const registerUser = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !sContract) return;
        try {
            if (!username || username.length < 3) {
                throw new Error("Username must be at least 3 characters");
            }
            const tx = await sContract.userRegisters(username);
            await tx.wait();

            toast.success(`User ${username} registered`);

            setUsername("");
            setFormVisible("");

        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const getUser = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !rContract) return;
        try {
            if (!ethers.isAddress(queryAddress)) {
                throw new Error("Valid address required");
            }

            const user = await rContract.getUser(queryAddress);

            setUserDetails(
                `Address: ${user.userAddress}, 
                      Username: ${user.username}, 
                      Registered At: ${new Date(Number(user.registeredAt) * 1000).toLocaleString()}`
            );

            toast.success(`Found user: ${user.username}`);
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const createItem = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !sContract) return;
        try {
            if (
                !certificate.name ||
                !certificate.uniqueId ||
                !certificate.serial ||
                !certificate.date ||
                !certificate.owner ||
                !certificate.metadata
            ) {
                throw new Error("All certificate fields required");
            }
            if (!ethers.isAddress(certificate.owner)) {
                throw new Error("Valid owner address required");
            }
            if (isNaN(certificate.date) || Number(certificate.date) <= 0) {
                throw new Error("Invalid date: must be a valid Unix timestamp");
            }
            const metadata = certificate.metadata
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            const cert = {
                name: certificate.name,
                uniqueId: certificate.uniqueId,
                serial: certificate.serial,
                date: parseInt(certificate.date),
                owner: certificate.owner,
                metadataHash: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])),
                metadata,
            };

            console.log("Cert Owner: ", cert.owner);
            const manufacturerName = "APPLE Corp"; // Replace with dynamic input if needed
            console.log("Account: ", account);
            const tx = await sContract.createItem(account, cert, manufacturerName);
            await tx.wait();

            toast.success(`Item ${cert.uniqueId} created`);
            setCertificate({
                name: "",
                uniqueId: "",
                serial: "",
                date: "",
                owner: account,
                metadata: "",
            });
            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const getAllItems = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !sContract) return;
        try {
            // if (!ethers.isAddress(queryAddress)) throw new Error("Valid address required");

            const items = await sContract.getAllMyItems();
            setItemsList(
                items.map((item) => ({
                    itemId: item.itemId,
                    name: item.name,
                    owner: item.owner,
                    serial: item.serial,
                    date: new Date(Number(item.date) * 1000).toLocaleString(),
                    manufacturer: item.manufacturer,
                    metadata: item.metadata.join(", "),
                }))
            );
            toast.success(`Found ${items.length} items`);
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const getItem = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !rContract) return;
        try {
            if (!queryItemId) throw new Error("Item ID required");
            const item = await rContract.getItem(queryItemId);
            setItemDetails(
                `Item ID: ${item.itemId}, Name: ${item.name}, Owner: ${item.owner}, Serial: ${item.serial}, Date: ${new Date(
                    Number(item.date) * 1000
                ).toLocaleString()}, Manufacturer: ${item.manufacturer}, Metadata: ${item.metadata.join(", ")}`
            );
            toast.success(`Found item: ${item.name}`);
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const generateChangeOfOwnershipCode = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !sContract) return;
        try {
            if (!queryItemId) {
                throw new Error("Item ID required");
            }
            if (!ethers.isAddress(tempOwnerAddress)) {
                throw new Error("Valid temporary owner address required");
            }

            const tx = await sContract.generateChangeOfOwnershipCode(queryItemId, tempOwnerAddress);

            const receipt = await tx.wait();

            const {ownershipCode, tempOwner} =
                getEvents(sContract, receipt, "OwnershipCode");

            console.log("Ownership Code: ", ownershipCode);
            console.log("Temp Owner: ", tempOwner);

            toast.success(`Ownership Code: ${ownershipCode}`);

            setQueryItemId("");
            setTempOwnerAddress("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const newOwnerClaimOwnership = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !sContract) return;
        try {
            if (!claimCode || !ethers.isBytesLike(claimCode)) {
                throw new Error("Valid ownership code required");
            }
            const tx = await sContract.newOwnerClaimOwnership(claimCode);
            const receipt = await tx.wait();

            const {newOwner, oldOwner} = getEvents(sContract, receipt, "OwnershipClaimed");
            console.log("New Owner: ", newOwner);
            console.log("Old Owner: ", oldOwner);

            toast.success(`New Owner: ${newOwner}`);

            setClaimCode("");
            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const revokeChangeOwnershipCode = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !sContract) return;
        try {
            if (!revokeCode || !ethers.isBytesLike(revokeCode)) {
                throw new Error("Valid ownership code required");
            }

            const tx = await sContract.ownerRevokeCode(revokeCode);

            const receipt = await tx.wait();

            const itemHash = getEvents(sContract, receipt, "CodeRevoked");
            console.log("Item Hash: ", itemHash);

            toast.success("Item Hash: ", itemHash);


            setRevokeCode("");
            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const getTempOwner = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !rContract) return;
        try {

            if (!queryItemHash || !ethers.isBytesLike(queryItemHash)) {
                throw new Error("Invalid Item Hash");
            }

            const tempOwner = await rContract.getTempOwner(queryItemHash);

            if (tempOwner === addressZero()) {
                throw new Error("No Temp Owner found!")
            }

            setTemOwner(tempOwner)

            toast.success(`Temp Owner: ${tempOwner}`);

            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const verifyOwnership = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !rContract) return;
        try {

            if (!queryItemId) {
                throw new Error("Invalid Item ID");
            }

            const own = await rContract.verifyOwnership(queryItemId);

            // const owne = JSON.stringify({
            //     name: own.name,
            //     id: own.itemId, // something very unique like the IMEI of a phone
            //     ownerName: own.username,
            //     ownerAddr: own.owner
            // });

            setOwner(own)

            toast.success(`${own.username} is the verified owner`);

            setQueryItemId("");
            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const isOwner = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !rContract) return;
        try {

            if (!queryItemId || !userAddress) {
                throw new Error("Invalid parameters");
            }

            const isValid = await rContract.isOwner(userAddress, queryItemId);

            setIsOwn(`Result: ${isValid}`)

            toast.success(`Result: ${isValid}`);

            setQueryItemId("");
            setUserAddress("");
            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    const setAuthenticity = async (e) => {
        e.preventDefault();
        if (!checkConnection() || !rContract) return;
        try {

            if (!authe || !ethers.isAddress(authe)) {
                throw new Error("Invalid Authenticity Address");
            }

            const tx = await sContract.setAuthenticity(authe);

            const receipt = await tx.wait();
            const authenticityAddress = getEvents(sContract, receipt, "AuthenticitySet");

            toast.success(`Authenticity Address: ${authenticityAddress}`);

            setAuthe("");
            setFormVisible("");
        } catch (error) {
            toast.error(`Error: ${parseError(error)}`);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Ownership Management</h1>
                <p className="text-gray-600">Manage product ownership, transfers, and verification on the blockchain.</p>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                            <span className="mr-2">👤</span>
                            User Operations
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "register" ? "" : "register")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "register" ? "Hide" : "Register User"}
                                </button>
                                {formVisible === "register" && (
                                    <form onSubmit={registerUser} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Username (min 3 characters)"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
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
                                    onClick={() => setFormVisible(formVisible === "setAuth" ? "" : "setAuth")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "setAuth" ? "Hide" : "Owner Set Authenticity"}
                                </button>
                                {formVisible === "setAuth" && (
                                    <form onSubmit={setAuthenticity} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Authencity Address"
                                            value={authe}
                                            onChange={(e) => setAuthe(e.target.value)}
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
                                    onClick={() => setFormVisible(formVisible === "getUser" ? "" : "getUser")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "getUser" ? "Hide" : "Get User by Address"}
                                </button>
                                {formVisible === "getUser" && (
                                    <form onSubmit={getUser} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="User Address"
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
                                        {userDetails && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-gray-700 text-sm">{userDetails}</p>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                            <span className="mr-2">📦</span>
                            Item Operations
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "create" ? "" : "create")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "create" ? "Hide" : "Create Item"}
                                </button>
                                {formVisible === "create" && (
                                    <form onSubmit={createItem} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Item Name"
                                            value={certificate.name}
                                            onChange={(e) => setCertificate({...certificate, name: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Unique ID"
                                            value={certificate.uniqueId}
                                            onChange={(e) => setCertificate({...certificate, uniqueId: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Serial"
                                            value={certificate.serial}
                                            onChange={(e) => setCertificate({...certificate, serial: e.target.value})}
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
                                            onChange={(e) => setCertificate({...certificate, owner: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Metadata (comma-separated)"
                                            value={certificate.metadata}
                                            onChange={(e) => setCertificate({...certificate, metadata: e.target.value})}
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
                                    onClick={() => setFormVisible(formVisible === "getItems" ? "" : "getItems")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "getItems" ? "Hide" : "Get All Items"}
                                </button>
                                {formVisible === "getItems" && (
                                    <form onSubmit={getAllItems} className="space-y-4 mt-4">
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        
                                        {itemsList.length > 0 && (
                                            <div className="mt-4 space-y-3">
                                                {itemsList.map((item, index) => (
                                                    <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                                                        <div className="space-y-1 text-sm text-gray-700">
                                                            <p><span className="font-medium">ID:</span> {item.itemId}</p>
                                                            <p><span className="font-medium">Name:</span> {item.name}</p>
                                                            <p><span className="font-medium">Date:</span> {item.date}</p>
                                                            <p><span className="font-medium">Metadata:</span> {item.metadata}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>
                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "getItem" ? "" : "getItem")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "getItem" ? "Hide" : "Get Item by ID"}
                                </button>
                                {formVisible === "getItem" && (
                                    <form onSubmit={getItem} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Item ID"
                                            value={queryItemId}
                                            onChange={(e) => setQueryItemId(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        {itemDetails && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-gray-700 text-sm">{itemDetails}</p>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                            <span className="mr-2">🔄</span>
                            Ownership Transfer
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "generateCode" ? "" : "generateCode")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "generateCode" ? "Hide" : "Generate Ownership Code"}
                                </button>
                                {formVisible === "generateCode" && (
                                    <form onSubmit={generateChangeOfOwnershipCode} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Item ID"
                                            value={queryItemId}
                                            onChange={(e) => setQueryItemId(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Temporary Owner Address"
                                            value={tempOwnerAddress}
                                            onChange={(e) => setTempOwnerAddress(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        {ownershipCode && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-gray-700 text-sm">{ownershipCode}</p>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>

                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "isOwner" ? "" : "isOwner")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "isOwner" ? "Hide" : "Is Owner"}
                                </button>
                                {formVisible === "isOwner" && (
                                    <form onSubmit={isOwner} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Owner Address"
                                            value={userAddress}
                                            onChange={(e) => setUserAddress(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Item ID"
                                            value={queryItemId}
                                            onChange={(e) => setQueryItemId(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />

                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        {isOwn && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-gray-700 text-sm">{isOwn}</p>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>

                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "verify" ? "" : "verify")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "verify" ? "Hide" : "Verify Ownership"}
                                </button>
                                {formVisible === "verify" && (
                                    <form onSubmit={verifyOwnership} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Item ID"
                                            value={queryItemId}
                                            onChange={(e) => setQueryItemId(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        {owner && (
                                            <div className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
                                                <h4 className="font-semibold text-green-800 mb-2">Ownership Verification</h4>
                                                <div className="space-y-1 text-sm text-green-700">
                                                    <p><span className="font-medium">Item Name:</span> {owner.name}</p>
                                                    <p><span className="font-medium">Item ID:</span> {owner.itemId}</p>
                                                    <p><span className="font-medium">Owner Name:</span> {owner.username}</p>
                                                    <p><span className="font-medium">Owner Address:</span> {owner.owner}</p>
                                                </div>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>


                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "tempOwner" ? "" : "tempOwner")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "tempOwner" ? "Hide" : "Get Temp Owner"}
                                </button>
                                {formVisible === "tempOwner" && (
                                    <form onSubmit={getTempOwner} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Ownership Code (bytes32)"
                                            value={queryItemHash}
                                            onChange={(e) => setQueryItemHash(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                        >
                                            Submit
                                        </button>
                                        {temOwner && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-gray-700 text-sm">{temOwner}</p>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>


                            <div>
                                <button
                                    onClick={() => setFormVisible(formVisible === "claimOwnership" ? "" : "claimOwnership")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "claimOwnership" ? "Hide" : "Claim Ownership"}
                                </button>
                                {formVisible === "claimOwnership" && (
                                    <form onSubmit={newOwnerClaimOwnership} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Ownership Code (bytes32)"
                                            value={claimCode}
                                            onChange={(e) => setClaimCode(e.target.value)}
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
                                    onClick={() => setFormVisible(formVisible === "revokeCode" ? "" : "revokeCode")}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition duration-300"
                                >
                                    {formVisible === "revokeCode" ? "Hide" : "Revoke Ownership Code"}
                                </button>
                                {formVisible === "revokeCode" && (
                                    <form onSubmit={revokeChangeOwnershipCode} className="space-y-4 mt-4">
                                        <input
                                            type="text"
                                            placeholder="Ownership Code (bytes32)"
                                            value={revokeCode}
                                            onChange={(e) => setRevokeCode(e.target.value)}
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}