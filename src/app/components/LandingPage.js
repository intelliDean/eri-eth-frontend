"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import Link from "next/link";

export default function LandingPage() {
    const [account, setAccount] = useState(null);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const connectWallet = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                await window.ethereum.request({ method: "eth_requestAccounts" });
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                setAccount(address);
            } catch (error) {
                console.error("Error connecting wallet:", error);
            }
        } else {
            alert("Please install MetaMask!");
        }
    };

    const features = [
        {
            icon: "🔐",
            title: "Product Authenticity",
            description: "Verify the authenticity of products using blockchain technology and cryptographic signatures."
        },
        {
            icon: "👤",
            title: "Ownership Verification",
            description: "Prove and transfer ownership of items with secure, tamper-proof blockchain records."
        },
        {
            icon: "🏭",
            title: "Manufacturer Registry",
            description: "Trusted manufacturer registration system ensuring only verified entities can create certificates."
        },
        {
            icon: "📱",
            title: "QR Code Integration",
            description: "Generate and scan QR codes for instant product verification and ownership claims."
        },
        {
            icon: "🔄",
            title: "Ownership Transfer",
            description: "Seamlessly transfer ownership with secure codes and blockchain-verified transactions."
        },
        {
            icon: "⚡",
            title: "Real-time Verification",
            description: "Instant verification of product authenticity and ownership status on the Ethereum blockchain."
        }
    ];

    const stats = [
        { number: "10K+", label: "Products Verified" },
        { number: "500+", label: "Registered Manufacturers" },
        { number: "99.9%", label: "Verification Accuracy" },
        { number: "24/7", label: "Blockchain Uptime" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            {/* Navigation */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                isScrolled ? "bg-slate-900/95 backdrop-blur-md shadow-lg" : "bg-transparent"
            }`}>
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">E</span>
                            </div>
                            <span className="text-white text-xl font-bold">ERI Protocol</span>
                        </div>
                        
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
                            <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How It Works</a>
                            <a href="#stats" className="text-gray-300 hover:text-white transition-colors">Stats</a>
                        </div>

                        <button
                            onClick={connectWallet}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="container mx-auto text-center">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                            Verify <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Authenticity</span>
                            <br />
                            Prove <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Ownership</span>
                        </h1>
                        
                        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                            Revolutionary blockchain platform for product authenticity verification and ownership management. 
                            Secure, transparent, and tamper-proof.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link href="/manufacturer" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
                                Manufacturer Dashboard
                            </Link>
                            <Link href="/user" className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
                                User Dashboard
                            </Link>
                        </div>
                    </div>

                    {/* Floating Cards Animation */}
                    <div className="mt-16 relative">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {[
                                { title: "Authenticate", icon: "🔍", delay: "0s" },
                                { title: "Verify", icon: "✅", delay: "0.2s" },
                                { title: "Transfer", icon: "🔄", delay: "0.4s" }
                            ].map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2"
                                    style={{ animationDelay: item.delay }}
                                >
                                    <div className="text-4xl mb-4">{item.icon}</div>
                                    <h3 className="text-white text-xl font-semibold">{item.title}</h3>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-6 bg-slate-800/50">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Powerful Features
                        </h2>
                        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                            Built on Ethereum blockchain with cutting-edge cryptographic technology
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-2 group"
                            >
                                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-white text-xl font-semibold mb-4">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-300 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 px-6">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            How It Works
                        </h2>
                        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                            Simple steps to verify authenticity and manage ownership
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="space-y-12">
                            {[
                                {
                                    step: "01",
                                    title: "Manufacturer Registration",
                                    description: "Verified manufacturers register on the blockchain to create authentic product certificates.",
                                    icon: "🏭"
                                },
                                {
                                    step: "02",
                                    title: "Product Certification",
                                    description: "Products receive unique blockchain certificates with cryptographic signatures for authenticity.",
                                    icon: "📜"
                                },
                                {
                                    step: "03",
                                    title: "Ownership Claims",
                                    description: "Users claim ownership of products using secure signatures and blockchain verification.",
                                    icon: "👤"
                                },
                                {
                                    step: "04",
                                    title: "Instant Verification",
                                    description: "Anyone can verify product authenticity and ownership in real-time using QR codes or manual input.",
                                    icon: "⚡"
                                }
                            ].map((item, index) => (
                                <div key={index} className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="flex-shrink-0">
                                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                            {item.step}
                                        </div>
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                                            <span className="text-4xl">{item.icon}</span>
                                            <h3 className="text-white text-2xl font-semibold">{item.title}</h3>
                                        </div>
                                        <p className="text-gray-300 text-lg leading-relaxed">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section id="stats" className="py-20 px-6 bg-slate-800/50">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Trusted by Thousands
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                                    {stat.number}
                                </div>
                                <div className="text-gray-300 text-lg">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
                <div className="container mx-auto text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Ready to Get Started?
                        </h2>
                        <p className="text-xl text-gray-300 mb-8">
                            Join the future of product authenticity and ownership verification
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link href="/manufacturer" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
                                Manufacturer Dashboard
                            </Link>
                            <Link href="/user" className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
                                User Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-gray-700">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <div className="flex items-center space-x-2 mb-4 md:mb-0">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">E</span>
                            </div>
                            <span className="text-white text-lg font-bold">ERI Protocol</span>
                        </div>
                        <div className="text-gray-400">
                            © 2025 ERI Protocol. Built on Ethereum.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}