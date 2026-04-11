"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  Suspense,
  useCallback,
  useRef,
} from "react";
import { useSearchParams, usePathname } from "next/navigation";

export interface Dish {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  isVeg?: boolean;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  notes?: string;
  status?: string;
}

export interface PlacedServe {
  serveNumber: number;
  items: CartItem[];
  serveTotal: number;
  sessionId: string;
}

interface CartContextType {
  cart: CartItem[];
  sessionId: string | null;
  tableNumber: string | null;
  addToCart: (dish: Dish) => void;
  updateQuantity: (id: number, delta: number) => void;
  updateNotes: (id: number, text: string) => void;
  clearCart: () => void;
  clearCurrentCart: () => void;
  cartCount: number;
  isLoaded: boolean;
  serveCount: number;
  placedServes: PlacedServe[];
  placeCurrentOrder: () => void;
  cancelSession: () => Promise<void>;
}

// --- GPS MATH HELPERS ---
const RESTAURANT_LAT = parseFloat(process.env.NEXT_PUBLIC_LATITUDE || "0");
const RESTAURANT_LNG = parseFloat(process.env.NEXT_PUBLIC_LONGITUDE || "0");
const MAX_DISTANCE_METERS = 100; 

function getDistanceFromLatLonInM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371000; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function CartProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlTable = searchParams.get("table");

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const [cart, setCart] = useState<CartItem[]>([]);
  const [placedServes, setPlacedServes] = useState<PlacedServe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [serveCount, setServeCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);

  // GPS States
  const [isLocationValid, setIsLocationValid] = useState<boolean | null>(null);
  const [locationMessage, setLocationMessage] = useState<string>("");

  const isUpdatingCart = useRef(false);
  
  // 🔥 FIX: Treat the parcel selection page as a "lobby" so the Context doesn't block it!
  const isCustomerRoute = pathname?.startsWith("/customer") && pathname !== "/customer/parcel";

  // --- 0. GPS GEOFENCE CHECK ---
  useEffect(() => {
    if (!isCustomerRoute) return;

    // 🚨 GPS DISABLED FOR LOCAL TESTING
    setIsLocationValid(true); 
    return;

    if (!("geolocation" in navigator)) {
      setLocationMessage("GPS is not supported on your browser.");
      setIsLocationValid(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distance = getDistanceFromLatLonInM(
          RESTAURANT_LAT,
          RESTAURANT_LNG,
          position.coords.latitude,
          position.coords.longitude,
        );

        if (distance <= MAX_DISTANCE_METERS) {
          setIsLocationValid(true); 
        } else {
          setLocationMessage(
            `You are ${Math.round(distance)} meters away. You must be inside the restaurant to place an order.`,
          );
          setIsLocationValid(false); 
        }
      },
      (error) => {
        console.warn("Location error:", error);
        setLocationMessage(
          "Please allow Location Access in your browser settings to verify you are at the table.",
        );
        setIsLocationValid(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [isCustomerRoute]);

  // --- 1. INITIALIZE SESSION ---
  useEffect(() => {
    let activeTable = urlTable || localStorage.getItem("restaurant_table");

    if (
      !activeTable ||
      activeTable === "null" ||
      activeTable === "NULL" ||
      activeTable === "undefined"
    ) {
      setTableNumber(null);
      setIsLoaded(true);
      localStorage.removeItem("restaurant_table");
      return;
    }

    setTableNumber(activeTable);
    localStorage.setItem("restaurant_table", activeTable);

    const initializeSession = async () => {
      const storedSessionId = localStorage.getItem("restaurant_sessionId");
      const storedTable = localStorage.getItem("restaurant_table");

      if (urlTable && urlTable !== storedTable) {
        localStorage.removeItem("restaurant_sessionId");
      } else if (storedSessionId) {
        try {
          const verifyRes = await fetch(
            `${apiUrl}/sessions/${storedSessionId}/sync`,
          );
          if (verifyRes.status === 404) {
            console.log(
              "Previous session was closed. Preventing ghost session creation.",
            );
            clearCart();
            window.location.replace("/"); 
            return; 
          }
        } catch (err) {
          console.error("Verification ping failed", err);
        }
      }

      try {
        const res = await fetch(`${apiUrl}/sessions?table=${activeTable}`);
        if (!res.ok) throw new Error("Failed to fetch session");
        const data = await res.json();

        setSessionId(data.sessionId);
        localStorage.setItem("restaurant_sessionId", data.sessionId);
      } catch (err) {
        console.error("Session Initialization Error:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    initializeSession();
  }, [urlTable, apiUrl]);

  // --- 2. GLOBAL POLLING (SYNCS EVERY 3 SECONDS) & AUTO-KICK ---
  useEffect(() => {
    if (!sessionId) return;

    const syncTableData = async () => {
      if (isUpdatingCart.current) return;

      try {
        const res = await fetch(`${apiUrl}/sessions/${sessionId}/sync`);

        if (res.status === 404) {
          console.log("Session closed by restaurant. Auto-kicking to home...");
          clearCart();
          window.location.replace("/");
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setCart(data.cart);
          setPlacedServes(data.serves);
          setServeCount(data.serves.length);
        }
      } catch (err) {
        console.error("Failed to sync table data", err);
      }
    };

    syncTableData();
    const interval = setInterval(syncTableData, 3000);

    return () => clearInterval(interval);
  }, [sessionId, apiUrl]);

  // --- 3. HELPER: PUSH CART UPDATES TO SERVER ---
  const updateSharedCart = async (newCart: CartItem[]) => {
    setCart(newCart);
    if (!sessionId) return;

    isUpdatingCart.current = true;

    try {
      await fetch(`${apiUrl}/sessions/${sessionId}/cart`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: newCart }),
      });
    } catch (error) {
      console.error("Failed to update shared cart", error);
    } finally {
      setTimeout(() => {
        isUpdatingCart.current = false;
      }, 500);
    }
  };

  // --- 4. CART ACTIONS ---
  const addToCart = (dish: Dish) => {
    let newCart;
    const existingItem = cart.find((item) => item.id === dish.id);
    if (existingItem) {
      newCart = cart.map((item) =>
        item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    } else {
      newCart = [
        ...cart,
        { ...dish, quantity: 1, isVeg: dish.isVeg ?? true, notes: "" },
      ];
    }
    updateSharedCart(newCart);
  };

  const updateQuantity = (id: number, delta: number) => {
    const newCart = cart
      .map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item,
      )
      .filter((item) => item.quantity > 0);
    updateSharedCart(newCart);
  };

  const updateNotes = (id: number, text: string) => {
    const newCart = cart.map((item) =>
      item.id === id ? { ...item, notes: text } : item,
    );
    updateSharedCart(newCart);
  };

  const clearCurrentCart = () => {
    updateSharedCart([]);
  };

  const placeCurrentOrder = async () => {
    if (cart.length === 0 || !sessionId) return;

    // 🔥 NEW LOGIC: Prevent multiple serves for Takeaway
    const isParcel = Number(tableNumber) > 100;
    if (isParcel && placedServes.length > 0) {
      alert("Takeaway orders can only be placed once! If you need to add items, please talk to the billing counter.");
      return;
    }

    const serveTotal = cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const newServeNum = serveCount + 1;

    // Ensure status is waiting_confirmation
    const itemsWithStatus = cart.map((item) => ({
      ...item,
      status: "waiting_confirmation",
    }));

    const newServe: PlacedServe = {
      serveNumber: newServeNum,
      items: itemsWithStatus,
      serveTotal: serveTotal,
      sessionId: sessionId,
    };

    try {
      setPlacedServes((prev) => [...prev, newServe]);
      setServeCount(newServeNum);
      setCart([]);

      await fetch(`${apiUrl}/sessions/${sessionId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newServe),
      });
    } catch (err) {
      console.error("Order Placement Error:", err);
    }
  };

  const clearCart = () => {
    setCart([]);
    setPlacedServes([]);
    setServeCount(0);
    setSessionId(null);
    setTableNumber(null);
    localStorage.removeItem("restaurant_table");
    localStorage.removeItem("restaurant_sessionId");
  };

  const cancelSession = async () => {
    if (!sessionId) return;
    try {
      await fetch(`${apiUrl}/sessions/${sessionId}/cancel`, { method: "POST" });
      clearCart();
    } catch (error) {
      console.error("Failed to cancel session", error);
    }
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // --- 5. ROUTE PROTECTION & GEOFENCING LOGIC ---
  if (isCustomerRoute) {
    if (!tableNumber && isLoaded) {
      return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 border-8 border-red-100">
            <span className="text-red-500 text-4xl font-black">!</span>
          </div>
          <h2 className="text-2xl font-black text-stone-900 mb-2">
            Table Not Found
          </h2>
          <p className="text-stone-500 max-w-xs mx-auto leading-relaxed">
            Please scan the QR code on your table to view the menu and place an
            order.
          </p>
        </div>
      );
    }

    if (isLocationValid === null) {
      return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-black text-stone-900 mb-2">
            Locating You
          </h2>
          <p className="text-stone-500 max-w-xs mx-auto leading-relaxed">
            Verifying that you are currently inside the restaurant...
          </p>
        </div>
      );
    }

    if (isLocationValid === false) {
      return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 border-8 border-red-100">
            <span className="text-red-500 text-4xl font-black">📍</span>
          </div>
          <h2 className="text-2xl font-black text-stone-900 mb-2">
            Action Blocked
          </h2>
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
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        sessionId,
        tableNumber,
        addToCart,
        updateQuantity,
        updateNotes,
        clearCart,
        clearCurrentCart,
        cartCount,
        isLoaded,
        serveCount,
        placedServes,
        placeCurrentOrder,
        cancelSession,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center font-bold text-stone-500">
          Loading Session...
        </div>
      }
    >
      <CartProviderInner>{children}</CartProviderInner>
    </Suspense>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined)
    throw new Error("useCart must be used within a CartProvider");
  return context;
}