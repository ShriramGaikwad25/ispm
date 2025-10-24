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
    authenticationMethod: string;
    accessControl: string;
    dataClassification: string;
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
      authenticationMethod: "",
      accessControl: "",
      dataClassification: ""
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
        return (
          <div className="space-y-6">
            <p className="text-gray-500 text-center py-8">Integration Setting fields will be added later</p>
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
