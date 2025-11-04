"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Mail, Plus, Archive } from "lucide-react";

interface EmailTemplate {
  id: string;
  templateName: string;
  category: string;
  description: string;
  language: string;
  encoding: string;
  fromEmail: string;
  subject: string;
  condition: string;
  status: boolean;
  body: string;
}

export default function GatewayEmailTemplatesSettings() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  // Load saved templates from localStorage on component mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem("gateway_email_templates");
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        setTemplates(parsed);
      } catch (error) {
        console.error("Error loading saved Email Templates:", error);
      }
    }
  }, []);

  const handleAddTemplate = () => {
    router.push("/settings/gateway/email-templates/new");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Back Button */}
      <div className="p-6 pb-4">
        <BackButton />
      </div>
      {/* Green Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 h-16 text-white" style={{ backgroundColor: '#27B973' }}>
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-white" />
          <h1 className="text-xl font-semibold text-white">Email Templates</h1>
        </div>
        <button
          onClick={handleAddTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#27B973] rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Email Template
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50 p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex items-center justify-center">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <Archive className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-400 text-base">No Data</p>
            </div>
          ) : (
            <div className="w-full p-6">
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {template.templateName}
                          </h3>
                          {template.status && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Enabled
                            </span>
                          )}
                          {template.category && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              {template.category}
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {template.description}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Subject:</span> {template.subject}
                          </p>
                          {template.fromEmail && (
                            <p>
                              <span className="font-medium">From:</span> {template.fromEmail}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                          <span className="font-medium">Body:</span> 
                          <span dangerouslySetInnerHTML={{ __html: template.body.substring(0, 100) }} />
                          {template.body.length > 100 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
