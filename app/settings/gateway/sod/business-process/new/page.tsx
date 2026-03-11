"use client";

import React, { useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
};

const INITIAL_RULES: Item[] = [
  { id: "r1", name: "High-Risk Payment Rule" },
  { id: "r2", name: "Vendor Creation vs Payment" },
  { id: "r3", name: "User Maintenance vs Approvals" },
  { id: "r4", name: "Journal Entry vs Approval" },
];

export default function SodBusinessProcessNewPage() {
  const [availableRules, setAvailableRules] = useState<Item[]>(INITIAL_RULES);
  const [selectedRules, setSelectedRules] = useState<Item[]>([]);
  const [availableRuleId, setAvailableRuleId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [ruleSearch, setRuleSearch] = useState("");

  const moveItems = (
    from: Item[],
    to: Item[],
    setFrom: React.Dispatch<React.SetStateAction<Item[]>>,
    setTo: React.Dispatch<React.SetStateAction<Item[]>>,
    id: string | null,
    clearId: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    if (!id) return;
    const itemToMove = from.find(i => i.id === id);
    if (!itemToMove) return;
    const remaining = from.filter(i => i.id !== id);
    setFrom(remaining);
    setTo([...to, itemToMove]);
    clearId(null);
  };

  const filteredAvailableRules = useMemo(
    () =>
      !ruleSearch.trim()
        ? availableRules
        : availableRules.filter(r =>
            r.name.toLowerCase().includes(ruleSearch.trim().toLowerCase())
          ),
    [availableRules, ruleSearch]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Create Business Process</h1>
            <button
              type="button"
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Business Process
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter business process name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Owner"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add tags"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  placeholder="Short description"
                />
              </div>

              <div className="w-full">
                {/* Rules dual list */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Rules
                  </label>
                  <div className="grid grid-cols-[minmax(0,1.6fr)_auto_minmax(0,1.6fr)] gap-3 items-stretch">
                    {/* Available rules */}
                    <div className="border border-gray-200 rounded-lg bg-white flex flex-col min-h-[200px] shadow-sm">
                      <div className="px-3 py-2 border-b border-gray-200 space-y-2">
                        <h3 className="text-xs font-semibold text-gray-800">Available Rules</h3>
                        <input
                          type="text"
                          value={ruleSearch}
                          onChange={e => setRuleSearch(e.target.value)}
                          placeholder="Search rules..."
                          className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1 overflow-auto">
                        {filteredAvailableRules.length === 0 ? (
                          <p className="px-3 py-2 text-[11px] text-gray-500">No available rules.</p>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {filteredAvailableRules.map(item => (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAvailableRuleId(prev => (prev === item.id ? null : item.id))
                                  }
                                  className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                                    availableRuleId === item.id
                                      ? "bg-blue-50 text-blue-700"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  {item.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Move buttons */}
                    <div className="flex flex-col items-stretch justify-center gap-2 px-1">
                      <button
                        type="button"
                        onClick={() =>
                          moveItems(
                            availableRules,
                            selectedRules,
                            setAvailableRules,
                            setSelectedRules,
                            availableRuleId,
                            setAvailableRuleId
                          )
                        }
                        disabled={!availableRuleId}
                        className={`w-24 text-center px-3 py-1.5 rounded-md text-[11px] font-medium border ${
                          availableRuleId
                            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        }`}
                      >
                        Add →
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          moveItems(
                            selectedRules,
                            availableRules,
                            setSelectedRules,
                            setAvailableRules,
                            selectedRuleId,
                            setSelectedRuleId
                          )
                        }
                        disabled={!selectedRuleId}
                        className={`w-24 text-center px-3 py-1.5 rounded-md text-[11px] font-medium border ${
                          selectedRuleId
                            ? "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        }`}
                      >
                        ← Remove
                      </button>
                    </div>

                    {/* Selected rules */}
                    <div className="border border-gray-200 rounded-lg bg-white flex flex-col min-h-[200px] shadow-sm">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <h3 className="text-xs font-semibold text-gray-800">Selected Rules</h3>
                      </div>
                      <div className="flex-1 overflow-auto">
                        {selectedRules.length === 0 ? (
                          <p className="px-3 py-2 text-[11px] text-gray-500">No rules selected.</p>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {selectedRules.map(item => (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedRuleId(prev => (prev === item.id ? null : item.id))
                                  }
                                  className={`w-full text-left px-3 py-1.5 text-[11px] border-l-2 transition-colors ${
                                    selectedRuleId === item.id
                                      ? "bg-blue-50 border-blue-500 text-blue-700"
                                      : "border-transparent hover:bg-slate-50"
                                  }`}
                                >
                                  {item.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

