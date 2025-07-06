// src/app/page.js
// import Authenticity from './components/Authenticity';
// import Ownership from "@/app/components/Ownership";
//
// export default function Home() {
//   return (
//       <div>
//         <Authenticity />
//         <Ownership />
//       </div>
//   );
// }

"use client";

import React, { useState } from "react";
import Authenticity from "./components/Authenticity";
import Ownership from "./components/Ownership";

export default function Home() {
    const [showAuthenticity, setShowAuthenticity] = useState(true);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-teal-100">
            <header className="p-4 bg-blue-600 text-white shadow-md">
                <div className="container mx-auto flex justify-center">
                    <button
                        onClick={() => setShowAuthenticity(!showAuthenticity)}
                        className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-300"
                    >
                        Switch to {showAuthenticity ? "Ownership" : "Authenticity"}
                    </button>
                </div>
            </header>
            <main className="container mx-auto p-6">
                {showAuthenticity ? <Authenticity /> : <Ownership />}
            </main>
        </div>
    );
}