"use client";

import React from "react";
import ManufacturerDashboard from "../components/ManufacturerDashboard";
import DashboardLayout from "../components/DashboardLayout";

export default function ManufacturerPage() {
    return (
        <DashboardLayout>
            <ManufacturerDashboard />
        </DashboardLayout>
    );
}