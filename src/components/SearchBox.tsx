import React from "react";
import { Search, MapPin, RefreshCw, X, HelpCircle, Activity } from "lucide-react";

interface SearchBoxProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchField: string;
  setSearchField: (field: string) => void;
  selectedArea: string;
  setSelectedArea: (area: string) => void;
  areas: string[];
  isLoadingAreas: boolean;
  onClear: () => void;
}

export default function SearchBox({
  searchQuery,
  setSearchQuery,
  searchField,
  setSearchField,
  selectedArea,
  setSelectedArea,
  areas,
  isLoadingAreas,
  onClear
}: SearchBoxProps) {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">অনুসন্ধান ফিল্টার / Search Filters</h2>
        {searchQuery && (
          <button
            onClick={onClear}
            className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded border border-red-200/50 transition-colors"
          >
            পরিষ্কার করুন
          </button>
        )}
      </div>

      {/* 1. Search Query Input */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 block">সার্চ কুয়েরি (Search Query)</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="নাম, ভোটার আইডি নং বা ঠিকানা..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={onClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Fields Dropdown */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 block">অনুসন্ধানের ক্ষেত্র (Search Field)</label>
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all font-medium cursor-pointer"
        >
          <option value="all">সব তথ্য খুঁজুন (All Fields)</option>
          <option value="name">নাম (Voter Name)</option>
          <option value="fathersName">পিতার নাম (Father's Name)</option>
          <option value="mothersName">মাতার নাম (Mother's Name)</option>
          <option value="voterNo">ভোটার আইডি নং (Voter No)</option>
          <option value="dob">জন্ম তারিখ (Date of Birth)</option>
          <option value="address">ঠিকানা (Address)</option>
        </select>
      </div>

      {/* 3. Filter Area Dropdown */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 block">ভোটার এলাকা (Voter Area)</label>
        <div className="relative">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded pl-8 pr-2.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all font-medium cursor-pointer appearance-none"
            disabled={isLoadingAreas}
          >
            <option value="All Areas">সব এলাকা (All Areas)</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {isLoadingAreas ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            )}
          </div>
        </div>
      </div>

      {/* Live System Indicator */}
      <div className="pt-2">
        <div className="w-full py-2 px-3 bg-emerald-50 border border-emerald-100 rounded flex items-center justify-between text-emerald-800 text-[11px] font-medium shadow-2xs">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            লাইভ সার্চ সক্রিয় (Auto-Searching)
          </span>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
        </div>
      </div>

      {/* Informative Help Tips */}
      <div className="pt-2 border-t border-slate-100">
        <div className="bg-blue-50 border border-blue-100 rounded p-3 text-[10px] leading-normal text-blue-700">
          <p className="font-bold flex items-center gap-1 mb-1">
            <HelpCircle className="w-3 h-3 text-blue-500 shrink-0" />
            কুইক টিপস:
          </p>
          <p className="leading-relaxed">
            বাংলায় ইউনিকোড টাইপ করে আংশিক শব্দেও সার্চ করতে পারেন। ভোটার নম্বর অথবা জন্ম তারিখ (যেমন <code className="font-mono bg-white px-0.5 py-0.2 rounded border border-gray-200">1990-12-31</code>) ফিল্টার ব্যবহার করুন।
          </p>
        </div>
      </div>
    </div>
  );
}
