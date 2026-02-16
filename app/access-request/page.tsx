"use client";
import React, { useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import HorizontalTabs from "@/components/HorizontalTabs";
import UserSearchTab from "./UserSearchTab";
import UserGroupTab from "./UserGroupTab";
import SelectAccessTab from "./SelectAccessTab";
import DetailsTab from "./DetailsTab";
import ReviewTab from "./ReviewTab";
import { useSelectedUsers } from "@/contexts/SelectedUsersContext";

const AccessRequest: React.FC = () => {
  const { selectedUsers, removeUser } = useSelectedUsers();
  const [selectedOption, setSelectedOption] = useState<"self" | "others">("self");
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState(0);

  const steps = [
    { id: 1, title: "Select User" },
    { id: 2, title: "Select Access" },
    { id: 3, title: "Details" },
    { id: 4, title: "Review and Submit" },
  ];

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const userTabs = [
    {
      label: "User Search",
      component: UserSearchTab,
    },
    {
      label: "User Group",
      component: UserGroupTab,
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2 text-blue-950">
        Access Request
      </h1>

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

      {/* Navigation Buttons */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
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
            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
              >
                <Check className="w-4 h-4 mr-2" />
                Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step 1 Content */}
      {currentStep === 1 && (
        <>
          {/* Toggle Button - Only show in step 1 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-center items-center gap-4">
              <span 
                className={`text-sm font-medium cursor-pointer ${
                  selectedOption === "self" ? "text-blue-600 font-semibold" : "text-gray-600"
                }`}
                onClick={() => setSelectedOption("self")}
              >
                Request for Self
              </span>
              
              <label className="relative inline-block w-14 h-7 cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={selectedOption === "others"}
                  onChange={(e) => setSelectedOption(e.target.checked ? "others" : "self")}
                />
                {/* Track */}
                <div className="absolute w-full h-full bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-all"></div>
                {/* Thumb */}
                <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all peer-checked:translate-x-7"></div>
              </label>
              
              <span 
                className={`text-sm font-medium cursor-pointer ${
                  selectedOption === "others" ? "text-blue-600 font-semibold" : "text-gray-600"
                }`}
                onClick={() => setSelectedOption("others")}
              >
                Request for Others
              </span>
            </div>
          </div>

          {/* User Tabs - Show when "Request for Others" is selected */}
          {selectedOption === "others" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <HorizontalTabs
                tabs={userTabs}
                activeIndex={activeTab}
                onChange={setActiveTab}
              />
            </div>
          )}
        </>
      )}

      {/* Step 2 Content */}
      {currentStep === 2 && (
        <>
          {/* Show Selected Users at the top (if "Request for Others") */}
          {selectedUsers.length > 0 && selectedOption === "others" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Selected Users</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="relative p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
                  >
                    <button
                      onClick={() => removeUser(user.id)}
                      className="absolute top-1 right-1 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Remove user"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="pr-6">
                      <p className="font-medium text-sm text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-1">{user.username}</p>
                      <p className="text-xs text-gray-600 truncate mt-1">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span className="truncate">{user.department}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show Role Catalog */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <SelectAccessTab onApply={() => setCurrentStep(3)} />
          </div>
        </>
      )}

      {/* Step 3 Content - Details Tab */}
      {currentStep === 3 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <DetailsTab />
        </div>
      )}

      {/* Step 4 Content - Review and Submit */}
      {currentStep === 4 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <ReviewTab />
        </div>
      )}
    </div>
  );
};

export default AccessRequest;
