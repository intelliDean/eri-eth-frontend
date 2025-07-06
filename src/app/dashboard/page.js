"use client";

import React, { useState } from "react";
import Authenticity from "../components/Authenticity";
import Ownership from "../components/Ownership";
import DashboardLayout from "../components/DashboardLayout";

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("authenticity");

    const tabs = [
        {
            id: "authenticity",
            label: "Product Authenticity",
            icon: "🔐",
            description: "Verify and manage product authenticity"
        },
        {
            id: "ownership",
            label: "Ownership Management", 
            icon: "👤",
            description: "Manage product ownership and transfers"
        }
    ];

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                {/* Tab Navigation */}
                <div className="bg-white shadow-sm border-b">
                    <div className="container mx-auto px-6">
                        <div className="flex space-x-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-all duration-300 ${
                                        activeTab === tab.id
                                            ? "border-blue-500 text-blue-600 bg-blue-50"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <span className="text-lg">{tab.icon}</span>
                                    <div className="text-left">
                                        <div className="font-semibold">{tab.label}</div>
                                        <div className="text-xs text-gray-400">{tab.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="container mx-auto p-6">
                    <div className="animate-fade-in">
                        {activeTab === "authenticity" ? <Authenticity /> : <Ownership />}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}