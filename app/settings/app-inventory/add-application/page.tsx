"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface FormData {
  step1: {
    applicationName: string;
    type: string;
    oauthType: string;
  };
  step2: {
    applicationName: string;
    description: string;
    applicationType: string;
    owner: string;
    backupOwner: string;
  };
  step3: {
    // Dynamic fields based on application type
    [key: string]: any;
  };
  step4: {
    complianceRequirements: string[];
    securityControls: string[];
    monitoringEnabled: boolean;
  };
  step5: {
    backupFrequency: string;
    disasterRecovery: string;
    maintenanceWindow: string;
  };
  step6: {
    reviewNotes: string;
    approvalRequired: boolean;
    goLiveDate: string;
  };
}

const steps = [
  { id: 1, title: "Select System", description: "" },
  { id: 2, title: "Add Details", description: "" },
  { id: 3, title: "Integration Setting", description: "" },
  { id: 4, title: "Finish Up", description: "" }
];

export default function AddApplicationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    step1: {
      applicationName: "",
      type: "",
      oauthType: ""
    },
    step2: {
      applicationName: "",
      description: "",
      applicationType: "",
      owner: "",
      backupOwner: ""
    },
    step3: {
      // Dynamic fields will be populated based on application type
    },
    step4: {
      complianceRequirements: [],
      securityControls: [],
      monitoringEnabled: false
    },
    step5: {
      backupFrequency: "",
      disasterRecovery: "",
      maintenanceWindow: ""
    },
    step6: {
      reviewNotes: "",
      approvalRequired: false,
      goLiveDate: ""
    }
  });

  const handleInputChange = (step: keyof FormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value
      }
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log("Form submitted:", formData);
    // Here you would typically submit to your API
    alert("Application added successfully!");
    router.push("/settings/app-inventory");
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
             <div className="flex items-center gap-3">
               <div className="flex-1 relative">
                 <input
                   type="text"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onFocus={() => setIsSearchFocused(true)}
                   onBlur={() => setIsSearchFocused(false)}
                   className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                   placeholder=" "
                 />
                 <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                   searchQuery || isSearchFocused
                     ? 'top-0.5 text-xs text-blue-600' 
                     : 'top-3.5 text-sm text-gray-500'
                 }`}>
                   Search *
                 </label>
               </div>
               <div className="flex-1 relative">
                 <select
                   value={formData.step1.oauthType}
                   onChange={(e) => handleInputChange("step1", "oauthType", e.target.value)}
                   className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                   required
                 >
                   <option value=""></option>
                   <option value="OKTA">OKTA</option>
                   <option value="IDCS">IDCS</option>
                   <option value="KPOAUTH">KPOAUTH</option>
                 </select>
                 <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                   formData.step1.oauthType 
                     ? 'top-0.5 text-xs text-blue-600' 
                     : 'top-3.5 text-sm text-gray-500'
                 }`}>
                   OAuth Type *
                 </label>
               </div>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-4">
                 Application Type *
               </label>
               <div className="grid grid-cols-3 gap-4">
                 {[
                   { id: "LDAP", title: "LDAP", subtitle: "Lightweight Directory Access Protocol", icon: "📁" },
                   { id: "Generic LDAP", title: "Generic LDAP", subtitle: "Generic LDAP connection", icon: "📁" },
                   { id: "Active Directory", title: "Active Directory", subtitle: "Microsoft Active Directory", icon: "🏢" },
                   { id: "Active Directory Collector", title: "AD Collector", subtitle: "Active Directory Collector", icon: "📊" },
                   { id: "LogicalApp Active Directory", title: "LogicalApp AD", subtitle: "Logical Application AD", icon: "🔗" },
                   { id: "Logical Application", title: "Logical Application", subtitle: "Logical application", icon: "⚙️" },
                   { id: "Provisioning Agent", title: "Provisioning Agent", subtitle: "Provisioning agent", icon: "🤖" },
                   { id: "Database", title: "Database", subtitle: "Database system", icon: "🗄️" },
                   { id: "Database Collector", title: "DB Collector", subtitle: "Database collector", icon: "📊" },
                   { id: "Disconnected Application", title: "Disconnected App", subtitle: "Disconnected application", icon: "🔌" },
                   { id: "Flatfile", title: "Flatfile", subtitle: "Flat file system", icon: "📄" },
                   { id: "Service Now Ticketing", title: "ServiceNow", subtitle: "ServiceNow ticketing", icon: "🎫" },
                   { id: "AWS", title: "AWS", subtitle: "Amazon Web Services", icon: "☁️" },
                   { id: "OKTA", title: "OKTA", subtitle: "OKTA identity platform", icon: "🔐" },
                   { id: "RESTService Application", title: "REST Service", subtitle: "REST service application", icon: "🌐" },
                   { id: "OracleFusionApps", title: "Oracle Fusion", subtitle: "Oracle Fusion Applications", icon: "🏛️" },
                   { id: "SalesForce", title: "SalesForce", subtitle: "SalesForce CRM", icon: "💼" },
                   { id: "Centrify", title: "Centrify", subtitle: "Centrify identity platform", icon: "🔒" },
                   { id: "E2EMigration Client", title: "E2E Migration", subtitle: "End-to-end migration client", icon: "🔄" },
                   { id: "SailPointIdentityIQ", title: "SailPoint IIQ", subtitle: "SailPoint IdentityIQ", icon: "⛵" },
                   { id: "SailPointIIQApplications", title: "SailPoint Apps", subtitle: "SailPoint IIQ Applications", icon: "⛵" },
                   { id: "RSA", title: "RSA", subtitle: "RSA security platform", icon: "🔐" },
                   { id: "Oracle E-Business", title: "Oracle E-Business", subtitle: "Oracle E-Business Suite", icon: "🏛️" },
                   { id: "PeopleSoft", title: "PeopleSoft", subtitle: "PeopleSoft system", icon: "👥" },
                   { id: "PeopleSoftHR", title: "PeopleSoft HR", subtitle: "PeopleSoft Human Resources", icon: "👥" },
                   { id: "PeopleSoftUM", title: "PeopleSoft UM", subtitle: "PeopleSoft User Management", icon: "👥" },
                   { id: "SAP", title: "SAP", subtitle: "SAP system", icon: "🏢" },
                   { id: "OIMOUD Management", title: "OIM OUD", subtitle: "Oracle Identity Manager OUD", icon: "🏛️" },
                   { id: "Azure", title: "Azure", subtitle: "Microsoft Azure", icon: "☁️" },
                   { id: "Oracle Identity Manager", title: "Oracle IAM", subtitle: "Oracle Identity Manager", icon: "🏛️" },
                   { id: "Oracle IDCS", title: "Oracle IDCS", subtitle: "Oracle Identity Cloud Service", icon: "🏛️" },
                   { id: "Epic", title: "Epic", subtitle: "Epic system", icon: "🏥" },
                   { id: "Unix", title: "Unix", subtitle: "Unix system", icon: "🐧" },
                   { id: "ATG Web Commerce", title: "ATG Commerce", subtitle: "ATG Web Commerce", icon: "🛒" },
                   { id: "Database User Management", title: "DB User Mgmt", subtitle: "Database User Management", icon: "👤" }
                 ]
                 .filter((type) => 
                   searchQuery === "" || 
                   type.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   type.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   type.id.toLowerCase().includes(searchQuery.toLowerCase())
                 )
                 .map((type) => (
                   <div
                     key={type.id}
                     onClick={() => handleInputChange("step1", "type", type.id)}
                     className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                       formData.step1.type === type.id
                         ? "border-blue-500 bg-blue-50"
                         : "border-gray-200 bg-white hover:border-gray-300"
                     }`}
                   >
                     <div className="flex items-center mb-2">
                       <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-lg mr-3">
                         {type.icon}
                       </div>
                       <div className="flex-1">
                         <h3 className="font-medium text-gray-900 text-sm">{type.title}</h3>
                         <p className="text-xs text-gray-500">{type.subtitle}</p>
                       </div>
                       {formData.step1.type === type.id && (
                         <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                           <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                           </svg>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={formData.step2.applicationName}
                  onChange={(e) => handleInputChange("step2", "applicationName", e.target.value)}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step2.applicationName
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Application Name *
                </label>
              </div>
              <div className="flex-1 relative">
                <select
                  value={formData.step2.applicationType}
                  onChange={(e) => handleInputChange("step2", "applicationType", e.target.value)}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                  required
                >
                  <option value=""></option>
                  <option value="Source">Source</option>
                  <option value="Target">Target</option>
                </select>
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step2.applicationType
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Application Type *
                </label>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={formData.step2.description}
                onChange={(e) => handleInputChange("step2", "description", e.target.value)}
                className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline resize-none"
                rows={3}
                placeholder=" "
              />
              <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                formData.step2.description
                  ? 'top-0.5 text-xs text-blue-600' 
                  : 'top-3.5 text-sm text-gray-500'
              }`}>
                Description *
              </label>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={formData.step2.owner}
                  onChange={(e) => handleInputChange("step2", "owner", e.target.value)}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step2.owner
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Owner *
                </label>
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={formData.step2.backupOwner}
                  onChange={(e) => handleInputChange("step2", "backupOwner", e.target.value)}
                  className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                  placeholder=" "
                />
                <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                  formData.step2.backupOwner
                    ? 'top-0.5 text-xs text-blue-600' 
                    : 'top-3.5 text-sm text-gray-500'
                }`}>
                  Backup Owner *
                </label>
              </div>
            </div>
          </div>
        );

      case 3:
        const selectedAppType = formData.step1.type;
        
        const renderIntegrationFields = () => {
          switch (selectedAppType) {
            case "LDAP":
            case "Generic LDAP":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Active Directory":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.useSSL || ""}
                        onChange={(e) => handleInputChange("step3", "useSSL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.useSSL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Use SSL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.domain || ""}
                        onChange={(e) => handleInputChange("step3", "domain", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.domain
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Domain *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Database":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.databaseType || ""}
                        onChange={(e) => handleInputChange("step3", "databaseType", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.databaseType
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Database Type *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.connectionURL || ""}
                        onChange={(e) => handleInputChange("step3", "connectionURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.connectionURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Connection URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetAllUsers || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetAllUsers", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetAllUsers
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get All Users *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetAllGroups || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetAllGroups", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetAllGroups
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get All Groups *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetAllRoleContents || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetAllRoleContents", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetAllRoleContents
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get All Role Contents *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetUser || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetUser", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetUser
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get User *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetGroup || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetGroup", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetGroup
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get Group *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.viewGetRoleContent || ""}
                        onChange={(e) => handleInputChange("step3", "viewGetRoleContent", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.viewGetRoleContent
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        View Get Role Content *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.uniqueIDSchemaMap || ""}
                        onChange={(e) => handleInputChange("step3", "uniqueIDSchemaMap", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.uniqueIDSchemaMap
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Unique ID Schema Map *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spRevokeGroupMembership || ""}
                        onChange={(e) => handleInputChange("step3", "spRevokeGroupMembership", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spRevokeGroupMembership
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Revoke Group Membership *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeGroupMembershipDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "revokeGroupMembershipDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeGroupMembershipDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Group Membership Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeGroupMembershipResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "revokeGroupMembershipResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeGroupMembershipResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Group Membership Response Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spAddGroupMembership || ""}
                        onChange={(e) => handleInputChange("step3", "spAddGroupMembership", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spAddGroupMembership
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Add Group Membership *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.addGroupMembershipDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "addGroupMembershipDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.addGroupMembershipDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Add Group Membership Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.addGroupMembershipResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "addGroupMembershipResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.addGroupMembershipResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Add Group Membership Response Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSchemaMap || ""}
                        onChange={(e) => handleInputChange("step3", "groupSchemaMap", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSchemaMap
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Schema Map *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.roleContentSchemaMap || ""}
                        onChange={(e) => handleInputChange("step3", "roleContentSchemaMap", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.roleContentSchemaMap
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Role Content Schema Map *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spCreateAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spCreateAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spCreateAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Create Account *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "createAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create Account Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "createAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create Account Response Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spUpdateAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spUpdateAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spUpdateAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Update Account *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "updateAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update Account Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "updateAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update Account Response Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spDeleteAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spDeleteAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spDeleteAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Delete Account *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "deleteAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Account Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "deleteAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Account Response Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spEnableAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spEnableAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spEnableAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Enable Account *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.enableAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "enableAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.enableAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Enable Account Definition *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.enableAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "enableAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.enableAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Enable Account Response Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.spDisableAccount || ""}
                        onChange={(e) => handleInputChange("step3", "spDisableAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.spDisableAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        SP Disable Account *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.disableAccountDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "disableAccountDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.disableAccountDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Disable Account Definition *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.disableAccountResponseDefinition || ""}
                        onChange={(e) => handleInputChange("step3", "disableAccountResponseDefinition", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.disableAccountResponseDefinition
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Disable Account Response Definition *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "Database Collector":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.collector || ""}
                        onChange={(e) => handleInputChange("step3", "collector", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.collector
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Collector *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Database User Management":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Disconnected Application":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.applicationName || ""}
                        onChange={(e) => handleInputChange("step3", "applicationName", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.applicationName
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Application Name *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.owner || ""}
                        onChange={(e) => handleInputChange("step3", "owner", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.owner
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Owner *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.manuallyFulfill || ""}
                        onChange={(e) => handleInputChange("step3", "manuallyFulfill", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.manuallyFulfill
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Manually Fulfill *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.isIntegratedWithOIM || ""}
                        onChange={(e) => handleInputChange("step3", "isIntegratedWithOIM", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.isIntegratedWithOIM
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Is Integrated With OIM *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.raiseTicket || ""}
                        onChange={(e) => handleInputChange("step3", "raiseTicket", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.raiseTicket
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Raise Ticket *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.ticketingSystem || ""}
                        onChange={(e) => handleInputChange("step3", "ticketingSystem", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.ticketingSystem
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Ticketing System *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.ticketingAppId || ""}
                        onChange={(e) => handleInputChange("step3", "ticketingAppId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.ticketingAppId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Ticketing App ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.ticketingAPIToken || ""}
                        onChange={(e) => handleInputChange("step3", "ticketingAPIToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.ticketingAPIToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Ticketing API Token *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.assignTo || ""}
                        onChange={(e) => handleInputChange("step3", "assignTo", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.assignTo
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Assign To *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.oimAppId || ""}
                        onChange={(e) => handleInputChange("step3", "oimAppId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.oimAppId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        OIM App ID *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.oimAPIToken || ""}
                        onChange={(e) => handleInputChange("step3", "oimAPIToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.oimAPIToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        OIM API Token *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "E2EMigration Client":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.validFrom || ""}
                        onChange={(e) => handleInputChange("step3", "validFrom", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.validFrom
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Valid From *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.validUpto || ""}
                        onChange={(e) => handleInputChange("step3", "validUpto", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.validUpto
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Valid Upto *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.validityToken || ""}
                        onChange={(e) => handleInputChange("step3", "validityToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.validityToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Validity Token *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "Epic":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Flatfile":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.owner || ""}
                        onChange={(e) => handleInputChange("step3", "owner", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.owner
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Owner *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.enableIntegrationWithIV || ""}
                        onChange={(e) => handleInputChange("step3", "enableIntegrationWithIV", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.enableIntegrationWithIV
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Enable Integration With IV *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Generic LDAP":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "LDAP":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.serviceId || ""}
                        onChange={(e) => handleInputChange("step3", "serviceId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.serviceId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Service Id *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "AWS":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.accessID || ""}
                        onChange={(e) => handleInputChange("step3", "accessID", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.accessID
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Access ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.accessSecret || ""}
                        onChange={(e) => handleInputChange("step3", "accessSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.accessSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Access Secret *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Logical Application":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.applicationId || ""}
                        onChange={(e) => handleInputChange("step3", "applicationId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.applicationId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Application Id *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "LogicalApp Active Directory":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.useSSL || ""}
                        onChange={(e) => handleInputChange("step3", "useSSL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.useSSL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Use SSL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.domain || ""}
                        onChange={(e) => handleInputChange("step3", "domain", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.domain
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Domain *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "userSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Search Base *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupSearchBase || ""}
                        onChange={(e) => handleInputChange("step3", "groupSearchBase", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupSearchBase
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Search Base *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupScope || ""}
                        onChange={(e) => handleInputChange("step3", "groupScope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupScope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Scope *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userScope || ""}
                        onChange={(e) => handleInputChange("step3", "userScope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userScope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Scope *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultGroupOfNewAccount || ""}
                        onChange={(e) => handleInputChange("step3", "defaultGroupOfNewAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultGroupOfNewAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Group Of New Account *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteAccountOnDeleteRequest || ""}
                        onChange={(e) => handleInputChange("step3", "deleteAccountOnDeleteRequest", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteAccountOnDeleteRequest
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Account On Delete Request *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeMembershipOnDeleteRequest || ""}
                        onChange={(e) => handleInputChange("step3", "revokeMembershipOnDeleteRequest", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeMembershipOnDeleteRequest
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Membership On Delete Request *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.primaryIdentityAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "primaryIdentityAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.primaryIdentityAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Primary Identity Attribute *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "OKTA":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.apiKey || ""}
                        onChange={(e) => handleInputChange("step3", "apiKey", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.apiKey
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        API Key *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostURL || ""}
                        onChange={(e) => handleInputChange("step3", "hostURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Host URL *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "OIMOUD Management":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.restServiceURL || ""}
                        onChange={(e) => handleInputChange("step3", "restServiceURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.restServiceURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        RESTService URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.t3ServiceHostname || ""}
                        onChange={(e) => handleInputChange("step3", "t3ServiceHostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.t3ServiceHostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        T3Service Hostname *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.t3ServicePort || ""}
                        onChange={(e) => handleInputChange("step3", "t3ServicePort", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.t3ServicePort
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        T3Service Port *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.t3ServiceAuthloginConfigFile || ""}
                        onChange={(e) => handleInputChange("step3", "t3ServiceAuthloginConfigFile", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.t3ServiceAuthloginConfigFile
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        T3Service Authlogin Config File *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantId || ""}
                        onChange={(e) => handleInputChange("step3", "tenantId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant Id *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.oudServiceAccountId || ""}
                        onChange={(e) => handleInputChange("step3", "oudServiceAccountId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.oudServiceAccountId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        OUDService Account Id *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.oudServiceAccountPWD || ""}
                        onChange={(e) => handleInputChange("step3", "oudServiceAccountPWD", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.oudServiceAccountPWD
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        OUDService Account PWD *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "Oracle E-Business":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Oracle IDCS":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientId || ""}
                        onChange={(e) => handleInputChange("step3", "clientId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.clientSecret || ""}
                        onChange={(e) => handleInputChange("step3", "clientSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Secret *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.endpointURL || ""}
                        onChange={(e) => handleInputChange("step3", "endpointURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.endpointURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Endpoint URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.enableAutoRetry || ""}
                        onChange={(e) => handleInputChange("step3", "enableAutoRetry", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.enableAutoRetry
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Enable Auto Retry *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.autoRetryInterval || ""}
                        onChange={(e) => handleInputChange("step3", "autoRetryInterval", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.autoRetryInterval
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Auto Retry Interval *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={formData.step3.maximumAutoRetry || ""}
                        onChange={(e) => handleInputChange("step3", "maximumAutoRetry", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.maximumAutoRetry
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Maximum Auto Retry *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Oracle Identity Manager":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.applicationServerType || ""}
                        onChange={(e) => handleInputChange("step3", "applicationServerType", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.applicationServerType
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Application Server Type *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.namingProviderUrl || ""}
                        onChange={(e) => handleInputChange("step3", "namingProviderUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.namingProviderUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Naming Provider Url *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.authLoginConfigPath || ""}
                        onChange={(e) => handleInputChange("step3", "authLoginConfigPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.authLoginConfigPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Auth Login Config Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.dbSchema || ""}
                        onChange={(e) => handleInputChange("step3", "dbSchema", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.dbSchema
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Db Schema *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "OracleFusionApps":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.endpoint || ""}
                        onChange={(e) => handleInputChange("step3", "endpoint", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.endpoint
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Endpoint *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "PeopleSoft":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "PeopleSoftHR":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "PeopleSoftUM":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.serviceURL || ""}
                        onChange={(e) => handleInputChange("step3", "serviceURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.serviceURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Service URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.host || ""}
                        onChange={(e) => handleInputChange("step3", "host", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.host
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Host *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.senderNode || ""}
                        onChange={(e) => handleInputChange("step3", "senderNode", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.senderNode
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Sender Node *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.receiverNode || ""}
                        onChange={(e) => handleInputChange("step3", "receiverNode", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.receiverNode
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Receiver Node *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createUserOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "createUserOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createUserOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create User Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateUserOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "updateUserOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateUserOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update User Operation Method *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteUserOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "deleteUserOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteUserOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete User Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getUserOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "getUserOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getUserOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get User Operation Method *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getAllUsersOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "getAllUsersOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getAllUsersOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get All Users Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createGroupOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "createGroupOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createGroupOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create Group Operation Method *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteGroupOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "deleteGroupOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteGroupOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Group Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getGroupOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "getGroupOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getGroupOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get Group Operation Method *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getAllGroupsOperationMethod || ""}
                        onChange={(e) => handleInputChange("step3", "getAllGroupsOperationMethod", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getAllGroupsOperationMethod
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get All Groups Operation Method *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultRole || ""}
                        onChange={(e) => handleInputChange("step3", "defaultRole", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultRole
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Role *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultPrimaryPermission || ""}
                        onChange={(e) => handleInputChange("step3", "defaultPrimaryPermission", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultPrimaryPermission
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Primary Permission *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultNavigatorPermission || ""}
                        onChange={(e) => handleInputChange("step3", "defaultNavigatorPermission", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultNavigatorPermission
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Navigator Permission *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultRowSecurityPermission || ""}
                        onChange={(e) => handleInputChange("step3", "defaultRowSecurityPermission", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultRowSecurityPermission
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Row Security Permission *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultProcessProfilePermission || ""}
                        onChange={(e) => handleInputChange("step3", "defaultProcessProfilePermission", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultProcessProfilePermission
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Process Profile Permission *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Provisioning Agent":
              return (
                <div className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.applicationId || ""}
                      onChange={(e) => handleInputChange("step3", "applicationId", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.applicationId
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Application ID *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.applicationHooks || ""}
                      onChange={(e) => handleInputChange("step3", "applicationHooks", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.applicationHooks
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Application Hooks *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.isEnabled || ""}
                      onChange={(e) => handleInputChange("step3", "isEnabled", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.isEnabled
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Is Enabled *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.enableAutoRetry || ""}
                      onChange={(e) => handleInputChange("step3", "enableAutoRetry", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.enableAutoRetry
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Enable Auto Retry *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.autoRetryInterval || ""}
                      onChange={(e) => handleInputChange("step3", "autoRetryInterval", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.autoRetryInterval
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Auto Retry Interval *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.maximumAutoRetry || ""}
                      onChange={(e) => handleInputChange("step3", "maximumAutoRetry", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.maximumAutoRetry
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Maximum Auto Retry *
                    </label>
                  </div>
                </div>
              );

            case "RSA":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.adminId || ""}
                        onChange={(e) => handleInputChange("step3", "adminId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.adminId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Admin ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.adminPassword || ""}
                        onChange={(e) => handleInputChange("step3", "adminPassword", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.adminPassword
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Admin Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "SAP":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "SailPointIIQApplications":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.baseUri || ""}
                        onChange={(e) => handleInputChange("step3", "baseUri", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.baseUri
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Base URI *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.password || ""}
                      onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.password
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Password *
                    </label>
                  </div>
                </div>
              );

            case "SailPointIdentityIQ":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.hostname || ""}
                        onChange={(e) => handleInputChange("step3", "hostname", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.hostname
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Hostname *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.port || ""}
                        onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.port
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Port *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.baseUri || ""}
                        onChange={(e) => handleInputChange("step3", "baseUri", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.baseUri
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Base URI *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.password || ""}
                      onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.password
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Password *
                    </label>
                  </div>
                </div>
              );

            case "SalesForce":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientId || ""}
                        onChange={(e) => handleInputChange("step3", "clientId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Id *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientSecret || ""}
                        onChange={(e) => handleInputChange("step3", "clientSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Secret *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.endpoint || ""}
                        onChange={(e) => handleInputChange("step3", "endpoint", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.endpoint
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Endpoint *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.securityToken || ""}
                        onChange={(e) => handleInputChange("step3", "securityToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.securityToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Security Token *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Service Now Ticketing":
              return (
                <div className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.tenantUrl || ""}
                      onChange={(e) => handleInputChange("step3", "tenantUrl", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.tenantUrl
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Tenant URL *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.baseUri || ""}
                      onChange={(e) => handleInputChange("step3", "baseUri", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.baseUri
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Base URI *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.username || ""}
                      onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.username
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Username *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.password || ""}
                      onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.password
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Password *
                    </label>
                  </div>
                </div>
              );

            case "Unix":
              return (
                <div className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.connectionType || ""}
                      onChange={(e) => handleInputChange("step3", "connectionType", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.connectionType
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Connection Type *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.host || ""}
                      onChange={(e) => handleInputChange("step3", "host", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.host
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Host *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.port || ""}
                      onChange={(e) => handleInputChange("step3", "port", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.port
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Port *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.step3.username || ""}
                      onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.username
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Username *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.password || ""}
                      onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.password
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Password *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.step3.passphrase || ""}
                      onChange={(e) => handleInputChange("step3", "passphrase", e.target.value)}
                      className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                      placeholder=" "
                    />
                    <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                      formData.step3.passphrase
                        ? 'top-0.5 text-xs text-blue-600' 
                        : 'top-3.5 text-sm text-gray-500'
                    }`}>
                      Passphrase *
                    </label>
                  </div>
                </div>
              );

            case "RESTService Application":
              return (
                <div className="space-y-6">
                  {/* Service Endpoints/Operations */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getUserService || ""}
                        onChange={(e) => handleInputChange("step3", "getUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get User Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getAllUserService || ""}
                        onChange={(e) => handleInputChange("step3", "getAllUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getAllUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get All User Service *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getGroupService || ""}
                        onChange={(e) => handleInputChange("step3", "getGroupService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getGroupService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get Group Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getAllGroupsService || ""}
                        onChange={(e) => handleInputChange("step3", "getAllGroupsService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getAllGroupsService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get All Groups Service *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.assignAccessToUserService || ""}
                        onChange={(e) => handleInputChange("step3", "assignAccessToUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.assignAccessToUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Assign Access To User Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeAccessFromUserService || ""}
                        onChange={(e) => handleInputChange("step3", "revokeAccessFromUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeAccessFromUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Access From User Service *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeAccessFromGroupService || ""}
                        onChange={(e) => handleInputChange("step3", "revokeAccessFromGroupService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeAccessFromGroupService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Access From Group Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteUserService || ""}
                        onChange={(e) => handleInputChange("step3", "deleteUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete User Service *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createUserService || ""}
                        onChange={(e) => handleInputChange("step3", "createUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create User Service *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateUserService || ""}
                        onChange={(e) => handleInputChange("step3", "updateUserService", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateUserService
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update User Service *
                      </label>
                    </div>
                  </div>

                  {/* Authentication & Authorization */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.authorizationType || ""}
                        onChange={(e) => handleInputChange("step3", "authorizationType", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.authorizationType
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Authorization Type *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.authorizationURL || ""}
                        onChange={(e) => handleInputChange("step3", "authorizationURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.authorizationURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Authorization URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.grantType || ""}
                        onChange={(e) => handleInputChange("step3", "grantType", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.grantType
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Grant Type *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.scope || ""}
                        onChange={(e) => handleInputChange("step3", "scope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.scope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Scope *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.authUserName || ""}
                        onChange={(e) => handleInputChange("step3", "authUserName", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.authUserName
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Auth User Name *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.bearerToken || ""}
                        onChange={(e) => handleInputChange("step3", "bearerToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.bearerToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Bearer Token *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientId || ""}
                        onChange={(e) => handleInputChange("step3", "clientId", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientId
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client ID *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.clientSecret || ""}
                        onChange={(e) => handleInputChange("step3", "clientSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Secret *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.refreshToken || ""}
                        onChange={(e) => handleInputChange("step3", "refreshToken", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.refreshToken
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Refresh Token *
                      </label>
                    </div>
                  </div>

                  {/* Header & Payload Configuration */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.headerAttributes || ""}
                        onChange={(e) => handleInputChange("step3", "headerAttributes", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.headerAttributes
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Header Attributes *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "usersPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Payload Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupsPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "groupsPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupsPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Groups Payload Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.createUserPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "createUserPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.createUserPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Create User Payload Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.updateUserPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "updateUserPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.updateUserPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Update User Payload Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getUserPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "getUserPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getUserPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get User Payload Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.getGroupPayloadPath || ""}
                        onChange={(e) => handleInputChange("step3", "getGroupPayloadPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.getGroupPayloadPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Get Group Payload Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersGroupIdAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersGroupIdAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersGroupIdAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Group ID Attribute Path *
                      </label>
                    </div>
                  </div>

                  {/* Attribute & Mapping Paths */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersGroupIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersGroupIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersGroupIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Group IDAD Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersGroupDisplayAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersGroupDisplayAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersGroupDisplayAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Group Display Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersOnDemandIdAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersOnDemandIdAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersOnDemandIdAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users OnDemand ID Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersOnDemandIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersOnDemandIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersOnDemandIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users OnDemand IDAD Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersOnDemandIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersOnDemandIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersOnDemandIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users OnDemand IDAD Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersOnDemandDisplayAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersOnDemandDisplayAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersOnDemandDisplayAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users OnDemand Display Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersRoleIdAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersRoleIdAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersRoleIdAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Role ID Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersRoleIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersRoleIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersRoleIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Role IDAD Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.usersRoleDisplayAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "usersRoleDisplayAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.usersRoleDisplayAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Users Role Display Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupMembersAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "groupMembersAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupMembersAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Members Attribute Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupMembersIdadAttributePath || ""}
                        onChange={(e) => handleInputChange("step3", "groupMembersIdadAttributePath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupMembersIdadAttributePath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Members IDAD Attribute Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userIdadAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "userIdadAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userIdadAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User IDAD Attribute *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupIdadAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "groupIdadAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupIdadAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group IDAD Attribute *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupDisplayNameAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "groupDisplayNameAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupDisplayNameAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Display Name Attribute *
                      </label>
                    </div>
                  </div>

                  {/* Total Results Configuration */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.totalResultsHdPerUsersPath || ""}
                        onChange={(e) => handleInputChange("step3", "totalResultsHdPerUsersPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.totalResultsHdPerUsersPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Total Results HD Per Users Path *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.totalResultsHdPerGroupsPath || ""}
                        onChange={(e) => handleInputChange("step3", "totalResultsHdPerGroupsPath", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.totalResultsHdPerGroupsPath
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Total Results HD Per Groups Path *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.totalResultsAttributePerUsers || ""}
                        onChange={(e) => handleInputChange("step3", "totalResultsAttributePerUsers", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.totalResultsAttributePerUsers
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Total Results Attribute Per Users *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.totalResultsAttributePerGroups || ""}
                        onChange={(e) => handleInputChange("step3", "totalResultsAttributePerGroups", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.totalResultsAttributePerGroups
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Total Results Attribute Per Groups *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Active Directory Collector":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.collector || ""}
                        onChange={(e) => handleInputChange("step3", "collector", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.collector
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Collector *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.groupScope || ""}
                        onChange={(e) => handleInputChange("step3", "groupScope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.groupScope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Group Scope *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.userScope || ""}
                        onChange={(e) => handleInputChange("step3", "userScope", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.userScope
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        User Scope *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.defaultGroupOfNewAccount || ""}
                        onChange={(e) => handleInputChange("step3", "defaultGroupOfNewAccount", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.defaultGroupOfNewAccount
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Default Group Of New Account *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.deleteAccountOnDeleteRequest || ""}
                        onChange={(e) => handleInputChange("step3", "deleteAccountOnDeleteRequest", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.deleteAccountOnDeleteRequest
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Delete Account On Delete Request *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.revokeMembershipOnDeleteRequest || ""}
                        onChange={(e) => handleInputChange("step3", "revokeMembershipOnDeleteRequest", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.revokeMembershipOnDeleteRequest
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Revoke Membership On Delete Request *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.primaryIdentityAttribute || ""}
                        onChange={(e) => handleInputChange("step3", "primaryIdentityAttribute", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.primaryIdentityAttribute
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Primary Identity Attribute *
                      </label>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              );

            case "Azure":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantURL || ""}
                        onChange={(e) => handleInputChange("step3", "tenantURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant URL *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.operationalURL || ""}
                        onChange={(e) => handleInputChange("step3", "operationalURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.operationalURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Operational URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantID || ""}
                        onChange={(e) => handleInputChange("step3", "tenantID", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantID
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.clientID || ""}
                        onChange={(e) => handleInputChange("step3", "clientID", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientID
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client ID *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.clientSecret || ""}
                        onChange={(e) => handleInputChange("step3", "clientSecret", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.clientSecret
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Client Secret *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.trustedSource || ""}
                        onChange={(e) => handleInputChange("step3", "trustedSource", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.trustedSource
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Trusted Source *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "Centrify":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantID || ""}
                        onChange={(e) => handleInputChange("step3", "tenantID", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantID
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant ID *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.tenantURL || ""}
                        onChange={(e) => handleInputChange("step3", "tenantURL", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.tenantURL
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Tenant URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            case "ATG Web Commerce":
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.driver || ""}
                        onChange={(e) => handleInputChange("step3", "driver", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.driver
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Driver *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.jdbcUrl || ""}
                        onChange={(e) => handleInputChange("step3", "jdbcUrl", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.jdbcUrl
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        JDBC URL *
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={formData.step3.username || ""}
                        onChange={(e) => handleInputChange("step3", "username", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.username
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Username *
                      </label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={formData.step3.password || ""}
                        onChange={(e) => handleInputChange("step3", "password", e.target.value)}
                        className="w-full px-4 pt-5 pb-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 no-underline"
                        placeholder=" "
                      />
                      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        formData.step3.password
                          ? 'top-0.5 text-xs text-blue-600' 
                          : 'top-3.5 text-sm text-gray-500'
                      }`}>
                        Password *
                      </label>
                    </div>
                  </div>
                </div>
              );

            default:
              return (
                <div className="space-y-6">
                  <p className="text-gray-500 text-center py-8">
                    Please select an application type in Step 1 to see integration settings
                  </p>
                </div>
              );
          }
        };

        const getFieldDescriptions = () => {
          switch (selectedAppType) {
            case "LDAP":
            case "Generic LDAP":
              return {
                hostname: "The hostname or IP address of the LDAP server",
                port: "The port number for LDAP connection (usually 389 or 636)",
                username: "Username for LDAP authentication",
                password: "Password for LDAP authentication",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory"
              };
            case "Active Directory":
              return {
                hostname: "The hostname or IP address of the Active Directory server",
                port: "The port number for Active Directory connection (e.g., 389, 636)",
                useSSL: "Whether to use SSL for the Active Directory connection",
                username: "Username for connecting to Active Directory",
                password: "Password for the Active Directory username",
                domain: "The domain name of the Active Directory",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory"
              };
            case "Active Directory Collector":
              return {
                collector: "The collector configuration for Active Directory",
                groupScope: "Scope for group collection in Active Directory",
                userScope: "Scope for user collection in Active Directory",
                defaultGroupOfNewAccount: "Default group assignment for new accounts",
                deleteAccountOnDeleteRequest: "Whether to delete account when delete request is made",
                revokeMembershipOnDeleteRequest: "Whether to revoke membership when delete request is made",
                primaryIdentityAttribute: "Primary attribute used for identity in Active Directory"
              };
            case "Database":
              return {
                databaseType: "Type of database (MySQL, PostgreSQL, Oracle, etc.)",
                connectionURL: "JDBC connection URL for the database",
                driver: "JDBC driver class name for database connection",
                username: "Database username for authentication",
                password: "Database password for authentication",
                viewGetAllUsers: "Database view or stored procedure to get all users",
                viewGetAllGroups: "Database view or stored procedure to get all groups",
                viewGetAllRoleContents: "Database view or stored procedure to get all role contents",
                viewGetUser: "Database view or stored procedure to get a specific user",
                viewGetGroup: "Database view or stored procedure to get a specific group",
                viewGetRoleContent: "Database view or stored procedure to get role content",
                uniqueIDSchemaMap: "Schema mapping for unique identifiers",
                spRevokeGroupMembership: "Stored procedure to revoke group membership",
                revokeGroupMembershipDefinition: "Definition for revoke group membership operation",
                revokeGroupMembershipResponseDefinition: "Response definition for revoke group membership",
                spAddGroupMembership: "Stored procedure to add group membership",
                addGroupMembershipDefinition: "Definition for add group membership operation",
                addGroupMembershipResponseDefinition: "Response definition for add group membership",
                groupSchemaMap: "Schema mapping for group attributes",
                roleContentSchemaMap: "Schema mapping for role content attributes",
                spCreateAccount: "Stored procedure to create account",
                createAccountDefinition: "Definition for create account operation",
                createAccountResponseDefinition: "Response definition for create account",
                spUpdateAccount: "Stored procedure to update account",
                updateAccountDefinition: "Definition for update account operation",
                updateAccountResponseDefinition: "Response definition for update account",
                spDeleteAccount: "Stored procedure to delete account",
                deleteAccountDefinition: "Definition for delete account operation",
                deleteAccountResponseDefinition: "Response definition for delete account",
                spEnableAccount: "Stored procedure to enable account",
                enableAccountDefinition: "Definition for enable account operation",
                enableAccountResponseDefinition: "Response definition for enable account",
                spDisableAccount: "Stored procedure to disable account",
                disableAccountDefinition: "Definition for disable account operation",
                disableAccountResponseDefinition: "Response definition for disable account"
              };
            case "Database Collector":
              return {
                driver: "JDBC driver class name for database connection",
                collector: "Database collector configuration for data collection"
              };
            case "Database User Management":
              return {
                driver: "JDBC driver class name for database connection",
                jdbcUrl: "JDBC connection URL for the database",
                username: "Database username for authentication",
                password: "Database password for authentication"
              };
            case "Disconnected Application":
              return {
                applicationName: "Name of the disconnected application",
                owner: "Owner of the disconnected application",
                manuallyFulfill: "Whether to manually fulfill requests for this application",
                isIntegratedWithOIM: "Whether the application is integrated with OIM",
                raiseTicket: "Whether to raise tickets for this application",
                ticketingSystem: "Name of the ticketing system to use",
                ticketingAppId: "Application ID in the ticketing system",
                ticketingAPIToken: "API token for ticketing system authentication",
                assignTo: "Default assignee for tickets",
                oimAppId: "Application ID in OIM system",
                oimAPIToken: "API token for OIM system authentication"
              };
            case "E2EMigration Client":
              return {
                validFrom: "Start date/time for validity period",
                validUpto: "End date/time for validity period",
                validityToken: "Token for validating end-to-end migration client"
              };
            case "Epic":
              return {
                driver: "JDBC driver class name for Epic database connection",
                jdbcUrl: "JDBC connection URL for Epic database",
                username: "Database username for Epic authentication",
                password: "Database password for Epic authentication"
              };
            case "Flatfile":
              return {
                owner: "Owner of the flatfile application",
                enableIntegrationWithIV: "Enable integration with Identity Verification system"
              };
            case "LDAP":
              return {
                hostname: "The hostname or IP address of the LDAP server",
                port: "The port number for LDAP connection (usually 389 or 636)",
                serviceId: "Service ID for LDAP authentication",
                password: "Password for LDAP authentication",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory"
              };
            case "Generic LDAP":
              return {
                hostname: "The hostname or IP address of the LDAP server",
                port: "The port number for LDAP connection (usually 389 or 636)",
                username: "Username for LDAP authentication",
                password: "Password for LDAP authentication",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory"
              };
            case "AWS":
              return {
                accessID: "AWS Access Key ID for authentication",
                accessSecret: "AWS Secret Access Key for authentication"
              };
            case "Logical Application":
              return {
                applicationId: "Application ID for the logical application"
              };
            case "LogicalApp Active Directory":
              return {
                hostname: "The hostname or IP address of the Active Directory server",
                port: "The port number for Active Directory connection (e.g., 389, 636)",
                useSSL: "Whether to use SSL for the Active Directory connection",
                username: "Username for connecting to Active Directory",
                password: "Password for the Active Directory username",
                domain: "The domain name of the Active Directory",
                userSearchBase: "Base DN for searching users in the directory",
                groupSearchBase: "Base DN for searching groups in the directory",
                groupScope: "Scope for group collection in Active Directory",
                userScope: "Scope for user collection in Active Directory",
                defaultGroupOfNewAccount: "Default group assignment for new accounts",
                deleteAccountOnDeleteRequest: "Whether to delete account when delete request is made",
                revokeMembershipOnDeleteRequest: "Whether to revoke membership when delete request is made",
                primaryIdentityAttribute: "Primary attribute used for identity in Active Directory"
              };
            case "OKTA":
              return {
                apiKey: "OKTA API key for authentication",
                hostURL: "OKTA organization URL"
              };
            case "OIMOUD Management":
              return {
                restServiceURL: "REST service URL for OIMOUD management",
                t3ServiceHostname: "T3 service hostname for OIMOUD connection",
                t3ServicePort: "T3 service port number for OIMOUD connection",
                t3ServiceAuthloginConfigFile: "T3 service authentication login configuration file path",
                username: "Username for OIMOUD authentication",
                password: "Password for OIMOUD authentication",
                tenantId: "Tenant ID for OIMOUD management",
                oudServiceAccountId: "OUD service account ID for authentication",
                oudServiceAccountPWD: "OUD service account password for authentication"
              };
            case "Oracle E-Business":
              return {
                driver: "JDBC driver class name for Oracle E-Business database connection",
                username: "Database username for Oracle E-Business authentication",
                jdbcUrl: "JDBC connection URL for Oracle E-Business database",
                password: "Database password for Oracle E-Business authentication"
              };
            case "Oracle IDCS":
              return {
                clientId: "Oracle IDCS client ID for application authentication",
                clientSecret: "Oracle IDCS client secret for secure authentication",
                endpointURL: "Oracle IDCS endpoint URL for API access",
                username: "Username for Oracle IDCS authentication",
                password: "Password for Oracle IDCS authentication",
                enableAutoRetry: "Enable automatic retry for failed operations",
                autoRetryInterval: "Interval in seconds between automatic retry attempts",
                maximumAutoRetry: "Maximum number of automatic retry attempts"
              };
            case "Oracle Identity Manager":
              return {
                applicationServerType: "Type of application server for Oracle Identity Manager",
                namingProviderUrl: "Naming provider URL for Oracle Identity Manager connection",
                authLoginConfigPath: "Authentication login configuration file path",
                username: "Username for Oracle Identity Manager authentication",
                password: "Password for Oracle Identity Manager authentication",
                dbSchema: "Database schema for Oracle Identity Manager"
              };
            case "OracleFusionApps":
              return {
                endpoint: "Oracle Fusion Applications endpoint URL for API access",
                username: "Username for Oracle Fusion Applications authentication",
                password: "Password for Oracle Fusion Applications authentication"
              };
            case "PeopleSoft":
              return {
                driver: "JDBC driver class name for PeopleSoft database connection",
                jdbcUrl: "JDBC connection URL for PeopleSoft database",
                username: "Database username for PeopleSoft authentication",
                password: "Database password for PeopleSoft authentication"
              };
            case "PeopleSoftHR":
              return {
                driver: "JDBC driver class name for PeopleSoft HR database connection",
                jdbcUrl: "JDBC connection URL for PeopleSoft HR database",
                username: "Database username for PeopleSoft HR authentication",
                password: "Database password for PeopleSoft HR authentication"
              };
            case "PeopleSoftUM":
              return {
                serviceURL: "PeopleSoft User Management service URL for API access",
                host: "Host server for PeopleSoft User Management connection",
                senderNode: "Sender node identifier for PeopleSoft communication",
                receiverNode: "Receiver node identifier for PeopleSoft communication",
                createUserOperationMethod: "Method name for creating users in PeopleSoft",
                updateUserOperationMethod: "Method name for updating users in PeopleSoft",
                deleteUserOperationMethod: "Method name for deleting users in PeopleSoft",
                getUserOperationMethod: "Method name for retrieving single user from PeopleSoft",
                getAllUsersOperationMethod: "Method name for retrieving all users from PeopleSoft",
                createGroupOperationMethod: "Method name for creating groups in PeopleSoft",
                deleteGroupOperationMethod: "Method name for deleting groups in PeopleSoft",
                getGroupOperationMethod: "Method name for retrieving single group from PeopleSoft",
                getAllGroupsOperationMethod: "Method name for retrieving all groups from PeopleSoft",
                defaultRole: "Default role assigned to new users in PeopleSoft",
                defaultPrimaryPermission: "Default primary permission for new users in PeopleSoft",
                defaultNavigatorPermission: "Default navigator permission for new users in PeopleSoft",
                defaultRowSecurityPermission: "Default row security permission for new users in PeopleSoft",
                defaultProcessProfilePermission: "Default process profile permission for new users in PeopleSoft"
              };
            case "Provisioning Agent":
              return {
                applicationId: "Unique identifier for the provisioning agent application",
                applicationHooks: "Configuration hooks for the provisioning agent application",
                isEnabled: "Enable or disable status for the provisioning agent",
                enableAutoRetry: "Enable automatic retry functionality for failed operations",
                autoRetryInterval: "Time interval between automatic retry attempts",
                maximumAutoRetry: "Maximum number of automatic retry attempts allowed"
              };
            case "RSA":
              return {
                adminId: "RSA administrator ID for authentication",
                adminPassword: "RSA administrator password for authentication"
              };
            case "SAP":
              return {
                driver: "JDBC driver class name for SAP database connection",
                jdbcUrl: "JDBC connection URL for SAP database",
                username: "Database username for SAP authentication",
                password: "Database password for SAP authentication"
              };
            case "SailPointIIQApplications":
              return {
                hostname: "SailPoint IIQ server hostname for connection",
                port: "SailPoint IIQ server port number",
                baseUri: "Base URI for SailPoint IIQ API endpoints",
                username: "Username for SailPoint IIQ authentication",
                password: "Password for SailPoint IIQ authentication"
              };
            case "SailPointIdentityIQ":
              return {
                hostname: "SailPoint Identity IIQ server hostname for connection",
                port: "SailPoint Identity IIQ server port number",
                baseUri: "Base URI for SailPoint Identity IIQ API endpoints",
                username: "Username for SailPoint Identity IIQ authentication",
                password: "Password for SailPoint Identity IIQ authentication"
              };
            case "SalesForce":
              return {
                clientId: "Salesforce OAuth client ID for authentication",
                clientSecret: "Salesforce OAuth client secret for authentication",
                endpoint: "Salesforce API endpoint URL",
                username: "Salesforce username for authentication",
                password: "Salesforce password for authentication",
                securityToken: "Salesforce security token for API access"
              };
            case "Service Now Ticketing":
              return {
                tenantUrl: "ServiceNow tenant URL for ticketing system connection",
                baseUri: "ServiceNow base URI for API endpoints",
                username: "ServiceNow username for authentication",
                password: "ServiceNow password for authentication"
              };
            case "Unix":
              return {
                connectionType: "Type of connection to use (SSH, Telnet, Rlogin)",
                host: "Unix hostname or IP address for connection",
                port: "Port number for Unix connection",
                username: "Unix username for authentication",
                password: "Unix password for authentication",
                passphrase: "Passphrase for SSH key authentication"
              };
            case "RESTService Application":
              return {
                getUserService: "REST service endpoint for retrieving a single user",
                getAllUserService: "REST service endpoint for retrieving all users",
                getGroupService: "REST service endpoint for retrieving a single group",
                getAllGroupsService: "REST service endpoint for retrieving all groups",
                assignAccessToUserService: "REST service endpoint for assigning access to a user",
                revokeAccessFromUserService: "REST service endpoint for revoking access from a user",
                revokeAccessFromGroupService: "REST service endpoint for revoking access from a group",
                deleteUserService: "REST service endpoint for deleting a user",
                createUserService: "REST service endpoint for creating a user",
                updateUserService: "REST service endpoint for updating a user",
                authorizationType: "Type of authorization used for REST service authentication",
                authorizationURL: "URL for authorization endpoint",
                grantType: "OAuth grant type for authentication",
                scope: "OAuth scope for API access permissions",
                authUserName: "Username for REST service authentication",
                password: "Password for REST service authentication",
                bearerToken: "Bearer token for API authentication",
                clientId: "OAuth client ID for authentication",
                clientSecret: "OAuth client secret for authentication",
                refreshToken: "OAuth refresh token for token renewal",
                headerAttributes: "Custom header attributes for REST requests",
                usersPayloadPath: "JSON path to users data in API response",
                groupsPayloadPath: "JSON path to groups data in API response",
                createUserPayloadPath: "JSON path for user creation payload",
                updateUserPayloadPath: "JSON path for user update payload",
                getUserPayloadPath: "JSON path for user retrieval payload",
                getGroupPayloadPath: "JSON path for group retrieval payload",
                usersGroupIdAttributePath: "JSON path to group ID attribute in user data",
                usersGroupIdadAttributePath: "JSON path to group IDAD attribute in user data",
                usersGroupDisplayAttributePath: "JSON path to group display attribute in user data",
                usersOnDemandIdAttributePath: "JSON path to OnDemand ID attribute in user data",
                usersOnDemandIdadAttributePath: "JSON path to OnDemand IDAD attribute in user data",
                usersOnDemandDisplayAttributePath: "JSON path to OnDemand display attribute in user data",
                usersRoleIdAttributePath: "JSON path to role ID attribute in user data",
                usersRoleIdadAttributePath: "JSON path to role IDAD attribute in user data",
                usersRoleDisplayAttributePath: "JSON path to role display attribute in user data",
                groupMembersAttributePath: "JSON path to group members attribute",
                groupMembersIdadAttributePath: "JSON path to group members IDAD attribute",
                userIdadAttribute: "User IDAD attribute identifier",
                groupIdadAttribute: "Group IDAD attribute identifier",
                groupDisplayNameAttribute: "Group display name attribute",
                totalResultsHdPerUsersPath: "JSON path to total results header for users",
                totalResultsHdPerGroupsPath: "JSON path to total results header for groups",
                totalResultsAttributePerUsers: "Total results attribute for users pagination",
                totalResultsAttributePerGroups: "Total results attribute for groups pagination"
              };
            case "Azure":
              return {
                tenantURL: "Azure tenant URL for authentication",
                operationalURL: "Azure operational URL for operations",
                tenantID: "Azure tenant ID for identification",
                clientID: "Azure client ID for application authentication",
                clientSecret: "Azure client secret for secure authentication",
                trustedSource: "Trusted source configuration for Azure integration"
              };
            case "Centrify":
              return {
                tenantID: "Centrify tenant ID for identification",
                tenantURL: "Centrify tenant URL for authentication",
                username: "Username for Centrify authentication",
                password: "Password for Centrify authentication"
              };
            case "ATG Web Commerce":
              return {
                driver: "JDBC driver class name for database connection",
                jdbcUrl: "JDBC connection URL for ATG database",
                username: "Database username for ATG authentication",
                password: "Database password for ATG authentication"
              };
            default:
              return {};
          }
        };

        const fieldDescriptions = getFieldDescriptions();

        return (
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Integration Settings for: {selectedAppType || "No Application Selected"}
                </h3>
                <p className="text-sm text-gray-600">
                  Configure the integration settings for your selected application type.
                </p>
              </div>
              {renderIntegrationFields()}
            </div>
            
            <div className="w-96 bg-gray-50 rounded-lg p-6">
              <div className="space-y-4">
                {Object.entries(fieldDescriptions).map(([field, description]) => (
                  <div key={field} className="border-b border-gray-200 pb-3 last:border-b-0">
                    <h5 className="text-sm font-medium text-gray-700 capitalize mb-1">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </h5>
                    <p className="text-xs text-gray-600">{description}</p>
                  </div>
                ))}
                {Object.keys(fieldDescriptions).length === 0 && (
                  <p className="text-sm text-gray-500">
                    Select an application type to see field descriptions.
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <p className="text-gray-500 text-center py-8">Finish Up fields will be added later</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-8 px-4">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/settings/app-inventory")}
            className="flex items-center text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="ml-2">Back to App Inventory</span>
          </button>
        </div>

         {/* Progress Steps */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
           <div className="flex items-center justify-between">
             {steps.map((step, index) => (
               <div key={step.id} className="flex items-center">
                 <div
                   className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                     currentStep >= step.id
                       ? "bg-blue-600 text-white"
                       : "bg-gray-200 text-gray-600"
                   }`}
                 >
                   {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                 </div>
                 <div className="ml-3">
                   <p className="text-sm font-medium text-gray-900">{step.title}</p>
                 </div>
                 {index < steps.length - 1 && (
                   <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
                 )}
               </div>
             ))}
           </div>
         </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                currentStep === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

             <div className="flex gap-3">
               {currentStep < 4 ? (
                 <button
                   onClick={handleNext}
                   className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                 >
                   Next
                   <ChevronRight className="w-4 h-4 ml-2" />
                 </button>
               ) : (
                 <button
                   onClick={handleSubmit}
                   className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                 >
                   <Check className="w-4 h-4 mr-2" />
                   Submit Application
                 </button>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
