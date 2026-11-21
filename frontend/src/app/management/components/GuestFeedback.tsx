"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getApiUrl } from "@/lib/utils";
import {
  Star,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  Download,
  Copy,
  Printer,
  X,
  ExternalLink,
  MessageSquare,
  Sparkles,
  UtensilsCrossed,
  Heart,
  Store,
  Phone,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ThumbsUp,
  SlidersHorizontal,
} from "lucide-react";

interface FeedbackRecord {
  id: string;
  source: "bill_request" | "qr_standee";
  order_id?: string | null;
  session_id?: string | null;
  table_number?: number | null;
  waiter_id?: string | null;
  overall_rating: number;
  food_rating?: number | null;
  service_rating?: number | null;
  ambience_rating?: number | null;
  tags?: string[] | null;
  comment?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  is_resolved: boolean;
  created_at: string;
  staff?: {
    id: string;
    name: string;
    employee_id: string;
  } | null;
}

interface FeedbackKPIs {
  totalCount: number;
  avgOverall: number;
  avgFood: number;
  avgService: number;
  avgAmbience: number;
  unresolvedLowCount: number;
  ratingDistribution: Record<number, number>;
}

export default function GuestFeedback() {
  const [reviews, setReviews] = useState<FeedbackRecord[]>([]);
  const [kpis, setKpis] = useState<FeedbackKPIs>({
    totalCount: 0,
    avgOverall: 0,
    avgFood: 0,
    avgService: 0,
    avgAmbience: 0,
    unresolvedLowCount: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<"all" | "5" | "low">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "bill_request" | "qr_standee">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unresolved" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // QR Code Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTableInput, setQrTableInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const apiUrl = getApiUrl();

  // Fetch Feedback & Analytics
  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/feedback/management`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (data.kpis) setKpis(data.kpis);
      }
    } catch (err) {
      console.error("Error fetching guest feedback:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Toggle Resolve
  const handleToggleResolve = async (id: string, currentStatus: boolean) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`${apiUrl}/feedback/management/${id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_resolved: !currentStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, is_resolved: !currentStatus } : r))
        );
        // Refresh KPIs
        setKpis((prev) => {
          const delta = !currentStatus ? -1 : 1;
          const review = reviews.find((r) => r.id === id);
          const isLow = review && review.overall_rating <= 3;
          return {
            ...prev,
            unresolvedLowCount: isLow ? Math.max(0, prev.unresolvedLowCount + delta) : prev.unresolvedLowCount,
          };
        });
      }
    } catch (err) {
      console.error("Failed to update resolution status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Rating filter
      if (ratingFilter === "5" && r.overall_rating !== 5) return false;
      if (ratingFilter === "low" && r.overall_rating > 3) return false;

      // Source filter
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;

      // Status filter
      if (statusFilter === "unresolved" && r.is_resolved) return false;
      if (statusFilter === "resolved" && !r.is_resolved) return false;

      // Search query (name, phone, table, comment, waiter)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.customer_name?.toLowerCase().includes(q);
        const matchesPhone = r.customer_phone?.includes(q);
        const matchesComment = r.comment?.toLowerCase().includes(q);
        const matchesTable = r.table_number?.toString().includes(q);
        const matchesWaiter = r.staff?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesComment && !matchesTable && !matchesWaiter) {
          return false;
        }
      }

      return true;
    });
  }, [reviews, ratingFilter, sourceFilter, statusFilter, searchQuery]);

  // QR URL Generator
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const targetQrUrl = qrTableInput.trim()
    ? `${currentOrigin}/feedback?table=${encodeURIComponent(qrTableInput.trim())}`
    : `${currentOrigin}/feedback`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    targetQrUrl
  )}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(targetQrUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `foodie-delight-feedback-qr${qrTableInput ? `-table-${qrTableInput}` : ""}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(qrImageUrl, "_blank");
    }
  };

  const formatISTDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
              Customer Experience Hub
            </span>
            <span className="text-xs text-stone-400 font-bold">• Unified Standee & Bill Reviews</span>
          </div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight mt-1">
            Guest Feedback & Ratings Intelligence
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Monitor real-time diner sentiment, food quality, staff service, and resolve critical table feedback.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Refresh Button */}
          <button
            onClick={fetchFeedback}
            className="p-2.5 rounded-2xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Standalone Feedback QR Generator Modal Trigger */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black shadow-xs shadow-orange-600/25 transition cursor-pointer"
          >
            <QrCode size={16} />
            <span>Feedback QR Code</span>
          </button>
        </div>
      </div>

      {/* Top KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Overall Rating Card */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
              Overall Score
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Star size={15} fill="currentColor" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-stone-900">
              {kpis.avgOverall > 0 ? kpis.avgOverall : "—"}
            </span>
            <span className="text-xs font-bold text-stone-400">/ 5.0</span>
          </div>
          <p className="text-[10px] text-stone-400 font-medium mt-1">
            Based on {kpis.totalCount} {kpis.totalCount === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Food Score */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
              Food & Taste
            </span>
            <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <UtensilsCrossed size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-orange-600">
              {kpis.avgFood > 0 ? kpis.avgFood : "—"}
            </span>
            <span className="text-xs font-bold text-stone-400">★</span>
          </div>
          <p className="text-[10px] text-stone-400 font-medium mt-1">Kitchen quality rating</p>
        </div>

        {/* Service Score */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
              Staff Service
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-rose-600">
              {kpis.avgService > 0 ? kpis.avgService : "—"}
            </span>
            <span className="text-xs font-bold text-stone-400">★</span>
          </div>
          <p className="text-[10px] text-stone-400 font-medium mt-1">Waiter & speed rating</p>
        </div>

        {/* Ambience Score */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
              Vibe & Ambience
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-purple-600">
              {kpis.avgAmbience > 0 ? kpis.avgAmbience : "—"}
            </span>
            <span className="text-xs font-bold text-stone-400">★</span>
          </div>
          <p className="text-[10px] text-stone-400 font-medium mt-1">Environment & comfort</p>
        </div>

        {/* Needs Attention Alert Card */}
        <div className={`p-5 rounded-3xl border shadow-xs transition-all ${
          kpis.unresolvedLowCount > 0
            ? "bg-rose-50/70 border-rose-200"
            : "bg-white border-stone-200/80"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${
              kpis.unresolvedLowCount > 0 ? "text-rose-700" : "text-stone-400"
            }`}>
              Needs Attention
            </span>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              kpis.unresolvedLowCount > 0 ? "bg-rose-600 text-white animate-pulse" : "bg-stone-100 text-stone-400"
            }`}>
              <AlertTriangle size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-black ${
              kpis.unresolvedLowCount > 0 ? "text-rose-700" : "text-stone-400"
            }`}>
              {kpis.unresolvedLowCount}
            </span>
            <span className="text-xs font-bold text-stone-400">Open</span>
          </div>
          <p className={`text-[10px] font-medium mt-1 ${
            kpis.unresolvedLowCount > 0 ? "text-rose-600 font-bold" : "text-stone-400"
          }`}>
            {kpis.unresolvedLowCount > 0 ? "Unresolved reviews ≤ 3★" : "All low ratings resolved"}
          </p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search name, phone, table #, comment, waiter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium focus:bg-white focus:border-orange-500 outline-none transition"
          />
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          
          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as any)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800"
          >
            <option value="all">All Stars</option>
            <option value="5">5★ Only</option>
            <option value="low">Alerts (≤ 3★)</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800"
          >
            <option value="all">All Sources</option>
            <option value="qr_standee">QR Standees</option>
            <option value="bill_request">Bill Request</option>
          </select>

          {/* Resolution Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800"
          >
            <option value="all">All Resolution</option>
            <option value="unresolved">Unresolved Only</option>
            <option value="resolved">Resolved Only</option>
          </select>

          {(ratingFilter !== "all" || sourceFilter !== "all" || statusFilter !== "all" || searchQuery) && (
            <button
              onClick={() => {
                setRatingFilter("all");
                setSourceFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="text-xs text-rose-600 font-bold px-2 py-1 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

      </div>

      {/* Reviews Feed List */}
      <div className="space-y-3.5">
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-xs">
            <MessageSquare size={36} className="mx-auto text-stone-300 mb-3" />
            <h3 className="text-base font-black text-stone-900 mb-1">
              No Guest Feedback Found
            </h3>
            <p className="text-xs text-stone-400 font-medium max-w-sm mx-auto">
              {reviews.length === 0
                ? "No customer reviews logged yet. Place table QR standees or customers will review when requesting their bill."
                : "No reviews match your current filters. Try resetting the filter controls."}
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const isLow = review.overall_rating <= 3;
            const isUpdating = updatingId === review.id;

            return (
              <div
                key={review.id}
                className={`bg-white rounded-3xl p-5 border transition-all shadow-xs ${
                  isLow && !review.is_resolved
                    ? "border-rose-200 ring-2 ring-rose-500/10"
                    : "border-stone-200/80 hover:border-stone-300"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                  
                  {/* Left: Stars & Details */}
                  <div className="flex items-start gap-3.5">
                    {/* Big Rating Badge */}
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
                      review.overall_rating >= 4
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : review.overall_rating === 3
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      <span className="text-lg font-black leading-none">{review.overall_rating}</span>
                      <span className="text-[10px] font-bold">★</span>
                    </div>

                    <div>
                      {/* Name & Origin Badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-stone-900">
                          {review.customer_name || "Anonymous Diner"}
                        </span>

                        {/* Source Tag */}
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          review.source === "bill_request"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}>
                          {review.source === "bill_request" ? "Bill Request" : "QR Standee"}
                        </span>

                        {/* Dining Location */}
                        <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                          {review.table_number ? `Table #${review.table_number}` : "Counter Standee"}
                        </span>

                        {/* Waiter Attribution if present */}
                        {review.staff?.name && (
                          <span className="text-[10px] font-bold text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full">
                            Waiter: {review.staff.name} ({review.staff.employee_id})
                          </span>
                        )}
                      </div>

                      {/* Timestamp & Phone */}
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{formatISTDate(review.created_at)}</span>
                        </span>

                        {review.customer_phone && (
                          <span className="flex items-center gap-1 text-stone-500 font-bold">
                            <Phone size={12} />
                            <span>{review.customer_phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Resolution Status & Action */}
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    {review.is_resolved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                        <CheckCircle2 size={13} />
                        <span>Resolved</span>
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black">
                        <AlertTriangle size={13} />
                        <span>Needs Action</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold">
                        Logged
                      </span>
                    )}

                    {/* Toggle Resolve Button */}
                    <button
                      onClick={() => handleToggleResolve(review.id, review.is_resolved)}
                      disabled={isUpdating}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer disabled:opacity-50 ${
                        review.is_resolved
                          ? "bg-stone-100 hover:bg-stone-200 text-stone-700"
                          : "bg-stone-900 hover:bg-black text-white shadow-xs"
                      }`}
                    >
                      {isUpdating
                        ? "Saving..."
                        : review.is_resolved
                        ? "Mark Unresolved"
                        : "Mark Resolved"}
                    </button>
                  </div>
                </div>

                {/* Aspect Ratings Row */}
                {(review.food_rating || review.service_rating || review.ambience_rating) && (
                  <div className="flex items-center gap-3 text-xs font-bold text-stone-600 bg-stone-50/80 px-3.5 py-2 rounded-2xl mb-3 border border-stone-100 flex-wrap">
                    {review.food_rating && (
                      <span className="flex items-center gap-1">
                        <UtensilsCrossed size={12} className="text-orange-600" />
                        <span>Food:</span>
                        <span className="text-stone-900 font-black">{review.food_rating}★</span>
                      </span>
                    )}
                    {review.service_rating && (
                      <span className="flex items-center gap-1">
                        <Heart size={12} className="text-rose-600" />
                        <span>Service:</span>
                        <span className="text-stone-900 font-black">{review.service_rating}★</span>
                      </span>
                    )}
                    {review.ambience_rating && (
                      <span className="flex items-center gap-1">
                        <Sparkles size={12} className="text-purple-600" />
                        <span>Ambience:</span>
                        <span className="text-stone-900 font-black">{review.ambience_rating}★</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Selected Tags Chips */}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {review.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50/80 text-orange-800 border border-orange-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comment Text */}
                {review.comment && (
                  <p className="text-xs text-stone-700 leading-relaxed bg-[#faf9f6] p-3 rounded-2xl border border-stone-200/60 font-medium">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: FEEDBACK QR CODE GENERATOR */}
      {/* ========================================================================= */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <QrCode size={18} />
                </div>
                <h3 className="text-base font-black text-stone-900">
                  Guest Feedback Standee QR
                </h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-500 font-medium mb-4">
              Print or display this scannable QR code on dining tables, acrylic standees, or the exit counter.
            </p>

            {/* Optional Table Number Selector */}
            <div className="mb-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                Link Specific Table (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Leave empty for Exit/General Standee"
                  value={qrTableInput}
                  onChange={(e) => setQrTableInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:border-orange-500 outline-none transition"
                />
                {qrTableInput && (
                  <button
                    onClick={() => setQrTableInput("")}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* QR Code Graphic Container */}
            <div className="bg-[#faf9f6] p-6 rounded-3xl border border-stone-200/80 flex flex-col items-center justify-center text-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="Feedback QR Code"
                width={200}
                height={200}
                className="rounded-2xl border-2 border-white shadow-md bg-white p-2 mb-3"
              />
              <span className="text-xs font-black text-stone-900">
                {qrTableInput ? `Dining Table #${qrTableInput} Standee` : "Exit & Counter Feedback Standee"}
              </span>
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 max-w-xs truncate">
                {targetQrUrl}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={handleDownloadQr}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-600/20 transition cursor-pointer"
              >
                <Download size={14} />
                <span>Download PNG</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Copy size={14} />
                <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
              </button>
            </div>

            <a
              href={targetQrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1 text-[11px] text-stone-500 hover:text-orange-600 font-bold py-1.5 text-center transition"
            >
              <span>Test Feedback URL in New Tab</span>
              <ExternalLink size={12} />
            </a>

          </div>
        </div>
      )}

    </div>
  );
}
