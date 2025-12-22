"use client";
import HorizontalTabs from "@/components/HorizontalTabs";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "@/lib/ag-grid-setup";
import { useAuth } from "@/contexts/AuthContext";
import { executeQuery } from "@/lib/api";
import { getCurrentUser, getReviewerId, apiRequestWithAuth } from "@/lib/auth";

// Charts
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { BackButton } from "@/components/BackButton";
import UserDisplayName from "@/components/UserDisplayName";

// Register Chart.js components and plugin
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

// Dynamically import AgGridReact and Bar with SSR disabled
const AgGridReact = dynamic(() => import("ag-grid-react").then((mod) => mod.AgGridReact), { ssr: false });
const Bar = dynamic(() => import("react-chartjs-2").then((mod) => mod.Bar), { ssr: false });

type UserDetails = {
  username: string;
  userId: string;
  userStatus: string;
  manager: string;
  department: string;
  jobTitle: string;
  userType: "Internal" | "External" | string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  startDate?: string;
};

export default function ProfilePage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: authUser, isAuthenticated } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    console.log("Profile: useEffect RUNNING - Component mounted or authUser changed");
    console.log("Profile: authUser value:", authUser);
    console.log("Profile: isAuthenticated:", isAuthenticated);
    console.log("Profile: isMounted:", isMounted);
    
    const fetchCurrentUserData = async () => {
      console.log("Profile: fetchCurrentUserData function called");
      
      // Check if user is authenticated before making API call
      if (!isAuthenticated) {
        console.log("Profile: User not authenticated, skipping API call");
        setIsLoading(false);
        setUser(null);
        return;
      }
      
      // Get current user identifier from auth context
      // Note: authUser.email actually contains the userid/username used for login
      // Also check the UID_TENANT cookie which has the userid
      const currentUserId = authUser?.email || getCurrentUser()?.email;
      const currentUserFromCookie = getCurrentUser();
      const reviewerId = getReviewerId(); // This is the userUniqueID from login
      
      // Also try to get userid from cookie directly
      let userIdFromCookie = null;
      try {
        const uidTenant = getCurrentUser();
        if (uidTenant && typeof uidTenant === 'object' && 'userid' in uidTenant) {
          userIdFromCookie = (uidTenant as any).userid;
        }
      } catch (e) {
        console.log("Profile: Could not parse userid from cookie");
      }
      
      // Use the most specific identifier available - prioritize userid from cookie
      const searchIdentifier = userIdFromCookie || currentUserId;
      
      console.log("Profile: useEffect triggered");
      console.log("Profile: authUser:", authUser);
      console.log("Profile: currentUserId (from authUser.email):", currentUserId);
      console.log("Profile: userIdFromCookie:", userIdFromCookie);
      console.log("Profile: reviewerId (userUniqueID):", reviewerId);
      console.log("Profile: searchIdentifier (will use for matching):", searchIdentifier);
      console.log("Profile: currentUserFromCookie:", currentUserFromCookie);
      
      // Make API call only if authenticated
      console.log("Profile: Starting API call...");

      try {
        setIsLoading(true);
        setError(null);
        
        // Use apiRequestWithAuth to ensure authentication headers are included
        const endpoint = "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery";
        const payload = {
          query: "SELECT * FROM usr",
          parameters: []
        };
        
        console.log("Profile: Making API call to:", endpoint);
        console.log("Profile: Payload:", JSON.stringify(payload));
        
        const responseData = await apiRequestWithAuth<any>(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        
        console.log("Profile: API response received:", responseData);
        
        // Transform API response using the same logic as Users component
        let userData: any = null;
        
        if (responseData && typeof responseData === 'object' && 'resultSet' in responseData && Array.isArray((responseData as any).resultSet)) {
          const sourceArray: any[] = (responseData as any).resultSet;
          console.log("Profile: Found", sourceArray.length, "users in resultSet");
          // Find the current logged-in user from the result set
          // Try multiple matching strategies to find the correct user
          if (searchIdentifier) {
            console.log("Profile: Searching for user with identifier:", searchIdentifier);
            console.log("Profile: Total users in response:", sourceArray.length);
            
            // First, log all users to see what we're working with
            console.log("Profile: All users in database:");
            sourceArray.forEach((u, idx) => {
              const displayName = u.displayname || u.displayName || `${u.firstname || ""} ${u.lastname || ""}`.trim();
              console.log(`Profile: User ${idx}:`, {
                username: u.username,
                email: u.email?.work || u.email,
                displayname: displayName,
                firstname: u.firstname,
                lastname: u.lastname
              });
            });
            
            // Try multiple matching strategies, prioritizing exact matches
            // Strategy 1: Exact username match (highest priority) - this is what login uses
            const searchIdLower = searchIdentifier.toLowerCase().trim();
            console.log("Profile: ========================================");
            console.log("Profile: SEARCHING FOR USER");
            console.log("Profile: Search identifier:", searchIdentifier);
            console.log("Profile: Search ID (lowercase):", searchIdLower);
            console.log("Profile: Reviewer ID:", reviewerId);
            console.log("Profile: ========================================");
            
            // First, find ALL potential matches to see what we're working with
            const allPotentialMatches = sourceArray.filter((u: any) => {
              const dbUsername = (u.username || "").toLowerCase().trim();
              const dbEmail = (u.email?.work || 
                (typeof u.email === 'string' ? u.email : '') ||
                u.customattributes?.emails?.[0]?.value || "").toLowerCase().trim();
              const dbFirstName = (u.firstname || "").toLowerCase().trim();
              const dbDisplayName = (u.displayname || u.displayName || "").toLowerCase().trim();
              const dbFullName = `${u.firstname || ""} ${u.lastname || ""}`.toLowerCase().trim();
              
              return dbUsername === searchIdLower ||
                     dbEmail === searchIdLower ||
                     dbFirstName === searchIdLower ||
                     dbDisplayName === searchIdLower ||
                     dbFullName === searchIdLower ||
                     (reviewerId && (u.userid || u.id || u.userUniqueID || "").toLowerCase().trim() === reviewerId.toLowerCase().trim());
            });
            
            if (allPotentialMatches.length > 0) {
              console.log(`Profile: Found ${allPotentialMatches.length} potential match(es):`);
              allPotentialMatches.forEach((u, idx) => {
                console.log(`Profile: Potential Match ${idx + 1}:`, {
                  username: u.username,
                  email: u.email?.work || u.email,
                  firstname: u.firstname,
                  lastname: u.lastname,
                  displayname: u.displayname || u.displayName,
                  userid: u.userid || u.id
                });
              });
            }
            
            // Now try exact matches in priority order
            userData = sourceArray.find((u: any) => {
              const dbUsername = (u.username || "").toLowerCase().trim();
              const matches = dbUsername === searchIdLower;
              if (matches) {
                console.log("Profile: ✓ EXACT username match found!");
                console.log("Profile: - DB username:", u.username);
                console.log("Profile: - DB displayname:", u.displayname || u.displayName);
                console.log("Profile: - DB firstname:", u.firstname);
                console.log("Profile: - DB lastname:", u.lastname);
              }
              return matches;
            });
            
            if (userData) {
              console.log("Profile: ✓✓✓ CONFIRMED: Found user by EXACT username match");
              console.log("Profile: Selected user:", {
                username: userData.username,
                displayname: userData.displayname || userData.displayName,
                firstname: userData.firstname,
                lastname: userData.lastname
              });
            } else {
              console.log("Profile: No exact username match, trying email...");
              // Strategy 2: Exact email match
              userData = sourceArray.find((u: any) => {
                const dbEmail = (u.email?.work || 
                  (typeof u.email === 'string' ? u.email : '') ||
                  u.customattributes?.emails?.[0]?.value || "").toLowerCase().trim();
                const matches = dbEmail === searchIdLower;
                if (matches) {
                  console.log("Profile: ✓ EXACT email match found!");
                  console.log("Profile: - DB email:", dbEmail);
                  console.log("Profile: - DB username:", u.username);
                  console.log("Profile: - DB displayname:", u.displayname || u.displayName);
                }
                return matches;
              });
              
              if (userData) {
                console.log("Profile: ✓✓✓ CONFIRMED: Found user by EXACT email match");
              } else {
                console.log("Profile: No exact email match, trying userid/userUniqueID...");
                // Strategy 3: Match by userid/userUniqueID if available
                if (reviewerId) {
                  const reviewerIdLower = reviewerId.toLowerCase().trim();
                  userData = sourceArray.find((u: any) => {
                    const dbUserId = (u.userid || u.id || u.userUniqueID || "").toLowerCase().trim();
                    const matches = dbUserId === reviewerIdLower;
                    if (matches) {
                      console.log("Profile: ✓ EXACT userid match found!");
                      console.log("Profile: - DB userid:", dbUserId);
                      console.log("Profile: - DB username:", u.username);
                    }
                    return matches;
                  });
                  
                  if (userData) {
                    console.log("Profile: ✓✓✓ CONFIRMED: Found user by userid/userUniqueID match");
                  }
                }
                
                // Strategy 4: Exact display name match (only if no exact match found)
                if (!userData) {
                  console.log("Profile: No userid match, trying display name...");
                  userData = sourceArray.find((u: any) => {
                    const dbDisplayName = (u.displayname || u.displayName || "").toLowerCase().trim();
                    const matches = dbDisplayName === searchIdLower;
                    if (matches) {
                      console.log("Profile: ✓ EXACT display name match found!");
                    }
                    return matches;
                  });
                  
                  if (userData) {
                    console.log("Profile: ✓✓✓ CONFIRMED: Found user by EXACT display name match");
                  }
                }
                
                // Strategy 5: Exact full name match (only if no exact match found)
                if (!userData) {
                  console.log("Profile: No display name match, trying full name...");
                  userData = sourceArray.find((u: any) => {
                    const dbFullName = `${u.firstname || ""} ${u.lastname || ""}`.toLowerCase().trim();
                    const matches = dbFullName === searchIdLower;
                    if (matches) {
                      console.log("Profile: ✓ EXACT full name match found!");
                    }
                    return matches;
                  });
                  
                  if (userData) {
                    console.log("Profile: ✓✓✓ CONFIRMED: Found user by EXACT full name match");
                  }
                }
                
                // Strategy 6: Match by first name only (for cases like "Harish" login)
                if (!userData) {
                  console.log("Profile: No full name match, trying first name only...");
                  userData = sourceArray.find((u: any) => {
                    const dbFirstName = (u.firstname || "").toLowerCase().trim();
                    const matches = dbFirstName === searchIdLower;
                    if (matches) {
                      console.log("Profile: ✓ EXACT first name match found!");
                      console.log("Profile: - DB firstname:", u.firstname);
                      console.log("Profile: - DB username:", u.username);
                    }
                    return matches;
                  });
                  
                  if (userData) {
                    console.log("Profile: ✓✓✓ CONFIRMED: Found user by EXACT first name match");
                  }
                }
              }
            }
            
            // Final verification - log what we found
            if (userData) {
              console.log("Profile: ========================================");
              console.log("Profile: FINAL SELECTED USER:");
              console.log("Profile: - Username:", userData.username);
              console.log("Profile: - Display Name:", userData.displayname || userData.displayName);
              console.log("Profile: - First Name:", userData.firstname);
              console.log("Profile: - Last Name:", userData.lastname);
              console.log("Profile: - Email:", userData.email?.work || userData.email);
              console.log("Profile: ========================================");
            }
            
            // If still no match, log all users for debugging
            if (!userData) {
              console.error("Profile: ❌ No exact match found for:", searchIdentifier);
              console.log("Profile: Attempted matches:");
              console.log("Profile: - Username:", searchIdentifier);
              console.log("Profile: - Email:", searchIdentifier);
              if (reviewerId) console.log("Profile: - UserID:", reviewerId);
              console.log("Profile: Showing all users in database for comparison:");
              sourceArray.forEach((u, idx) => {
                const displayName = u.displayname || u.displayName || `${u.firstname || ""} ${u.lastname || ""}`.trim();
                const dbUsername = (u.username || "").toLowerCase();
                const dbEmail = (u.email?.work || (typeof u.email === 'string' ? u.email : '') || "").toLowerCase();
                const matchesSearch = dbUsername === searchIdLower || dbEmail === searchIdLower;
                console.log(`Profile: User ${idx}${matchesSearch ? ' ⭐ POTENTIAL MATCH' : ''}:`, {
                  username: u.username,
                  username_lower: dbUsername,
                  email: u.email?.work || u.email,
                  email_lower: dbEmail,
                  displayname: displayName,
                  firstname: u.firstname,
                  lastname: u.lastname,
                  userid: u.userid || u.id
                });
              });
            } else {
              // Verify the match is correct by checking if username/email actually matches
              const matchedUsername = (userData.username || "").toLowerCase().trim();
              const matchedEmail = (userData.email?.work || 
                (typeof userData.email === 'string' ? userData.email : '') ||
                userData.customattributes?.emails?.[0]?.value || "").toLowerCase().trim();
              
              const usernameMatches = matchedUsername === searchIdLower;
              const emailMatches = matchedEmail === searchIdLower;
              
              if (!usernameMatches && !emailMatches) {
                console.error("Profile: ⚠️ WARNING: Selected user doesn't match search identifier!");
                console.error("Profile: Search ID:", searchIdLower);
                console.error("Profile: Matched username:", matchedUsername);
                console.error("Profile: Matched email:", matchedEmail);
                console.error("Profile: This might be the wrong user! Clearing selection.");
                userData = null; // Don't use this user if it doesn't match
              }
            }
          } else {
            // If no identifier, just use the first user for now
            console.log("Profile: No user identifier to match, using first user");
            userData = sourceArray[0];
          }
        } else if (responseData && Array.isArray(responseData)) {
          // Handle case where response is directly an array
          console.log("Profile: Response is direct array with", responseData.length, "users");
          if (searchIdentifier) {
            userData = responseData.find((u: any) => {
              const dbUsername = (u.username || "").toLowerCase().trim();
              const dbEmail = (u.email?.work || 
                (typeof u.email === 'string' ? u.email : '') ||
                u.customattributes?.emails?.[0]?.value || "").toLowerCase().trim();
              const dbDisplayName = (u.displayname || u.displayName || "").toLowerCase().trim();
              const dbFullName = `${u.firstname || ""} ${u.lastname || ""}`.toLowerCase().trim();
              const searchId = searchIdentifier.toLowerCase().trim();
              return dbUsername === searchId || dbEmail === searchId || 
                     dbDisplayName === searchId || dbFullName === searchId ||
                     dbDisplayName.includes(searchId) || searchId.includes(dbDisplayName);
            });
          } else {
            userData = responseData[0];
          }
        } else {
          console.log("Profile: Unexpected response format:", responseData);
        }
        
        console.log("Profile: Found user data:", userData);
        
        if (userData) {
          // Use the same transformation logic as Users component
          const displayName = userData.displayname || userData.displayName || 
            `${userData.firstname ?? ""} ${userData.lastname ?? ""}`.trim() || 
            userData.username || "Unknown User";
          const email = userData.email?.work || 
            (typeof userData.email === 'string' ? userData.email : '') ||
            userData.customattributes?.emails?.[0]?.value || 
            userData.username || 
            searchIdentifier || "unknown@example.com";
          const firstName = userData.firstname || userData.customattributes?.name?.givenName || "";
          const lastName = userData.lastname || userData.customattributes?.name?.familyName || "";
          const phone = userData.phonenumber?.work || userData.customattributes?.phoneNumbers?.[0]?.value || "";
          const startDate = userData.startdate || userData.customattributes?.["urn:ietf:params:scim:schemas:extension:custom"]?.startdate || "";
          
          setUser({
            username: displayName,
            userId: userData.userid || userData.id || userData.username || userData.customattributes?.id || "N/A",
            userStatus: userData.status || (userData.customattributes?.active ? "Active" : "Inactive"),
            manager: userData.managername || userData.customattributes?.enterpriseUser?.manager?.value || "N/A",
            department: userData.department || userData.customattributes?.enterpriseUser?.department || "N/A",
            jobTitle: userData.title || userData.customattributes?.title || "N/A",
            userType: userData.employeetype || userData.customattributes?.userType || "Internal",
            email: email,
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            startDate: startDate,
          });
        } else {
          console.log("Profile: User not found in response, using fallback");
          console.log("Profile: Available users count:", sourceArray?.length || 0);
          // Fallback: create user object from auth context or use placeholder
          const fallbackId = searchIdentifier || "unknown@example.com";
          setUser({
            username: fallbackId,
            userId: fallbackId,
            userStatus: "Active",
            manager: "N/A",
            department: "N/A",
            jobTitle: "N/A",
            userType: "Internal",
            email: fallbackId,
          });
        }
      } catch (error) {
        console.error("Profile: Error fetching user data:", error);
        console.error("Profile: Error details:", error);
        
        // Handle "No JWT token available" error gracefully (user logged out)
        if (error instanceof Error && error.message.includes("No JWT token available")) {
          console.log("Profile: No JWT token - user likely logged out");
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        setError(error instanceof Error ? error.message : "Failed to fetch user data");
        // Fallback: create user object from auth context only if we have an identifier
        if (searchIdentifier) {
          setUser({
            username: searchIdentifier,
            userId: searchIdentifier,
            userStatus: "Active",
            manager: "N/A",
            department: "N/A",
            jobTitle: "N/A",
            userType: "Internal",
            email: searchIdentifier,
          });
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
        console.log("Profile: fetchCurrentUserData completed");
      }
    };

    // Only call the function if authenticated
    if (isAuthenticated) {
      fetchCurrentUserData();
    } else {
      setIsLoading(false);
      setUser(null);
    }
  }, [authUser, isAuthenticated, isMounted]);

  const ProfileTab = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      );
    }

    const displayName = user?.username || "Unknown User";
    // Use actual firstName and lastName from database, fallback to splitting displayName
    const firstName = user?.firstName || displayName.split(" ")[0] || "Unknown";
    const lastName = user?.lastName || displayName.split(" ").slice(1).join(" ") || "";
    const initials = `${firstName?.[0] || "U"}${lastName?.[0] || ""}`.toUpperCase();
    
    // More vibrant and colorful gradient colors
    const gradients = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Purple gradient
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", // Pink-red gradient
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", // Blue gradient
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", // Green-teal gradient
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", // Pink-yellow gradient
      "linear-gradient(135deg, #30cfd0 0%, #330867 100%)", // Teal-purple gradient
      "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", // Light gradient
      "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", // Soft pink gradient
      "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", // Orange gradient
      "linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)", // Red-blue gradient
    ];
    const bgSource = user?.email || user?.userId || displayName;
    const gradientStyle = gradients[(bgSource || "").length % gradients.length];

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
          {/* Profile Picture - Left Side */}
          <div className="flex-shrink-0 flex justify-center relative">
            {/* Decorative ring behind */}
            <div 
              className="absolute w-48 h-48 rounded-lg opacity-20 blur-xl"
              style={{ background: gradientStyle }}
            />
            {/* Main profile picture */}
            <div className="relative">
              <div
                className="w-40 h-40 rounded-xl flex items-center justify-center text-white text-4xl font-bold shadow-2xl transition-all hover:scale-110 hover:rotate-2 hover:shadow-3xl"
                style={{ 
                  background: gradientStyle,
                  boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.3), 
                              0 10px 20px -5px rgba(0, 0, 0, 0.2),
                              inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Shine effect overlay */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)'
                  }}
                />
                {/* Initials with text shadow */}
                <span 
                  className="relative z-10"
                  style={{
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.2)'
                  }}
          >
            {initials}
                </span>
              </div>
              {/* Corner accent */}
              <div 
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full opacity-80"
                style={{ background: gradientStyle, filter: 'blur(4px)' }}
              />
            </div>
          </div>
          
          {/* User Details - Three Columns */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
            {/* Column 1 */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">First Name</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{firstName || "Unknown"}</p>
        </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Alias</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{user?.userId || "N/A"}</p>
          </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Start Date</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{user?.startDate || "N/A"}</p>
          </div>
            
            {/* Column 2 */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Last Name</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{lastName || ""}</p>
          </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Phone Number</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{user?.phone || "N/A"}</p>
          </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">User Type</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{user?.userType || "Internal"}</p>
          </div>
            
            {/* Column 3 */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</label>
              <p className="text-sm font-semibold text-blue-600 mt-1 hover:text-blue-700 transition-colors cursor-pointer">{user?.email || "no-email@example.com"}</p>
          </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Title</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{user?.jobTitle || "N/A"}</p>
          </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Manager Email</label>
              <p className="text-sm font-semibold text-blue-600 mt-1 hover:text-blue-700 transition-colors cursor-pointer">{user?.manager || "N/A"}</p>
          </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Display Name</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{displayName}</p>
          </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Department</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{user?.department || "N/A"}</p>
          </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tags</label>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full border border-blue-200">
                  {user?.userType || "User"}
                </span>
          </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AccessTab = () => {
    // Sample access data and accounts (same structure as user detail page)
    const accessData = { accounts: 20, apps: 10, entitlements: 60, violations: 5 };
    const rowData = [
      {
        accountId: "ACC001",
        accountStatus: "Active",
        risk: "Low",
        appName: "CRM App",
        discoveryDate: "2023-06-01",
        lastSyncDate: "2025-08-20",
        lastAccessReview: "2025-07-15",
        insights: "High usage",
        mfa: "Enabled",
        complianceViolation: "None",
        entitlements: [
          { entName: "CRM_READ", risk: "Low", description: "Read-only access to CRM", assignedOn: "2023-06-01", lastReviewed: "2025-07-15", tags: ["Read", "CRM"] },
          { entName: "CRM_WRITE", risk: "Medium", description: "Write access to CRM", assignedOn: "2023-06-01", lastReviewed: "2025-07-15", tags: ["Write", "CRM"] },
        ],
      },
      {
        accountId: "ACC002",
        accountStatus: "Suspended",
        risk: "High",
        appName: "HR Portal",
        discoveryDate: "2023-05-10",
        lastSyncDate: "2025-08-18",
        lastAccessReview: "2025-06-30",
        insights: "Inactive account",
        mfa: "Disabled",
        complianceViolation: "SoD Violation",
        entitlements: [
          { entName: "HR_ADMIN", risk: "High", description: "Admin access to HR Portal", assignedOn: "2023-05-10", lastReviewed: "2025-06-30", tags: ["Admin", "HR"] },
        ],
      },
    ];

    const accountColumnDefs = useMemo(
      () => [
        {
          headerName: "Account ID",
          field: "accountId",
          flex: 1.5,
          cellRenderer: (params: any) => (
            <span>
              {params.value} ({params.data.accountStatus}, {params.data.risk})
            </span>
          ),
        },
        { headerName: "App Name", field: "appName", flex: 1.5 },
        { headerName: "Discovery Date", field: "discoveryDate", flex: 1, valueFormatter: (p:any)=> require("@/utils/utils").formatDateMMDDYY(p.value) },
        { headerName: "Last Sync Date", field: "lastSyncDate", flex: 1, valueFormatter: (p:any)=> require("@/utils/utils").formatDateMMDDYY(p.value) },
        { headerName: "Last Access Review", field: "lastAccessReview", flex: 1 },
        { headerName: "Insights", field: "insights", flex: 1.5 },
        {
          headerName: "MFA",
          field: "mfa",
          flex: 1,
          cellRenderer: (params: any) => (
            <span className={params.value === "Enabled" ? "text-green-600" : "text-red-600"}>
              {params.value}
            </span>
          ),
        },
        {
          headerName: "Compliance Violation",
          field: "complianceViolation",
          flex: 1.5,
          cellRenderer: (params: any) => (
            <span className={params.value === "None" ? "text-green-600" : "text-red-600"}>
              {params.value}
            </span>
          ),
        },
      ],
      []
    );

    const entitlementColumnDefs = useMemo(
      () => [
        { headerName: "Entitlement Name", field: "entName", flex: 1.5 },
        { headerName: "Risk", field: "risk", flex: 1 },
        { headerName: "Description", field: "description", flex: 2 },
        { headerName: "Assigned On", field: "assignedOn", flex: 1 },
        { headerName: "Last Reviewed", field: "lastReviewed", flex: 1 },
        {
          headerName: "Tags",
          field: "tags",
          flex: 1.5,
          cellRenderer: (params: any) => (
            <div className="flex flex-wrap gap-1">
              {params.value?.map((tag: string, index: number) => (
                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          ),
        },
      ],
      []
    );

    const chartData: ChartData<"bar"> = {
      labels: ["Accounts", "Apps", "Entitlements", "Violations"],
      datasets: [
        {
          label: "Access Metrics",
          data: [accessData.accounts, accessData.apps, accessData.entitlements, accessData.violations],
          backgroundColor: ["#4CAF50", "#2196F3", "#FF9800", "#F44336"],
          borderColor: ["#388E3C", "#1976D2", "#F57C00", "#D32F2F"],
          borderWidth: 1,
        },
      ],
    };

    const chartOptions = {
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Count" } },
        x: { title: { display: true, text: "Categories" } },
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: "#fff",
          font: { weight: "bold" as const, size: 14 },
          formatter: (value: number) => value,
          anchor: "center" as const,
          align: "center" as const,
        },
        title: { display: true, text: "Access Metrics", font: { size: 18 } },
      },
      maintainAspectRatio: false,
    } as const;

    return (
      <div className="p-6 bg-gray-50 ">
        {isMounted && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6 w-120">
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}
        {isMounted && (
          <div className="ag-theme-alpine" style={{ height: 400, width: "100%" }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={accountColumnDefs}
              masterDetail={true}
              detailCellRendererParams={{
                detailGridOptions: {
                  columnDefs: entitlementColumnDefs,
                  defaultColDef: { flex: 1 },
                },
                getDetailRowData: (params: any) => {
                  params.successCallback(params.data.entitlements);
                },
              }}
              detailRowHeight={200}
              defaultColDef={{ sortable: true, filter: true }}
            />
          </div>
        )}
      </div>
    );
  };

  const tabsData = [
    { label: "Profile", icon: ChevronDown, iconOff: ChevronRight, component: ProfileTab },
    { label: "Access", icon: ChevronDown, iconOff: ChevronRight, component: AccessTab },
  ];

  return (
    <>
      <div className="mb-4">
        <BackButton />
      </div>
      <HorizontalTabs tabs={tabsData} activeIndex={tabIndex} onChange={setTabIndex} />
    </>
  );
}


