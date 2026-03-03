"use client";

import { Category } from "../types";

interface Props {
  selectedCategory: Category | "All";
  setSelectedCategory: (value: Category | "All") => void;
}

const categories: (Category | "All")[] = [
  "All",
  "Starters",
  "Curries",
  "Rices",
  "Noodles",
  "Biryanis",
];

export default function CategoryTabs({
  selectedCategory,
  setSelectedCategory,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => setSelectedCategory(cat)}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedCategory === cat
              ? "bg-green-600 text-white"
              : "bg-white text-black border hover:bg-gray-100"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}