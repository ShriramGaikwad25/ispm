"use client";

import { useMemo, useState } from "react";

type OnboardMode = "define" | "select";

type AppConfig = {
  name: string;
  databaseType: string;
  connectionUrl: string;
  driver: string;
  username: string;
  password: string;
};

const predefinedApps: AppConfig[] = [
  {
    name: "Workday HR",
    databaseType: "PostgreSQL",
    connectionUrl: "postgres://workday-db.company.com:5432/workday",
    driver: "org.postgresql.Driver",
    username: "workday_user",
    password: "********",
  },
  {
    name: "SAP ERP",
    databaseType: "HANA",
    connectionUrl: "hana://sap-hana.company.com:39015/ERP",
    driver: "com.sap.db.jdbc.Driver",
    username: "sap_admin",
    password: "********",
  },
  {
    name: "Oracle Finance",
    databaseType: "Oracle",
    connectionUrl: "jdbc:oracle:thin:@oracle.company.com:1521/FIN",
    driver: "oracle.jdbc.OracleDriver",
    username: "fin_user",
    password: "********",
  },
];

export default function OnboardAppPage() {
  const [mode, setMode] = useState<OnboardMode>("define");
  const [step, setStep] = useState<1 | 2>(1);

  const [appName, setAppName] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);

  const [databaseType, setDatabaseType] = useState("");
  const [connectionUrl, setConnectionUrl] = useState("");
  const [driver, setDriver] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [aiOpen, setAiOpen] = useState<boolean>(false);

  const filteredApps = useMemo(() => {
    if (!appName.trim()) return predefinedApps;
    const lower = appName.toLowerCase();
    return predefinedApps.filter((a) => a.name.toLowerCase().includes(lower));
  }, [appName]);

  function goNext() {
    if (step === 1) {
      if (mode === "define") {
        if (!appName.trim()) return; // require name
        // Start with empty details
        setDatabaseType("");
        setConnectionUrl("");
        setDriver("");
        setUsername("");
        setPassword("");
        setStep(2);
        return;
      }
      if (mode === "select") {
        const index = selectedIndex ?? (filteredApps.length === 1 ? 0 : null);
        if (index == null) return; // require a selection
        const chosen = filteredApps[index];
        setAppName(chosen.name);
        setDatabaseType(chosen.databaseType);
        setConnectionUrl(chosen.connectionUrl);
        setDriver(chosen.driver);
        setUsername(chosen.username);
        setPassword(chosen.password);
        setStep(2);
        return;
      }
    }
  }

  function goBack() {
    if (step === 2) setStep(1);
  }

  function resetSelection(newMode: OnboardMode) {
    setMode(newMode);
    setStep(1);
    setAppName("");
    setSelectedIndex(null);
  }

  function handleSelectFromList(i: number) {
    setSelectedIndex(i);
    const chosen = filteredApps[i];
    setAppName(chosen.name);
    setShowResults(false);
  }

  function handleSave() {
    // Placeholder: integrate with API when available
    // eslint-disable-next-line no-console
    console.log({ appName, databaseType, connectionUrl, driver, username, password });
    alert("Configuration captured. Integrate save API as needed.");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 px-6 pt-6">Onboard App</h1>
        <div className="bg-white p-6 flex-1">

          {/* Step 1: Name or Select */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Name
                </label>
                {mode === "define" ? (
                  <div className="flex items-start justify-between gap-6 w-full">
                    <div className="flex items-center gap-3">
                      <input
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        placeholder="Enter a unique app name"
                        className="w-full max-w-lg px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={goNext}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={!appName.trim()}
                      >
                        Next
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => resetSelection("define")}
                        className="px-4 py-2 rounded border text-sm font-medium bg-blue-600 text-white border-blue-600"
                      >
                        Define New
                      </button>
                      <button
                        type="button"
                        onClick={() => resetSelection("select")}
                        className="px-4 py-2 rounded border text-sm font-medium bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      >
                        Select from List
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-6 w-full">
                    <div className="flex items-start gap-3">
                      <div className="w-full max-w-lg">
                        <input
                          value={appName}
                          onChange={(e) => {
                            setAppName(e.target.value);
                            setSelectedIndex(null);
                            setShowResults(true);
                          }}
                          placeholder="Search apps..."
                          className="w-full max-w-lg px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {appName.trim().length > 0 && showResults && (
                          <div className="mt-2 max-h-44 overflow-auto border rounded w-full">
                            {filteredApps.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">No results</div>
                            )}
                            {filteredApps.map((a, i) => (
                              <button
                                key={a.name}
                                type="button"
                                onClick={() => handleSelectFromList(i)}
                                className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${
                                  selectedIndex === i ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                                }`}
                              >
                                {a.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={goNext}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={selectedIndex == null}
                      >
                        Next
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => resetSelection("define")}
                        className="px-4 py-2 rounded border text-sm font-medium bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      >
                        Define New
                      </button>
                      <button
                        type="button"
                        onClick={() => resetSelection("select")}
                        className="px-4 py-2 rounded border text-sm font-medium bg-blue-600 text-white border-blue-600"
                      >
                        Select from List
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Connection Details */}
          {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 w-full max-w-sm mx-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
                  <input
                    value={databaseType}
                    onChange={(e) => setDatabaseType(e.target.value)}
                    placeholder="Database Type"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Connection URL</label>
                  <input
                    value={connectionUrl}
                    onChange={(e) => setConnectionUrl(e.target.value)}
                    placeholder="Connection URL"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                  <input
                    value={driver}
                    onChange={(e) => setDriver(e.target.value)}
                    placeholder="Driver"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="px-5 py-2.5 text-white rounded bg-[#27B973] hover:bg-[#22a667]"
          >
            Run AI Assist
          </button>
          {aiOpen && (
            <div className="mt-4 w-full max-w-md bg-white border shadow rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="font-medium">AI Assist</div>
                <button
                  type="button"
                  onClick={() => setAiOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 text-sm text-gray-600">
                Chat experience will appear here. Hook up your AI chat later.
              </div>
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
}

