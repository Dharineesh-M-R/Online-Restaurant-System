// src/components/RouteGuard.tsx
"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { MapPin, QrCode, ShoppingBag, ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";

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
        <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-black text-stone-900 mb-1">Verifying Location</h2>
          <p className="text-stone-500 text-xs max-w-xs mx-auto leading-relaxed">
            Ensuring you are currently seated inside our dining area...
          </p>
        </div>
      );
    }

    // GPS Step 2: Blocked
    if (isLocationValid === false) {
      return (
        <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-4 border border-rose-200">
            <MapPin size={32} />
          </div>
          <h2 className="text-xl font-black text-stone-900 mb-1">Dine-in Boundary Check</h2>
          <p className="text-stone-500 text-xs max-w-xs mx-auto leading-relaxed mb-6">
            {locationMessage}
          </p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-600/20 transition flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Retry Location Check</span>
            </button>
            <Link
              href="/customer/parcel"
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition text-center"
            >
              Order Takeaway Instead
            </Link>
          </div>
        </div>
      );
    }

    // Table Step: Block if no table number (UNLESS they are on the parcel landing page)
    if (!isParcelLandingPage && !tableNumber && isLoaded) {
      return (
        <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mb-4 border border-orange-200">
            <QrCode size={32} />
          </div>
          <h2 className="text-xl font-black text-stone-900 mb-1">Scan Table QR Code</h2>
          <p className="text-stone-500 text-xs max-w-xs mx-auto leading-relaxed mb-6">
            Please scan the QR code located on your dining table standee to browse the menu and start your order session.
          </p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <Link
              href="/customer/parcel"
              className="w-full bg-stone-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} />
              <span>I Want Takeaway / Parcel</span>
            </Link>

            <Link
              href="/"
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition text-center flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
