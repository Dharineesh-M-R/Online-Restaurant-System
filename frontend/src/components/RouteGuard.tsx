// src/components/RouteGuard.tsx
"use client";

import { ReactNode } from "react";

interface RouteGuardProps {
  children: ReactNode;
  isCustomerRoute: boolean;
  isLocationValid: boolean | null;
  locationMessage: string;
  isParcelLandingPage: boolean;
  tableNumber: string | null;
  isLoaded: boolean;
}

export default function RouteGuard({
  children,
  isCustomerRoute,
  isLocationValid,
  locationMessage,
  isParcelLandingPage,
  tableNumber,
  isLoaded,
}: RouteGuardProps) {
  if (isCustomerRoute) {
    // GPS Step 1: Loading
    if (isLocationValid === null) {
      return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-black text-stone-900 mb-2">Locating You</h2>
          <p className="text-stone-500 max-w-xs mx-auto leading-relaxed">
            Verifying that you are currently inside the restaurant...
          </p>
        </div>
      );
    }

    // GPS Step 2: Blocked
    if (isLocationValid === false) {
      return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 border-8 border-red-100">
            <span className="text-red-500 text-4xl font-black">📍</span>
          </div>
          <h2 className="text-2xl font-black text-stone-900 mb-2">Action Blocked</h2>
          <p className="text-stone-500 max-w-xs mx-auto leading-relaxed mb-6">
            {locationMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all"
          >
            Check Again
          </button>
        </div>
      );
    }

    // Table Step: Block if no table number (UNLESS they are on the parcel landing page)
    if (!isParcelLandingPage && !tableNumber && isLoaded) {
      return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 border-8 border-red-100">
            <span className="text-red-500 text-4xl font-black">!</span>
          </div>
          <h2 className="text-2xl font-black text-stone-900 mb-2">Table Not Found</h2>
          <p className="text-stone-500 max-w-xs mx-auto leading-relaxed">
            Please scan the QR code on your table to view the menu and place an order.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}