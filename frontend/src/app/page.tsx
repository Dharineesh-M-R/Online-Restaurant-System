"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { getApiUrl } from "@/lib/utils";
// GSAP replaced with reliable CSS transitions
import {
  UtensilsCrossed,
  ShoppingBag,
  Receipt,
  Sparkles,
  Clock,
  ShieldCheck,
  ChevronRight,
  UserCircle,
  PhoneCall,
  MapPin,
  Star,
  MessageSquare,
  QrCode,
  ArrowRight,
  Heart,
  CheckCircle2,
  ChefHat,
  CreditCard,
  Smartphone,
  ExternalLink,
  Flame,
} from "lucide-react";


interface PublicDish {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string | null;
  categories?: { name: string } | null;
}

interface PublicReview {
  id: string;
  overall_rating: number;
  comment?: string | null;
  tags?: string[] | null;
  customer_name?: string | null;
  created_at: string;
}

interface LandingStats {
  avgRating: number;
  totalReviews: number;
}

export default function HomePage() {
  const router = useRouter();
  const { tableNumber, cartCount } = useCart();

  const [dishes, setDishes] = useState<PublicDish[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [stats, setStats] = useState<LandingStats>({ avgRating: 4.9, totalReviews: 0 });
  const [loadingHighlights, setLoadingHighlights] = useState(true);

  const apiUrl = getApiUrl();

  const isParcel = Number(tableNumber) > 100;
  const menuLink = tableNumber ? `/customer/menu?table=${tableNumber}` : "/customer/menu";
  const cartLink = tableNumber ? `/customer/cart?table=${tableNumber}` : "/customer/cart";

  // Fetch Public Highlights
  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const targetUrl = getApiUrl();
        const res = await fetch(`${targetUrl}/feedback/public-highlights`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.dishes) && data.dishes.length > 0) {
            setDishes(data.dishes);
          }
          if (Array.isArray(data.reviews) && data.reviews.length > 0) {
            setReviews(data.reviews);
          }
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.warn("Could not fetch landing highlights, using defaults:", err);
      } finally {
        setLoadingHighlights(false);
      }
    };

    fetchHighlights();
  }, []);

  const formatReviewDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recent Guest";
    }
  };

  return (
    <div
      className="min-h-screen bg-[#faf9f6] text-stone-900 flex flex-col font-sans selection:bg-orange-500/20 selection:text-orange-900"
    >
      
      {/* ========================================================================= */}
      {/* 1. MINIMAL STICKY HEADER */}
      {/* ========================================================================= */}
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-stone-200/60 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all">
        
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <UtensilsCrossed size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-stone-900 leading-tight">
                Foodie Delight
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Open Now • Til 11:00 PM</span>
              </span>
            </div>
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">
              Gourmet Dining & Quick Parcel
            </span>
          </div>
        </Link>

        {/* Quick Nav Anchor Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-bold text-stone-600">
          <a href="#best-sellers" className="hover:text-orange-600 transition">
            Best Sellers
          </a>
          <a href="#how-it-works" className="hover:text-orange-600 transition">
            How It Works
          </a>
          <a href="#reviews" className="hover:text-orange-600 transition">
            Reviews
          </a>
        </div>

        {/* Right Actions: Active Session Badge + Staff Portal */}
        <div className="flex items-center gap-2.5">
          {tableNumber ? (
            <Link
              href={menuLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-xs whitespace-nowrap shrink-0 ${
                isParcel
                  ? "bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200"
                  : "bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping shrink-0" />
              <span className="whitespace-nowrap">{isParcel ? `Token #${Number(tableNumber) - 100}` : `Table #${tableNumber}`}</span>
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

          {/* Subtle Staff Portal Button */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-2xs"
            title="Terminal Login for Waiter, Kitchen, Billing & Management"
          >
            <UserCircle size={15} />
            <span className="hidden sm:inline">Staff</span> Login
          </Link>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (ABOVE THE FOLD) */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-14 sm:pt-20 sm:pb-20 px-4 sm:px-6">
        {/* Ambient Warm Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-gradient-to-b from-orange-200/40 via-amber-100/20 to-transparent pointer-events-none rounded-full blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide uppercase mb-6 shadow-xs animate-in fade-in slide-in-from-top-3 duration-500">
            <Sparkles size={14} className="text-orange-500 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Digital Dining & Fast Parcel Pickup</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-stone-900 mb-5 leading-[1.1] sm:leading-[1.15] animate-in fade-in slide-in-from-bottom-4 duration-700">
            Authentic Flavors, <br />
            <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
              Served Fresh to Your Table.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-stone-600 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-3 duration-700">
            Browse our live chef catalog, place multi-round table orders without waiting for waitstaff, or order ahead for speedy takeaway parcel pickup.
          </p>

          {/* Active Seating Notification if seated */}
          {tableNumber && (
            <div className="max-w-md mx-auto mb-8 p-3.5 bg-white rounded-2xl border border-orange-200 shadow-md shadow-orange-500/5 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black">
                  {isParcel ? <ShoppingBag size={20} /> : tableNumber}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-stone-900">
                    {isParcel ? `Takeaway Token ${Number(tableNumber) - 100}` : `Seated at Table ${tableNumber}`}
                  </h4>
                  <p className="text-[11px] font-medium text-stone-500">Session active & ready for orders</p>
                </div>
              </div>
              <Link
                href={menuLink}
                className="px-3.5 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition"
              >
                Go to Menu
              </Link>
            </div>
          )}

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 sm:gap-4 max-w-md mx-auto">
            <Link href="/customer/parcel" className="w-full sm:w-auto flex-1">
              <button className="w-full min-h-13 bg-orange-600 hover:bg-orange-700 text-white px-7 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer">
                <ShoppingBag size={18} />
                <span>Order Takeaway Parcel</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <Link href={menuLink} className="w-full sm:w-auto flex-1">
              <button className="w-full min-h-13 bg-stone-900 hover:bg-black text-white px-7 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
                <UtensilsCrossed size={18} />
                <span>Browse Full Menu</span>
              </button>
            </Link>
          </div>

          {/* Micro Meta Links */}
          <div className="flex justify-center items-center gap-6 mt-6 text-xs font-bold text-stone-500 animate-in fade-in duration-700 delay-300">
            <a href="#how-it-works" className="hover:text-orange-600 transition flex items-center gap-1.5">
              <QrCode size={14} className="text-orange-600" />
              <span>How Table QR Works</span>
            </a>
            <span>•</span>
            <Link href="/feedback" className="hover:text-orange-600 transition flex items-center gap-1.5">
              <Star size={14} className="text-amber-500" />
              <span>Share Guest Feedback</span>
            </Link>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. TAKEAWAY & EXPRESS PARCEL COUNTER */}
      {/* ========================================================================= */}
      <section className="py-6 sm:py-10 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-stone-200/80 shadow-xs hover:border-purple-200 hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                <ShoppingBag size={20} />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black uppercase tracking-wider">
                Express Takeaway
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-stone-900 mb-2">
              Takeaway & Parcel Counter
            </h3>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed mb-4 font-medium max-w-2xl">
              Skip the dine-in queue. Place your takeaway order directly on your phone, receive an express pickup token, and collect your hot sealed meal at the counter.
            </p>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-stone-500">
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <CheckCircle2 size={12} /> Live Kitchen Tracking
              </span>
              <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                <CheckCircle2 size={12} /> Freshly Sealed Packaging
              </span>
              <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                <CheckCircle2 size={12} /> Token Screen Sync
              </span>
            </div>
          </div>

          <div className="w-full md:w-auto shrink-0">
            <Link href="/customer/parcel" className="block">
              <button className="w-full md:w-auto min-h-12 px-7 py-3.5 bg-stone-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                <ShoppingBag size={16} />
                <span>Start Takeaway Order</span>
                <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. BEST SELLERS (#best-sellers) */}
      {/* ========================================================================= */}
      <section id="best-sellers" className="py-8 sm:py-12 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        
        {/* Compact Header Row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-600" />
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Best Sellers
            </h2>
          </div>

          <Link href={menuLink}>
            <span className="flex items-center gap-1 text-xs font-black text-orange-600 hover:text-orange-700 transition cursor-pointer">
              <span>View Menu</span>
              <ArrowRight size={14} />
            </span>
          </Link>
        </div>

        {/* Mobile Horizontal Swipe Rail / Desktop Grid */}
        <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible">
          {dishes.length === 0 && !loadingHighlights ? (
            <div className="col-span-full w-full bg-white rounded-2xl p-6 text-center border border-stone-200/80">
              <UtensilsCrossed size={28} className="mx-auto text-stone-300 mb-2" />
              <p className="text-xs text-stone-500 font-bold">Curating our best sellers...</p>
            </div>
          ) : (
            dishes.map((dish) => {
              const categoryName = dish.categories?.name || "";
              const isNonVeg = categoryName.toLowerCase().includes("non veg");
              return (
                <Link
                  key={dish.id}
                  href={menuLink}
                  className="w-[200px] shrink-0 snap-start md:w-auto group bg-white rounded-2xl border border-stone-200/80 hover:border-orange-300 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 p-2.5 flex flex-col justify-between cursor-pointer"
                >
                  {/* Top Image */}
                  <div className="h-32 w-full bg-stone-100 rounded-xl overflow-hidden relative">
                    {dish.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dish.image_url}
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/dish.jpg";
                        }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/dish.jpg"
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>

                  {/* Bottom Area */}
                  <div className="pt-2.5 px-0.5 pb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-3 h-3 border rounded-xs flex items-center justify-center shrink-0 ${
                          isNonVeg ? "border-rose-600" : "border-emerald-600"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isNonVeg ? "bg-rose-600" : "bg-emerald-600"
                          }`}
                        />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                        {dish.name}
                      </h4>
                    </div>
                    <p className="text-sm font-black text-orange-600 mt-1">
                      ₹{dish.price}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 5. "HOW IT WORKS" (3-STEP SCROLL SECTION) (#how-it-works) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-12 sm:py-16 px-4 sm:px-6 bg-white border-y border-stone-200/80">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest block mb-2">
              Fast, Modern & Frictionless
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              How Foodie Delight Works
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-1">
              No downloading apps or creating accounts. Seamless table dining in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-[#faf9f6] border border-stone-200/80 relative hover:border-orange-200 hover:-translate-y-1 hover:shadow-sm transition-all duration-300">
              <span className="text-3xl font-black text-orange-600/30 block mb-3 font-mono">
                01
              </span>
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                <QrCode size={24} />
              </div>
              <h3 className="text-base font-black text-stone-900 mb-2">
                Scan or Select
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-medium mb-3">
                Scan the tabletop QR code or choose takeaway mode. The live menu opens immediately in your browser with real-time stock.
              </p>
              <span className="inline-block text-[10px] font-black uppercase tracking-wider text-orange-600">
                • Zero App Installation
              </span>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-[#faf9f6] border border-stone-200/80 relative hover:border-orange-200 hover:-translate-y-1 hover:shadow-sm transition-all duration-300">
              <span className="text-3xl font-black text-orange-600/30 block mb-3 font-mono">
                02
              </span>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <ChefHat size={24} />
              </div>
              <h3 className="text-base font-black text-stone-900 mb-2">
                Order & Track Live
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-medium mb-3">
                Customize notes for the chef. Orders hit the kitchen display in real time so you can track preparation to table delivery.
              </p>
              <span className="inline-block text-[10px] font-black uppercase tracking-wider text-amber-700">
                • Direct KDS Dispatch
              </span>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-[#faf9f6] border border-stone-200/80 relative hover:border-orange-200 hover:-translate-y-1 hover:shadow-sm transition-all duration-300">
              <span className="text-3xl font-black text-orange-600/30 block mb-3 font-mono">
                03
              </span>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Receipt size={24} />
              </div>
              <h3 className="text-base font-black text-stone-900 mb-2">
                Pay & Review
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-medium mb-3">
                Request your digital itemized bill right from your phone. Settle via UPI, Card, or Cash, and share feedback with 1 tap.
              </p>
              <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-700">
                • Instant Digital Receipt
              </span>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. LIVE GUEST REVIEWS STRIP (#reviews) */}
      {/* ========================================================================= */}
      <section id="reviews" className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider mb-2">
              <Star size={12} fill="currentColor" className="text-amber-500" />
              <span>Verified Diner Feedback</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Loved by Foodies Every Day
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex text-amber-400 gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={15} fill="currentColor" />
                ))}
              </div>
              <span className="text-xs font-black text-stone-900">
                {stats.avgRating} / 5.0 Rating
              </span>
              <span className="text-xs text-stone-400 font-medium">
                • {stats.totalReviews > 0 ? `${stats.totalReviews} reviews logged` : "Top positive reviews"}
              </span>
            </div>
          </div>

          <Link href="/feedback">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-black text-white rounded-2xl text-xs font-black transition cursor-pointer shadow-xs">
              <MessageSquare size={14} />
              <span>Share Your Experience</span>
            </button>
          </Link>
        </div>

        {/* Reviews Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reviews.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl p-8 text-center border border-stone-200/80">
              <Star size={28} className="mx-auto text-amber-400 mb-2" fill="currentColor" />
              <h4 className="text-sm font-black text-stone-800">Warm Hospitality & Fresh Food</h4>
              <p className="text-xs text-stone-400 font-medium mt-1">
                Be among the first to review us using the tabletop QR standee or after requesting your bill!
              </p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:border-amber-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Stars Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex text-amber-400 gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={15}
                          fill={s <= rev.overall_rating ? "currentColor" : "none"}
                          className={s <= rev.overall_rating ? "text-amber-400" : "text-stone-200"}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-stone-400">
                      {formatReviewDate(rev.created_at)}
                    </span>
                  </div>

                  {/* Comment */}
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium mb-4 italic">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  {/* Tag Chips */}
                  {rev.tags && rev.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {rev.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customer Name */}
                <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-xs font-black">
                    {(rev.customer_name || "Guest").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-stone-900 leading-none">
                      {rev.customer_name || "Anonymous Guest"}
                    </h5>
                    <span className="text-[10px] text-emerald-600 font-bold">Verified Diner</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 7. PRACTICAL FOOTER WITH STAFF OPERATIONS COLUMN */}
      {/* ========================================================================= */}
      <footer className="mt-auto bg-stone-900 text-white pt-14 pb-10 px-4 sm:px-8 border-t border-stone-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10 pb-10 border-b border-stone-800 text-xs">
          
          {/* Col 1: Brand & Details */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black">
                <UtensilsCrossed size={18} />
              </div>
              <span className="text-base font-black tracking-tight">Foodie Delight</span>
            </div>
            <p className="text-stone-400 text-xs leading-relaxed max-w-sm font-medium">
              Authentic Indian gourmet dining & quick parcel pickup powered by smart digital tables and real-time kitchen orchestration.
            </p>
            <div className="space-y-1.5 pt-2 text-stone-300 font-medium">
              <p className="flex items-center gap-2">
                <Clock size={14} className="text-orange-500 shrink-0" />
                <span>Operating Hours: 10:00 AM – 11:00 PM (All 7 Days)</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-orange-500 shrink-0" />
                <span>124 Gourmet Boulevard, Central City Dine-In Hub</span>
              </p>
              <p className="flex items-center gap-2">
                <PhoneCall size={14} className="text-orange-500 shrink-0" />
                <span>Guest Assistance: +91 98765 43210</span>
              </p>
            </div>
          </div>

          {/* Col 2: Guest Quick Links */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block mb-3">
              Diner Navigation
            </span>
            <ul className="space-y-2 text-stone-400 font-medium">
              <li>
                <Link href={menuLink} className="hover:text-white transition">
                  Browse Full Menu
                </Link>
              </li>
              <li>
                <Link href="/customer/parcel" className="hover:text-white transition">
                  Takeaway & Parcel Order
                </Link>
              </li>
              <li>
                <Link href={cartLink} className="hover:text-white transition">
                  View Current Cart {cartCount > 0 && `(${cartCount})`}
                </Link>
              </li>
              <li>
                <Link href={tableNumber ? `/customer/getbill?table=${tableNumber}` : "/customer/getbill"} className="hover:text-white transition">
                  Track Active Bill
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="hover:text-white transition">
                  Share Guest Feedback
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Staff Operations Portal Links */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block mb-3">
              Staff Terminals
            </span>
            <ul className="space-y-2 text-stone-400 font-medium">
              <li>
                <Link href="/waiter" className="hover:text-white transition flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Waiter Copilot</span>
                </Link>
              </li>
              <li>
                <Link href="/kitchen" className="hover:text-white transition flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Kitchen Display (KDS)</span>
                </Link>
              </li>
              <li>
                <Link href="/billing" className="hover:text-white transition flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Cashier & Billing Desk</span>
                </Link>
              </li>
              <li>
                <Link href="/management" className="hover:text-white transition flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span>Management Portal</span>
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-orange-400 hover:text-orange-300"
                >
                  <UserCircle size={13} />
                  <span>Staff Sign In</span>
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-500 text-[11px] font-medium">
          <p>© 2026 Foodie Delight Restaurant Operations. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Role-Based Access & Live Supabase Sync Protected</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
