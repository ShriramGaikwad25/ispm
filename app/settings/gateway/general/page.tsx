"use client";

import { useState, useEffect } from "react";
import { BackButton } from "@/components/BackButton";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function GatewayGeneralSettings() {
  const [expandedCards, setExpandedCards] = useState<boolean[]>([false, false, false, false]);
  const [igaFormData, setIgaFormData] = useState({
    application_server_type: "",
    naming_provider_url: "",
    auth_login_config_path: "",
    username: "",
    password: "",
    dbSchema: "",
  });
  const [focusedFields, setFocusedFields] = useState<Record<string, boolean>>({});

  const cards = [
    { title: "Setup CMDB", key: "cmdb" },
    { title: "Setup IGA", key: "iga" },
    { title: "Setup HashiCorp Vault", key: "vault" },
    { title: "Setup logs", key: "logs" },
  ];

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleIgaFieldChange = (field: string, value: string) => {
    setIgaFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFieldFocus = (field: string) => {
    setFocusedFields((prev) => ({ ...prev, [field]: true }));
  };

  const handleFieldBlur = (field: string) => {
    setFocusedFields((prev) => ({ ...prev, [field]: false }));
  };

  // Load saved IGA data from localStorage on component mount
  useEffect(() => {
    const savedIgaData = localStorage.getItem("gateway_iga_settings");
    if (savedIgaData) {
      try {
        const parsed = JSON.parse(savedIgaData);
        setIgaFormData(parsed);
      } catch (error) {
        console.error("Error loading saved IGA settings:", error);
      }
    }
  }, []);

  const handleSave = () => {
    // Save IGA form data to localStorage
    localStorage.setItem("gateway_iga_settings", JSON.stringify(igaFormData));
  };

  return (
    <div className="h-full p-6">
      <div className="w-full">
        <div className="mb-4"><BackButton /></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">General</h1>
        <div className="space-y-4">
          {cards.map((card, idx) => (
            <div key={card.key} className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">
              <button
                className="w-full flex items-center justify-between px-4 py-4 bg-white font-semibold text-sm hover:bg-gray-50 transition-colors group"
                onClick={() => toggleCard(idx)}
                aria-expanded={expandedCards[idx] ? "true" : "false"}
              >
                <span className="flex-1 text-left mr-3 text-gray-900">
                  {card.title}
                </span>
                <div className="flex-shrink-0">
                  {expandedCards[idx] ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>
              </button>
              {expandedCards[idx] && (
                <div className="p-4 text-sm space-y-4 bg-gray-50 border-t border-gray-100">
                  {card.key === "iga" ? (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={igaFormData.application_server_type}
                            onChange={(e) => handleIgaFieldChange("application_server_type", e.target.value)}
                            onFocus={() => handleFieldFocus("application_server_type")}
                            onBlur={() => handleFieldBlur("application_server_type")}
                            className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder=" "
                          />
                          <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                            igaFormData.application_server_type || focusedFields.application_server_type
                              ? 'top-0.5 text-xs text-blue-600' 
                              : 'top-3.5 text-sm text-gray-500'
                          }`}>
                            Application Server Type
                          </label>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={igaFormData.naming_provider_url}
                            onChange={(e) => handleIgaFieldChange("naming_provider_url", e.target.value)}
                            onFocus={() => handleFieldFocus("naming_provider_url")}
                            onBlur={() => handleFieldBlur("naming_provider_url")}
                            className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder=" "
                          />
                          <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                            igaFormData.naming_provider_url || focusedFields.naming_provider_url
                              ? 'top-0.5 text-xs text-blue-600' 
                              : 'top-3.5 text-sm text-gray-500'
                          }`}>
                            Naming Provider URL
                          </label>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={igaFormData.auth_login_config_path}
                            onChange={(e) => handleIgaFieldChange("auth_login_config_path", e.target.value)}
                            onFocus={() => handleFieldFocus("auth_login_config_path")}
                            onBlur={() => handleFieldBlur("auth_login_config_path")}
                            className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder=" "
                          />
                          <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                            igaFormData.auth_login_config_path || focusedFields.auth_login_config_path
                              ? 'top-0.5 text-xs text-blue-600' 
                              : 'top-3.5 text-sm text-gray-500'
                          }`}>
                            Auth Login Config Path
                          </label>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={igaFormData.username}
                            onChange={(e) => handleIgaFieldChange("username", e.target.value)}
                            onFocus={() => handleFieldFocus("username")}
                            onBlur={() => handleFieldBlur("username")}
                            className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder=" "
                          />
                          <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                            igaFormData.username || focusedFields.username
                              ? 'top-0.5 text-xs text-blue-600' 
                              : 'top-3.5 text-sm text-gray-500'
                          }`}>
                            Username
                          </label>
                        </div>
                        <div className="relative">
                          <input
                            type="password"
                            value={igaFormData.password}
                            onChange={(e) => handleIgaFieldChange("password", e.target.value)}
                            onFocus={() => handleFieldFocus("password")}
                            onBlur={() => handleFieldBlur("password")}
                            className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder=" "
                          />
                          <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                            igaFormData.password || focusedFields.password
                              ? 'top-0.5 text-xs text-blue-600' 
                              : 'top-3.5 text-sm text-gray-500'
                          }`}>
                            Password
                          </label>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={igaFormData.dbSchema}
                            onChange={(e) => handleIgaFieldChange("dbSchema", e.target.value)}
                            onFocus={() => handleFieldFocus("dbSchema")}
                            onBlur={() => handleFieldBlur("dbSchema")}
                            className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder=" "
                          />
                          <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                            igaFormData.dbSchema || focusedFields.dbSchema
                              ? 'top-0.5 text-xs text-blue-600' 
                              : 'top-3.5 text-sm text-gray-500'
                          }`}>
                            DB Schema
                          </label>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Save
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-600">
                      {/* Content for {card.title} */}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


