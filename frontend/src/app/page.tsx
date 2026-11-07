"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { 
  UtensilsCrossed, ShoppingBag, Receipt, Sparkles, Clock, 
  MapPin, ShieldCheck, ChevronRight, UserCircle, PhoneCall
} from "lucide-react";

export default function HomePage() {
  const { tableNumber, cartCount } = useCart();

  const menuLink = tableNumber ? `/customer/menu?table=${tableNumber}` : "/customer/menu";
  const cartLink = tableNumber ? `/customer/cart?table=${tableNumber}` : "/customer/cart";
  const isParcel = Number(tableNumber) > 100;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 flex flex-col font-sans selection:bg-orange-500/20 selection:text-orange-900">
      
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200/60 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <UtensilsCrossed size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-stone-900 block leading-tight">
              Foodie Delight
            </span>
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">
              Gourmet Dining
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          {tableNumber ? (
            <Link 
              href={menuLink} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-xs ${
                isParcel 
                  ? "bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200" 
                  : "bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span>{isParcel ? `Token #${Number(tableNumber) - 100}` : `Table #${tableNumber}`}</span>
            </Link>
          ) : (
            <Link 
              href="/customer/parcel" 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              <ShoppingBag size={14} />
              <span>Takeaway</span>
            </Link>
          )}

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-xs"
          >
            <UserCircle size={15} />
            <span className="hidden sm:inline">Staff</span> Portal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-linear-to-b from-orange-200/40 via-amber-100/20 to-transparent pointer-events-none rounded-full blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto text-center">
          
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide uppercase mb-6 shadow-xs"
          >
            <Sparkles size={14} className="text-orange-500 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Digital Dining & Quick Ordering Experience</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tight text-stone-900 mb-5 leading-[1.1] sm:leading-[1.15]"
          >
            Authentic Flavors, <br />
            <span className="bg-linear-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
              Served Fresh to Your Table.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-stone-600 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Order seamlessly from your phone. Browse authentic dishes, customize your cooking preferences, 
            and track your live kitchen order in real time.
          </motion.p>

          {/* Active Seating Notification Card */}
          {tableNumber && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md mx-auto mb-8 p-3.5 bg-white rounded-2xl border border-orange-200 shadow-md shadow-orange-500/5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black">
                  {isParcel ? <ShoppingBag size={20} /> : tableNumber}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-stone-900">
                    {isParcel ? `Takeaway Token ${Number(tableNumber) - 100}` : `Seated at Table ${tableNumber}`}
                  </h4>
                  <p className="text-[11px] font-medium text-stone-500">Session is active & ready for orders</p>
                </div>
              </div>
              <Link 
                href={menuLink}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition"
              >
                Go to Menu
              </Link>
            </motion.div>
          )}

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-3.5 sm:gap-4 max-w-md mx-auto"
          >
            <Link href={menuLink} className="w-full sm:w-auto flex-1">
              <button className="w-full min-h-13 bg-orange-600 hover:bg-orange-700 text-white px-7 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer">
                <UtensilsCrossed size={18} />
                <span>Explore Full Menu</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <Link href={cartLink} className="w-full sm:w-auto flex-1">
              <button className="w-full min-h-13 bg-stone-900 hover:bg-stone-800 text-white px-7 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
                <ShoppingBag size={18} />
                <span>View Cart {cartCount > 0 && `(${cartCount})`}</span>
              </button>
            </Link>
          </motion.div>

          {/* Secondary Quick Links */}
          <div className="flex justify-center items-center gap-6 mt-6 text-xs font-bold text-stone-500">
            <Link href="/customer/parcel" className="hover:text-orange-600 transition flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-orange-600" />
              <span>Takeaway / Parcel Order</span>
            </Link>
            <span>•</span>
            <Link href={tableNumber ? `/customer/getbill?table=${tableNumber}` : "/customer/getbill"} className="hover:text-orange-600 transition flex items-center gap-1.5">
              <Receipt size={14} className="text-orange-600" />
              <span>Track Active Bill</span>
            </Link>
          </div>

        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
              <Clock size={24} />
            </div>
            <h3 className="text-base font-black text-stone-900 mb-1.5">Lightning Kitchen Dispatch</h3>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
              Orders go straight from your phone to our Kitchen Display System for instant preparation without waiting for waitstaff.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-black text-stone-900 mb-1.5">100% Hygienic & Fresh</h3>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
              Every dish is freshly cooked to order with farm-sourced produce, authentic whole spices, and zero harmful additives.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <Receipt size={24} />
            </div>
            <h3 className="text-base font-black text-stone-900 mb-1.5">Multi-Round Dine-In</h3>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
              Order starters first, add main courses and desserts in subsequent rounds on the same table bill effortlessly.
            </p>
          </div>

        </div>
      </section>

      {/* About Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 sm:gap-12 items-center bg-white p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-stone-200/80 shadow-xs">

          <div>
            <span className="text-xs font-black uppercase text-orange-600 tracking-widest block mb-2">
              Our Culinary Heritage
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mb-4 leading-tight">
              Crafting Memorable Flavors With Traditional Mastery
            </h2>

            <p className="text-stone-600 text-sm sm:text-base mb-4 leading-relaxed">
              Foodie Delight was founded with a passion for bringing authentic royal recipes and bold regional delicacies to contemporary food lovers.
            </p>

            <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-6">
              From clay-oven tandoori breads and signature dum biryanis to vibrant sizzlers, every plate is an celebration of aroma and taste.
            </p>

            <div className="flex items-center gap-6 pt-4 border-t border-stone-100">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-stone-900 block">50k+</span>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Happy Diners</span>
              </div>
              <div className="w-px h-10 bg-stone-200" />
              <div>
                <span className="text-2xl sm:text-3xl font-black text-stone-900 block">4.9 ★</span>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Customer Rating</span>
              </div>
              <div className="w-px h-10 bg-stone-200" />
              <div>
                <span className="text-2xl sm:text-3xl font-black text-stone-900 block">3</span>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Cities</span>
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-4/3 shadow-md group">
            <img
              src="/restaurant.jpg"
              alt="Restaurant Ambience"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-linear-to-t from-stone-950/60 via-transparent to-transparent flex items-end p-6">
              <span className="text-white text-xs font-bold uppercase tracking-widest bg-stone-900/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
                Premium Dine-in Ambience
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* Outlets Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-black uppercase text-orange-600 tracking-widest block mb-1">
            Locations
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900">
            Visit Our Outlets
          </h2>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            Experience our hospitality across premier metropolitan dining hubs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
          
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:border-orange-200 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-black text-stone-900">Chennai</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Open Now
                </span>
              </div>
              <p className="text-stone-600 text-xs sm:text-sm mb-4 leading-relaxed">
                Anna Nagar, T Nagar, Velachery Hubs
              </p>
            </div>
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-500">
              <span className="flex items-center gap-1"><Clock size={13} /> 11 AM - 11 PM</span>
              <span className="flex items-center gap-1 text-orange-600"><MapPin size={13} /> Dine-in & Parcel</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:border-orange-200 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-black text-stone-900">Bangalore</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Open Now
                </span>
              </div>
              <p className="text-stone-600 text-xs sm:text-sm mb-4 leading-relaxed">
                Koramangala 5th Block, Whitefield
              </p>
            </div>
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-500">
              <span className="flex items-center gap-1"><Clock size={13} /> 11 AM - 11 PM</span>
              <span className="flex items-center gap-1 text-orange-600"><MapPin size={13} /> Dine-in & Parcel</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:border-orange-200 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-black text-stone-900">Hyderabad</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Open Now
                </span>
              </div>
              <p className="text-stone-600 text-xs sm:text-sm mb-4 leading-relaxed">
                Jubilee Hills Road 36, Banjara Hills
              </p>
            </div>
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-500">
              <span className="flex items-center gap-1"><Clock size={13} /> 11 AM - 11 PM</span>
              <span className="flex items-center gap-1 text-orange-600"><MapPin size={13} /> Dine-in & Parcel</span>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-stone-900 text-stone-400 py-10 px-4 sm:px-6 text-sm border-t border-stone-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white">
              <UtensilsCrossed size={16} />
            </div>
            <span className="font-black text-white text-base">Foodie Delight</span>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold">
            <Link href={menuLink} className="hover:text-white transition">Menu</Link>
            <Link href="/customer/parcel" className="hover:text-white transition">Takeaway</Link>
            <Link href="/login" className="hover:text-white transition">Staff Login</Link>
          </div>

          <p className="text-xs text-stone-500">
            © {new Date().getFullYear()} Foodie Delight. All Rights Reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
