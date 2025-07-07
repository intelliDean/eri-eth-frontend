"use client";

import React from "react";
import UserDashboard from "../components/UserDashboard";
import DashboardLayout from "../components/DashboardLayout";

export default function UserPage() {
    return (
        <DashboardLayout>
            <UserDashboard />
        </DashboardLayout>
    );
}