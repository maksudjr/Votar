import React, { useState } from "react";
import { Voter } from "../types";
import { User, ShieldAlert, Calendar, MapPin, Edit, Trash2, Check, X } from "lucide-react";

interface VoterCardProps {
  key?: React.Key;
  voter: Voter;
  isAdmin: boolean;
  onEdit: (id: string, updated: Partial<Voter>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export default function VoterCard({ voter, isAdmin, onEdit, onDelete }: VoterCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState({
    name: voter.name,
    fathersName: voter.fathersName,
    mothersName: voter.mothersName,
    voterNo: voter.voterNo,
    dob: voter.dob,
    address: voter.address,
    area: voter.area,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onEdit(voter.id, edited);
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEdited({
      name: voter.name,
      fathersName: voter.fathersName,
      mothersName: voter.mothersName,
      voterNo: voter.voterNo,
      dob: voter.dob,
      address: voter.address,
      area: voter.area,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-bd-green-600 rounded-xl p-6 shadow-md transition-all">
        <h4 className="text-sm font-semibold text-bd-green-800 mb-4 flex items-center gap-1.5 font-display">
          <Edit className="w-4 h-4 text-bd-green-600" />
          ভোটার তথ্য সম্পাদনা (Edit Voter Information)
        </h4>
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ভোটারের নাম (Voter Name)</label>
            <input
              type="text"
              value={edited.name}
              onChange={(e) => setEdited({ ...edited, name: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-bd-green-600 focus:border-bd-green-600 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">পিতার নাম (Father's Name)</label>
              <input
                type="text"
                value={edited.fathersName}
                onChange={(e) => setEdited({ ...edited, fathersName: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-bd-green-600 focus:border-bd-green-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">মাতার নাম (Mother's Name)</label>
              <input
                type="text"
                value={edited.mothersName}
                onChange={(e) => setEdited({ ...edited, mothersName: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-bd-green-600 focus:border-bd-green-600 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ভোটার নম্বর / NID (Voter / NID No)</label>
              <input
                type="text"
                value={edited.voterNo}
                onChange={(e) => setEdited({ ...edited, voterNo: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-mono focus:ring-1 focus:ring-bd-green-600 focus:border-bd-green-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">জন্ম তারিখ (Date of Birth)</label>
              <input
                type="text"
                value={edited.dob}
                placeholder="YYYY-MM-DD"
                onChange={(e) => setEdited({ ...edited, dob: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-bd-green-600 focus:border-bd-green-600 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ঠিকানা (Address)</label>
              <input
                type="text"
                value={edited.address}
                onChange={(e) => setEdited({ ...edited, address: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-bd-green-600 focus:border-bd-green-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">এলাকা (Voter Area)</label>
              <input
                type="text"
                value={edited.area}
                onChange={(e) => setEdited({ ...edited, area: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-bd-green-600 focus:border-bd-green-600 outline-none"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 mt-4.5 pt-3 border-t border-gray-100">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md flex items-center gap-1 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            বাতিল (Cancel)
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 text-xs font-medium bg-bd-green-600 hover:bg-bd-green-700 text-white rounded-md flex items-center gap-1 shadow-sm transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন (Save)"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs rounded-lg p-4 transition-all flex flex-col justify-between relative group overflow-hidden">
      {/* Subtle indicator bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600" />

      <div>
        <div className="flex justify-between items-start gap-3 mb-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              {voter.name}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide font-mono font-medium">SYS_ID: {voter.id.substring(0, 8)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 font-mono border border-emerald-200/60">
              {voter.voterNo}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-green-100 text-green-700 text-[9px] font-bold uppercase tracking-wider">
              Verified
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-700 border-t border-slate-100 pt-2.5 mt-2">
          <div className="flex items-start gap-1">
            <span className="text-slate-400 font-medium text-[11px] w-16 shrink-0">পিতা (Father):</span>
            <span className="font-semibold text-slate-800 truncate">{voter.fathersName || "—"}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-slate-400 font-medium text-[11px] w-16 shrink-0">মাতা (Mother):</span>
            <span className="font-semibold text-slate-800 truncate">{voter.mothersName || "—"}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-slate-400 font-medium text-[11px] w-16 shrink-0">জন্ম তারিখ:</span>
            <span className="font-mono text-slate-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {voter.dob || "—"}
            </span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-slate-400 font-medium text-[11px] w-16 shrink-0">এলাকা (Area):</span>
            <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[10px] border border-emerald-200/40">
              {voter.area || "—"}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-1 text-xs text-slate-700 mt-2">
          <span className="text-slate-400 font-medium text-[11px] w-16 shrink-0">ঠিকানা (Address):</span>
          <span className="text-slate-800 flex items-start gap-1 leading-normal text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            {voter.address || "—"}
          </span>
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all"
            title="তথ্য সংশোধন করুন"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`আপনি কি সত্যিই ${voter.name}-এর ভোটার তথ্য মুছে ফেলতে চান?`)) {
                onDelete(voter.id);
              }
            }}
            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
            title="তথ্য মুছে ফেলুন"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
