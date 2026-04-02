"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCart } from "./customer/component/cartContext"; 

export default function HomePage() {
  const { tableNumber } = useCart();

  // FIX: Conditionally build the URLs so we don't accidentally pass "null" as a string
  const menuLink = tableNumber ? `/customer/menu?table=${tableNumber}` : "/customer/menu";
  const cartLink = tableNumber ? `/customer/cart?table=${tableNumber}` : "/customer/cart";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">

      {/* Hero Section */}
      <section className="bg-linear-to-r from-orange-500 to-red-500 text-white py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">

          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6 leading-tight"
          >
            Welcome to Foodie Delight 🍽️
          </motion.h1>

          <p className="text-sm sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Experience the taste of tradition blended with modern flavors.
            Order your favorite dishes from our multiple outlets with ease.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            {/* Using the safe links defined above */}
            <Link href={menuLink} className="w-full sm:w-auto">
              <button className="w-full sm:w-auto min-h-12 bg-white text-orange-600 px-6 py-3 rounded-xl font-semibold shadow-md active:scale-95 transition">
                View Menu
              </button>
            </Link>

            <Link href={cartLink} className="w-full sm:w-auto">
              <button className="w-full sm:w-auto min-h-12 bg-black text-white px-6 py-3 rounded-xl font-semibold shadow-md active:scale-95 transition">
                View Cart
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 sm:gap-12 items-center">

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
              About Our Restaurant
            </h2>

            <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">
              Foodie Delight was founded with a passion for serving authentic
              and high-quality cuisine. We focus on fresh ingredients,
              hygienic preparation, and delivering happiness with every bite.
            </p>

            <p className="text-gray-600 text-sm sm:text-base">
              Whether you're dining in or ordering online, we ensure
              a seamless and delightful experience.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img
              src="/restaurant.jpg"
              alt="Restaurant"
              className="w-full h-60 sm:h-80 object-cover"
            />
          </div>

        </div>
      </section>

      {/* Outlets Section */}
      <section className="bg-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">

          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            Our Outlets
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">

            <div className="bg-gray-100 p-5 sm:p-6 rounded-2xl shadow-md active:scale-[0.98] transition">
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                Chennai
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Anna Nagar, T Nagar, Velachery
              </p>
            </div>

            <div className="bg-gray-100 p-5 sm:p-6 rounded-2xl shadow-md active:scale-[0.98] transition">
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                Bangalore
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Koramangala, Whitefield
              </p>
            </div>

            <div className="bg-gray-100 p-5 sm:p-6 rounded-2xl shadow-md active:scale-[0.98] transition">
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                Hyderabad
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Jubilee Hills, Banjara Hills
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-5 text-center text-sm sm:text-base">
        <p>© 2026 Foodie Delight. All Rights Reserved.</p>
      </footer>

    </div>
  );
}