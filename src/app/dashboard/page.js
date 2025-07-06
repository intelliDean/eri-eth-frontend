"use client";

import React, { useState } from "react";
import Authenticity from "../components/Authenticity";
import Ownership from "../components/Ownership";
import DashboardLayout from "../components/DashboardLayout";

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("authenticity");

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                {/* Tab Navigation */}
                <div className="bg-white shadow-sm border-b">
                    <div className="container mx-auto px-6">
                        <div className="flex space-x-8">
                            <button
                                onClick={() => setActiveTab("authenticity")}
                                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === "authenticity"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                Product Authenticity
                            </button>
                            <button
                                onClick={() => setActiveTab("ownership")}
                                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === "ownership"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                Ownership Management
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="container mx-auto p-6">
                    {activeTab === "authenticity" ? <Authenticity /> : <Ownership />}
                </div>
            </div>
        </DashboardLayout>
    );
}