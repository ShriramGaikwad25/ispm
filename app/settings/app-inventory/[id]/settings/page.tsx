"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Network, Sliders, Edit } from "lucide-react";
import { getApplicationDetails } from "@/lib/api";
import HorizontalTabs from "@/components/HorizontalTabs";
import ApplicationEditTab, {
  type ApplicationEditTabHandle,
} from "../components/ApplicationEditTab";
import SchemaMappingTab from "../components/SchemaMappingTab";
import AdvanceSettingTab from "../components/AdvanceSettingTab";

const TAB_EDIT = "configuration";
const TAB_SCHEMA = "schema";
const TAB_ADVANCED = "advanced";

const TAB_IDS = [TAB_EDIT, TAB_SCHEMA, TAB_ADVANCED] as const;

function tabIdToIndex(tab: string): number {
  const i = TAB_IDS.indexOf(tab as typeof TAB_IDS[number]);
  return i >= 0 ? i : 0;
}

function indexToTabId(index: number): string {
  return TAB_IDS[Math.max(0, Math.min(index, TAB_IDS.length - 1))];
}

export default function AppInventorySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = (params?.id as string) ?? "";
  const tabFromUrl = searchParams.get("tab") ?? TAB_EDIT;
  const [activeTabIndex, setActiveTabIndex] = useState(() => tabIdToIndex(tabFromUrl));
  const [appName, setAppName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigEditing, setIsConfigEditing] = useState(false);
  const configTabRef = useRef<ApplicationEditTabHandle>(null);

  useEffect(() => {
    setActiveTabIndex(tabIdToIndex(tabFromUrl));
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTabIndex !== 0) setIsConfigEditing(false);
  }, [activeTabIndex]);

  useEffect(() => {
    if (!applicationId) {
      setIsLoading(false);
      return;
    }
    const apiToken =
      typeof window !== "undefined"
        ? sessionStorage.getItem(`app-inventory-token-${applicationId}`) ?? ""
        : "";
    getApplicationDetails(applicationId, apiToken)
      .then((data: any) => {
        const app = data?.Application ?? data;
        setAppName(
          app?.ApplicationName ?? app?.applicationName ?? app?.name ?? "Application Settings"
        );
      })
      .catch(() => setAppName("Application Settings"))
      .finally(() => setIsLoading(false));
  }, [applicationId]);

  const handleBack = () => {
    router.push("/settings/app-inventory");
  };

  const handleTabChange = (index: number) => {
    setActiveTabIndex(index);
    const tab = indexToTabId(index);
    router.replace(`/settings/app-inventory/${applicationId}/settings?tab=${tab}`, { scroll: false });
  };

  const tabsData = useMemo(() => {
    const EditTab = () => (
      <ApplicationEditTab
        ref={configTabRef}
        applicationId={applicationId}
        onBackToInventory={handleBack}
        isEditing={isConfigEditing}
        onEditingChange={setIsConfigEditing}
        hideToolbar
      />
    );
    const SchemaTab = () => (
      <SchemaMappingTab applicationId={applicationId} onCancel={handleBack} />
    );
    const AdvanceTab = () => (
      <AdvanceSettingTab
        applicationId={applicationId}
        showIntegrationAdvancedGroups
        onCancel={handleBack}
      />
    );
    return [
      { label: "Configuration ", component: EditTab, icon: Pencil },
      { label: "Schema Mapping", component: SchemaTab, icon: Network },
      { label: "Advance Setting", component: AdvanceTab, icon: Sliders },
    ];
  }, [applicationId, isConfigEditing]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Application Settings</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col w-full min-w-0">
      <div className="bg-white border-b border-gray-200 px-4 py-4 w-full">
        <div className="flex items-center justify-between gap-4 w-full min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 truncate">{appName}</h1>
          </div>
          {activeTabIndex === 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {isConfigEditing ? (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                    onClick={() => configTabRef.current?.cancelEdit()}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                    onClick={() => void configTabRef.current?.submit()}
                  >
                    Submit
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-sm font-medium"
                  onClick={() => configTabRef.current?.startEdit()}
                  aria-label="Edit Application"
                  title="Edit Application"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 w-full min-w-0 py-3">
        <HorizontalTabs
          tabs={tabsData}
          defaultIndex={0}
          activeIndex={activeTabIndex}
          onChange={handleTabChange}
        />
      </div>
    </div>
  );
}
