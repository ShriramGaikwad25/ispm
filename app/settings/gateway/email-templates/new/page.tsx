"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Mail, ChevronDown, Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link, Image, Table, Code, Quote, Minus, Maximize2, HelpCircle } from "lucide-react";

interface EmailTemplateFormData {
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

export default function NewEmailTemplatePage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [focusedFields, setFocusedFields] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<EmailTemplateFormData>({
    templateName: "",
    category: "",
    description: "",
    language: "",
    encoding: "",
    fromEmail: "",
    subject: "",
    condition: "",
    status: true,
    body: "",
  });

  const handleFieldChange = (field: keyof EmailTemplateFormData, value: string | boolean) => {
    setFormData((prev) => ({
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

  const handleSave = () => {
    // Load existing templates
    const savedTemplates = localStorage.getItem("gateway_email_templates");
    const templates = savedTemplates ? JSON.parse(savedTemplates) : [];
    
    // Add new template
    const newTemplate = {
      id: Date.now().toString(),
      ...formData,
    };
    
    templates.push(newTemplate);
    localStorage.setItem("gateway_email_templates", JSON.stringify(templates));
    
    // Navigate back to templates list
    router.push("/settings/gateway/email-templates");
  };

  const handleCancel = () => {
    router.push("/settings/gateway/email-templates");
  };

  // Initialize editor content on mount
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = formData.body || "";
    }
  }, []);

  // Rich text editor toolbar actions
  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleFieldChange("body", editorRef.current.innerHTML);
    }
  };

  return (
    <div className="h-full p-6">
      <div className="mx-auto w-full">
        <div className="mb-4"><BackButton /></div>
        <div className="bg-white rounded-md shadow overflow-hidden">
          {/* Green Header Bar */}
          <div className="flex items-center justify-between px-5 py-3 text-white" style={{ backgroundColor: '#27B973' }}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(39, 185, 115, 0.6)' }}>
                <Mail className="w-4 h-4" />
              </div>
              <h2 className="font-semibold">Email Templates</h2>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="p-6">
            {/* Description Text */}
            <p className="text-sm text-gray-600 mb-6">
              An end user is notified that an administrator created an account for the end user. The notification contains a link that the end user click to active the account.
            </p>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Template Name */}
              <div className="relative">
                <input
                  type="text"
                  value={formData.templateName}
                  onChange={(e) => handleFieldChange("templateName", e.target.value)}
                  onFocus={() => handleFieldFocus("templateName")}
                  onBlur={() => handleFieldBlur("templateName")}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.templateName || focusedFields.templateName
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Template Name *
                </label>
              </div>

              {/* Category */}
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => handleFieldChange("category", e.target.value)}
                  onFocus={() => handleFieldFocus("category")}
                  onBlur={() => handleFieldBlur("category")}
                  className="w-full px-4 pt-5 pb-1.5 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-white"
                >
                  <option value=""></option>
                  <option value="notification">Notification</option>
                  <option value="alert">Alert</option>
                  <option value="welcome">Welcome</option>
                  <option value="reminder">Reminder</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.category || focusedFields.category
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Category *
                </label>
              </div>

              {/* Description */}
              <div className="relative">
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  onFocus={() => handleFieldFocus("description")}
                  onBlur={() => handleFieldBlur("description")}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.description || focusedFields.description
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Description *
                </label>
              </div>

              {/* Language and Encoding Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Language */}
                <div className="relative">
                  <select
                    value={formData.language}
                    onChange={(e) => handleFieldChange("language", e.target.value)}
                    onFocus={() => handleFieldFocus("language")}
                    onBlur={() => handleFieldBlur("language")}
                    className="w-full px-4 pt-5 pb-1.5 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-white"
                  >
                    <option value=""></option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    formData.language || focusedFields.language
                      ? 'top-0.5 text-xs text-blue-600' 
                      : 'top-3.5 text-sm text-gray-500'
                  }`}>
                    Language *
                  </label>
                </div>

                {/* Encoding */}
                <div className="relative">
                  <select
                    value={formData.encoding}
                    onChange={(e) => handleFieldChange("encoding", e.target.value)}
                    onFocus={() => handleFieldFocus("encoding")}
                    onBlur={() => handleFieldBlur("encoding")}
                    className="w-full px-4 pt-5 pb-1.5 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-white"
                  >
                    <option value=""></option>
                    <option value="UTF-8">UTF-8</option>
                    <option value="ISO-8859-1">ISO-8859-1</option>
                    <option value="Windows-1252">Windows-1252</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    formData.encoding || focusedFields.encoding
                      ? 'top-0.5 text-xs text-blue-600' 
                      : 'top-3.5 text-sm text-gray-500'
                  }`}>
                    Encoding *
                  </label>
                </div>
              </div>

              {/* From Email */}
              <div className="relative">
                <input
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) => handleFieldChange("fromEmail", e.target.value)}
                  onFocus={() => handleFieldFocus("fromEmail")}
                  onBlur={() => handleFieldBlur("fromEmail")}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.fromEmail || focusedFields.fromEmail
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  From Email *
                </label>
              </div>

              {/* Subject */}
              <div className="relative">
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleFieldChange("subject", e.target.value)}
                  onFocus={() => handleFieldFocus("subject")}
                  onBlur={() => handleFieldBlur("subject")}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.subject || focusedFields.subject
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Subject *
                </label>
              </div>

              {/* Condition */}
              <div className="relative">
                <textarea
                  value={formData.condition}
                  onChange={(e) => handleFieldChange("condition", e.target.value)}
                  onFocus={() => handleFieldFocus("condition")}
                  onBlur={() => handleFieldBlur("condition")}
                  rows={3}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white resize-none"
                  placeholder=" "
                />
                <label className={`absolute left-4 top-2 transition-all duration-200 pointer-events-none ${
                  formData.condition || focusedFields.condition
                    ? 'text-xs text-blue-600' 
                    : 'text-sm text-gray-500'
                }`}>
                  Condition *
                </label>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <button
                  type="button"
                  onClick={() => handleFieldChange("status", !formData.status)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.status ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.status ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Rich Text Editor */}
              <div className="border border-gray-300 rounded-md overflow-hidden">
                {/* Toolbar */}
                <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap items-center gap-1">
                  {/* Basic Formatting */}
                  <button
                    type="button"
                    onClick={() => executeCommand("bold")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("italic")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("underline")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("strikethrough")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-4 h-4" />
                  </button>
                  
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  
                  {/* Lists */}
                  <button
                    type="button"
                    onClick={() => executeCommand("insertUnorderedList")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("insertOrderedList")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  
                  {/* Alignment */}
                  <button
                    type="button"
                    onClick={() => executeCommand("justifyLeft")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("justifyCenter")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("justifyRight")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                  
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  
                  {/* Special Elements */}
                  <button
                    type="button"
                    onClick={() => executeCommand("createLink")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Insert Link"
                  >
                    <Link className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("insertImage")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Insert Image"
                  >
                    <Image className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("insertTable")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Insert Table"
                  >
                    <Table className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("formatBlock", "pre")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Code Block"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("formatBlock", "blockquote")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Quote"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand("insertHorizontalRule")}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Horizontal Rule"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  
                  <div className="flex-1" />
                  
                  {/* View Options */}
                  <button
                    type="button"
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Maximize"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Source"
                  >
                    &lt;/&gt;
                  </button>
                  <button
                    type="button"
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Help"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Editor Content Area */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={(e) => {
                    const target = e.currentTarget;
                    handleFieldChange("body", target.innerHTML);
                  }}
                  onFocus={() => handleFieldFocus("body")}
                  onBlur={() => handleFieldBlur("body")}
                  className="min-h-[400px] p-4 focus:outline-none text-sm"
                  style={{ whiteSpace: "pre-wrap" }}
                  suppressContentEditableWarning={true}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

