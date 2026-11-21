"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Star,
  UtensilsCrossed,
  Sparkles,
  Heart,
  ThumbsUp,
  MessageSquare,
  User,
  Phone,
  CheckCircle2,
  ArrowLeft,
  Store,
  MapPin,
  Smile,
  Send,
} from "lucide-react";

const POSITIVE_TAGS = [
  "Delicious Food",
  "Fast Service",
  "Polite Staff",
  "Warm Ambience",
  "Clean & Hygienic",
  "Great Value",
  "Fresh Ingredients",
  "Loved the Desserts",
];

const CRITICAL_TAGS = [
  "Long Wait Time",
  "Food Temperature",
  "Order Delay",
  "Noisy Environment",
  "Portion Size",
];

const RATING_DESCRIPTIONS: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Needs Serious Improvement", subtitle: "We are truly sorry your visit did not meet expectations." },
  2: { title: "Below Expectations", subtitle: "Please let us know what we could have done better." },
  3: { title: "Average / Fair", subtitle: "Good, but we aim for great. How can we improve?" },
  4: { title: "Very Good!", subtitle: "Glad you enjoyed your dining experience!" },
  5: { title: "Exceptional! Loved It!", subtitle: "Thank you for the warm praise! You made our day." },
};

function FeedbackFormContent() {
  const searchParams = useSearchParams();
  const queryTable = searchParams.get("table");

  const [tableNumber, setTableNumber] = useState<string>(queryTable || "");
  const [overallRating, setOverallRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Aspect ratings
  const [foodRating, setFoodRating] = useState<number>(0);
  const [serviceRating, setServiceRating] = useState<number>(0);
  const [ambienceRating, setAmbienceRating] = useState<number>(0);

  // Tags & Comments
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (queryTable) {
      setTableNumber(queryTable);
    }
  }, [queryTable]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overallRating || overallRating < 1) {
      setErrorMessage("Please select an overall rating.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiUrl}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "qr_standee",
          tableNumber: tableNumber ? parseInt(tableNumber, 10) : null,
          overallRating,
          foodRating: foodRating > 0 ? foodRating : null,
          serviceRating: serviceRating > 0 ? serviceRating : null,
          ambienceRating: ambienceRating > 0 ? ambienceRating : null,
          tags: selectedTags,
          comment: comment.trim() || null,
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit feedback. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating || overallRating;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-4 sm:p-6 text-stone-900 font-sans">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 border border-stone-200/80 shadow-xl text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-linear-to-tr from-emerald-500 to-teal-600 rounded-3xl text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/25">
            <CheckCircle2 size={42} strokeWidth={2.5} />
          </div>

          <h2 className="text-2xl font-black text-stone-900 tracking-tight mb-2">
            Thank You So Much!
          </h2>
          <p className="text-stone-500 text-xs sm:text-sm leading-relaxed mb-6 font-medium">
            Your review and ratings have been shared directly with our executive chef and restaurant management team.
          </p>

          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-center justify-center gap-2 mb-6">
            <div className="flex gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={18}
                  fill={s <= overallRating ? "currentColor" : "none"}
                  className={s <= overallRating ? "text-amber-400" : "text-stone-200"}
                />
              ))}
            </div>
            <span className="text-xs font-black text-stone-800">
              {overallRating} / 5 Stars Logged
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            <Link
              href="/"
              className="w-full bg-stone-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-md"
            >
              Return to Foodie Delight
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 flex flex-col font-sans selection:bg-orange-500/20">
      
      {/* Top Header */}
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-stone-200/60 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <UtensilsCrossed size={18} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-stone-900 block leading-tight">
              Foodie Delight
            </span>
            <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest block">
              Guest Feedback & Review
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 transition shadow-2xs"
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </Link>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 pb-16">
        
        {/* Intro Hero Banner */}
        <div className="text-center mb-6 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/70 text-orange-800 text-[10px] font-black uppercase tracking-wider mb-2.5">
            <Sparkles size={12} className="text-orange-600" />
            <span>We Value Your Opinion</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            How was your dining experience?
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm font-medium mt-1">
            Takes less than a minute. Your honest thoughts help us serve you better every day.
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Table / Location Info Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                    Dining Location
                  </label>
                  <p className="text-xs font-black text-stone-800">
                    {tableNumber ? `Table #${tableNumber}` : "Exit / Counter / Takeaway"}
                  </p>
                </div>
              </div>

              <div className="w-28">
                <input
                  type="number"
                  placeholder="Table #"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-center focus:bg-white focus:border-orange-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Overall Rating (Primary 5 Stars) */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-2xs text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-3">
              Overall Experience *
            </span>

            {/* Stars Row */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setOverallRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 sm:p-2 cursor-pointer transform hover:scale-115 active:scale-95 transition-all"
                  aria-label={`Rate ${star} Stars`}
                >
                  <Star
                    size={36}
                    strokeWidth={1.75}
                    className={`transition-colors ${
                      star <= activeRating
                        ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                        : "text-stone-200 hover:text-amber-200"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Description Text */}
            <h3 className="text-base font-black text-stone-900 transition-all">
              {RATING_DESCRIPTIONS[activeRating]?.title || "Rate Your Visit"}
            </h3>
            <p className="text-xs text-stone-400 font-medium mt-0.5">
              {RATING_DESCRIPTIONS[activeRating]?.subtitle}
            </p>
          </div>

          {/* Aspect Ratings (Food, Service, Ambience) */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-black text-stone-900">
                Category Ratings (Optional)
              </span>
              <span className="text-[10px] font-bold text-stone-400">1-Tap Stars</span>
            </div>

            {/* Food Rating */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={16} className="text-orange-500" />
                <span className="text-xs font-bold text-stone-700">Food & Taste</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFoodRating(foodRating === s ? 0 : s)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      size={20}
                      className={s <= foodRating ? "text-amber-400 fill-amber-400" : "text-stone-200"}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Service Rating */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-rose-500" />
                <span className="text-xs font-bold text-stone-700">Staff & Service</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setServiceRating(serviceRating === s ? 0 : s)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      size={20}
                      className={s <= serviceRating ? "text-amber-400 fill-amber-400" : "text-stone-200"}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Ambience Rating */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <span className="text-xs font-bold text-stone-700">Vibe & Ambience</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAmbienceRating(ambienceRating === s ? 0 : s)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      size={20}
                      className={s <= ambienceRating ? "text-amber-400 fill-amber-400" : "text-stone-200"}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Praise & Issue Tags */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-2.5">
              What Stood Out? (Select any that apply)
            </span>
            <div className="flex flex-wrap gap-2">
              {POSITIVE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-orange-600 text-white shadow-xs"
                        : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
              {overallRating <= 3 &&
                CRITICAL_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Detailed Comment Box */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={15} className="text-stone-400" />
              <label className="text-xs font-black text-stone-800">
                Detailed Thoughts (Optional)
              </label>
            </div>
            <textarea
              rows={3}
              placeholder="What made your meal memorable? What could we polish further?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium focus:bg-white focus:border-orange-500 outline-none transition resize-none placeholder:text-stone-400"
            />
          </div>

          {/* Optional Guest Name & Phone */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-black text-stone-800">
                Contact Info (100% Optional)
              </span>
              <span className="text-[10px] font-bold text-stone-400">Never Spammed</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                  Your Name
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul S."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                  Phone / WhatsApp
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="tel"
                    placeholder="e.g. 98765-43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-orange-600/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send size={15} />
                <span>Submit Dining Feedback</span>
              </>
            )}
          </button>
        </form>
      </main>

    </div>
  );
}

export default function StandaloneFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center font-bold text-stone-500">
          Loading Feedback Portal...
        </div>
      }
    >
      <FeedbackFormContent />
    </Suspense>
  );
}
