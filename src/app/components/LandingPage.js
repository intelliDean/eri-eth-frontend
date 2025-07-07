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
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100" : "bg-transparent"
            }`}>
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-xl">E</span>
                            </div>
                            <span className={`text-xl font-bold ${isScrolled ? 'text-gray-900' : 'text-white'}`}>ERI Protocol</span>
                        </div>
                        
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className={`${isScrolled ? 'text-gray-600 hover:text-blue-600' : 'text-gray-300 hover:text-white'} transition-colors`}>Features</a>
                            <a href="#how-it-works" className={`${isScrolled ? 'text-gray-600 hover:text-blue-600' : 'text-gray-300 hover:text-white'} transition-colors`}>How It Works</a>
                            <a href="#stats" className={`${isScrolled ? 'text-gray-600 hover:text-blue-600' : 'text-gray-300 hover:text-white'} transition-colors`}>Stats</a>
                        </div>

                        <button
                            onClick={connectWallet}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
                    <div className="absolute top-40 right-10 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
                    <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
                </div>

                <div className="container mx-auto text-center relative z-10">
                    <div className="max-w-4xl mx-auto">
                        <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-8">
                            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
                            Powered by Blockchain Technology
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                            Verify <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Authenticity</span>
                            <br />
                            Prove <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Ownership</span>
                        </h1>
                        
                        <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
                            Revolutionary blockchain platform for product authenticity verification and ownership management. 
                            Secure, transparent, and tamper-proof solutions for the digital age.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                            <Link href="/manufacturer" className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                <span className="flex items-center">
                                    🏭 Manufacturer Dashboard
                                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </Link>
                            <Link href="/user" className="group bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 hover:border-gray-300 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                <span className="flex items-center">
                                    👤 User Dashboard
                                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </Link>
                        </div>

                        {/* Process Flow */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                            {[
                                { title: "Authenticate", icon: "🔍", desc: "Verify product authenticity", delay: "0s" },
                                { title: "Verify", icon: "✅", desc: "Confirm ownership status", delay: "0.2s" },
                                { title: "Transfer", icon: "🔄", desc: "Secure ownership transfer", delay: "0.4s" }
                            ].map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2"
                                    style={{ animationDelay: item.delay }}
                                >
                                    <div className="text-4xl mb-4">{item.icon}</div>
                                    <h3 className="text-gray-900 text-xl font-semibold mb-2">{item.title}</h3>
                                    <p className="text-gray-600 text-sm">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-6 bg-gray-50">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-6">
                            ✨ Powerful Features
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            Everything You Need
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Built on Ethereum blockchain with cutting-edge cryptographic technology for maximum security and reliability
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 group"
                            >
                                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-gray-900 text-xl font-semibold mb-4">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 px-6 bg-white">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
                            🚀 Simple Process
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            How It Works
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Four simple steps to verify authenticity and manage ownership
                        </p>
                    </div>

                    <div className="max-w-5xl mx-auto">
                        <div className="space-y-16">
                            {[
                                {
                                    step: "01",
                                    title: "Manufacturer Registration",
                                    description: "Verified manufacturers register on the blockchain to create authentic product certificates with cryptographic signatures.",
                                    icon: "🏭",
                                    color: "blue"
                                },
                                {
                                    step: "02",
                                    title: "Product Certification",
                                    description: "Products receive unique blockchain certificates with tamper-proof signatures ensuring authenticity and traceability.",
                                    icon: "📜",
                                    color: "purple"
                                },
                                {
                                    step: "03",
                                    title: "Ownership Claims",
                                    description: "Users claim ownership of products using secure signatures and blockchain verification for transparent ownership records.",
                                    icon: "👤",
                                    color: "green"
                                },
                                {
                                    step: "04",
                                    title: "Instant Verification",
                                    description: "Anyone can verify product authenticity and ownership in real-time using QR codes or manual verification processes.",
                                    icon: "⚡",
                                    color: "orange"
                                }
                            ].map((item, index) => (
                                <div key={index} className="flex flex-col lg:flex-row items-center gap-12">
                                    <div className="flex-shrink-0 order-2 lg:order-1">
                                        <div className={`w-24 h-24 bg-gradient-to-r from-${item.color}-500 to-${item.color}-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                                            {item.step}
                                        </div>
                                    </div>
                                    <div className="flex-1 text-center lg:text-left order-1 lg:order-2">
                                        <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                                            <span className="text-5xl">{item.icon}</span>
                                            <h3 className="text-gray-900 text-2xl font-semibold">{item.title}</h3>
                                        </div>
                                        <p className="text-gray-600 text-lg leading-relaxed">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section id="stats" className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Trusted by Thousands
                        </h2>
                        <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                            Join the growing community of manufacturers and users securing their products with blockchain technology
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-4xl md:text-6xl font-bold text-white mb-2">
                                    {stat.number}
                                </div>
                                <div className="text-blue-100 text-lg">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-white">
                <div className="container mx-auto text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            Ready to Get Started?
                        </h2>
                        <p className="text-xl text-gray-600 mb-12">
                            Join the future of product authenticity and ownership verification with our secure blockchain platform
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link href="/manufacturer" className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                <span className="flex items-center">
                                    🏭 For Manufacturers
                                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </Link>
                            <Link href="/user" className="group bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 hover:border-gray-300 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                <span className="flex items-center">
                                    👤 For Users
                                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 bg-gray-900 border-t border-gray-800">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <div className="flex items-center space-x-2 mb-4 md:mb-0">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">E</span>
                            </div>
                            <span className="text-white text-lg font-bold">ERI Protocol</span>
                        </div>
                        <div className="text-gray-400">
                            © 2025 ERI Protocol. Built on Ethereum blockchain.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}