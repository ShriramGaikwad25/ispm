"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutPanelLeft, 
  ListTodo, 
  ClipboardList, 
  Shield, 
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import DonutChart from "@/components/DonutChart";
import HorizontalBarChart from "@/components/HorizontalBarChart";
import { getReviewerId } from "@/lib/auth";
import { getCertifications, getCertAnalytics, executeQuery } from "@/lib/api";
import "./dashboard.css";

interface ChartAnalyticsData {
  totalAccess: number;
  lowRisk: number;
  roles: number;
  users: number;
  sodViolations: number;
  inactiveAccounts: number;
  totalEntitlements: number;
  newAccess: number;
  directAssignment: number;
  groupAssignment: number;
  highRisk: number;
}

interface DashboardStats {
  totalApplications: number;
  activeReviews: number;
  pendingRequests: number;
  totalUsers: number;
  highRiskItems: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    activeReviews: 0,
    pendingRequests: 0,
    totalUsers: 0,
    highRiskItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartAnalyticsData>({
    totalAccess: 0,
    lowRisk: 0,
    roles: 0,
    users: 0,
    sodViolations: 0,
    inactiveAccounts: 0,
    totalEntitlements: 0,
    newAccess: 0,
    directAssignment: 0,
    groupAssignment: 0,
    highRisk: 0,
  });

  useEffect(() => {
    // Fetch dashboard statistics
    const fetchStats = async () => {
      const reviewerId = getReviewerId();
      if (!reviewerId) {
        console.error("No reviewerId found");
        setLoading(false);
        return;
      }

      try {
        // Fetch all data in parallel for better performance
        const [appsResponse, certificationsData, analyticsData, usersCountResponse] = await Promise.all([
          // Fetch applications count
          fetch(
            `https://preview.keyforge.ai/entities/api/v1/ACMECOM/getApplications/${reviewerId}?page=1&page_size=1`
          ).then(res => res.ok ? res.json() : null).catch(() => null),
          
          // Fetch certifications to get active reviews count (fetch first 50 to get a good sample)
          getCertifications(reviewerId, 50, 1).catch(() => null),
          
          // Fetch analytics for high risk items and other metrics
          getCertAnalytics(reviewerId).catch(() => null),
          
          // Fetch total users count
          executeQuery<{ resultSet?: Array<{ count?: number; [key: string]: any }> }>(
            "SELECT COUNT(*) as count FROM usr",
            []
          ).catch(() => null),
        ]);

        // Process applications data
        if (appsResponse && appsResponse.executionStatus === "success") {
          setStats((prev) => ({
            ...prev,
            totalApplications: appsResponse.total_items || 0,
          }));
        }

        // Process certifications data
        if (certificationsData && certificationsData.certifications) {
          const certs = certificationsData.certifications;
          // Count active reviews (certifications with status "Open" or "In Progress")
          const activeReviewsCount = certs.items?.filter((item: any) => {
            const status = item.status?.toLowerCase() || "";
            return status === "open" || status === "in progress" || status === "pending";
          }).length || 0;

          setStats((prev) => ({
            ...prev,
            activeReviews: activeReviewsCount,
          }));
        }

        // Process analytics data for high risk items and chart data
        if (analyticsData && analyticsData.analytics) {
          let totalHighRisk = 0;
          let totalHighRiskEntitlements = 0;
          let totalHighRiskAccounts = 0;
          let totalViolations = 0;
          let totalDormant = 0;
          let totalInactiveAccounts = 0;
          let totalNewAccess = 0;
          let totalNewAccounts = 0;
          let totalOrphan = 0;
          let totalInactiveUsers = 0;

          // Sum up analytics from all certifications
          Object.values(analyticsData.analytics).forEach((analytics: any) => {
            const highRiskEntitlements = Number(analytics.highriskentitlement_count) || 0;
            const highRiskAccounts = Number(analytics.highriskaccount_count) || 0;
            const violations = Number(analytics.violations_count) || 0;
            const dormant = Number(analytics.dormant_count) || 0;
            const inactiveAccounts = Number(analytics.inactiveaccount_count) || 0;
            const newAccess = Number(analytics.newaccess_count) || 0;
            const newAccounts = Number(analytics.newaccount_count) || 0;
            const orphan = Number(analytics.orphan_count) || 0;
            const inactiveUsers = Number(analytics.inactiveuser_count) || 0;

            totalHighRiskEntitlements += highRiskEntitlements;
            totalHighRiskAccounts += highRiskAccounts;
            totalHighRisk += highRiskEntitlements + highRiskAccounts;
            totalViolations += violations;
            totalDormant += dormant;
            totalInactiveAccounts += inactiveAccounts;
            totalNewAccess += newAccess;
            totalNewAccounts += newAccounts;
            totalOrphan += orphan;
            totalInactiveUsers += inactiveUsers;
          });

          setStats((prev) => ({
            ...prev,
            highRiskItems: totalHighRisk,
          }));

          // Calculate chart data from analytics
          // For Access Distribution (Donut Chart)
          const totalAccess = totalNewAccess + totalHighRiskEntitlements; // Active access items
          const lowRisk = totalAccess - totalHighRisk; // Low risk = total - high risk
          const roles = 0; // Roles data not available in analytics, keeping at 0
          const sodViolations = totalViolations;
          const inactiveAccounts = totalInactiveAccounts;

          // For Entitlements Overview (Horizontal Bar Chart)
          const totalEntitlements = totalHighRiskEntitlements + lowRisk; // Total entitlements
          const directAssignment = Math.round(totalEntitlements * 0.6); // Estimate 60% direct
          const groupAssignment = Math.round(totalEntitlements * 0.4); // Estimate 40% group
          const chartLowRisk = lowRisk;
          const chartHighRisk = totalHighRiskEntitlements;

          setChartData({
            totalAccess,
            lowRisk: Math.max(0, lowRisk),
            roles,
            users: stats.totalUsers, // Use total users from API
            sodViolations,
            inactiveAccounts,
            totalEntitlements,
            newAccess: totalNewAccess,
            directAssignment,
            groupAssignment,
            highRisk: chartHighRisk,
          });
        } else {
          // If analytics data is not available, set to 0
          setStats((prev) => ({
            ...prev,
            highRiskItems: 0,
          }));
          setChartData({
            totalAccess: 0,
            lowRisk: 0,
            roles: 0,
            users: 0,
            sodViolations: 0,
            inactiveAccounts: 0,
            totalEntitlements: 0,
            newAccess: 0,
            directAssignment: 0,
            groupAssignment: 0,
            highRisk: 0,
          });
        }

        // Process users count data
        if (usersCountResponse && usersCountResponse.resultSet && Array.isArray(usersCountResponse.resultSet)) {
          const countResult = usersCountResponse.resultSet[0];
          const totalUsers = countResult?.count || countResult?.COUNT || usersCountResponse.resultSet.length || 0;
          
          setStats((prev) => ({
            ...prev,
            totalUsers: typeof totalUsers === 'number' ? totalUsers : 0,
          }));
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Applications",
      value: loading ? "..." : (stats.totalApplications || 0),
      icon: LayoutPanelLeft,
      color: "bg-blue-500",
      link: "/applications",
      description: "Integrated applications",
    },
    {
      title: "Active Reviews",
      value: loading ? "..." : (stats.activeReviews || 0),
      icon: ListTodo,
      color: "bg-green-500",
      link: "/access-review",
      description: "Ongoing access reviews",
    },
    {
      title: "Pending Requests",
      value: loading ? "..." : (stats.pendingRequests || 0),
      icon: ClipboardList,
      color: "bg-orange-500",
      link: "/access-request",
      description: "Awaiting approval",
    },
    {
      title: "Total Users",
      value: loading ? "..." : (stats.totalUsers || 0),
      icon: Users,
      color: "bg-indigo-500",
      link: "/user",
      description: "Managed users",
    },
    {
      title: "High Risk Items",
      value: loading ? "..." : (stats.highRiskItems || 0),
      icon: AlertCircle,
      color: "bg-red-500",
      link: "/reports",
      description: "Requires attention",
    },
  ];

  const quickActions = [
    {
      title: "Start Access Review",
      description: "Create a new access review campaign",
      icon: ListTodo,
      link: "/access-review",
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    },
    {
      title: "Request Access",
      description: "Submit a new access request",
      icon: ClipboardList,
      link: "/access-request",
      color: "bg-green-50 hover:bg-green-100 border-green-200",
    },
    {
      title: "View Reports",
      description: "Access compliance and audit reports",
      icon: Shield,
      link: "/reports",
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    },
    {
      title: "Manage Applications",
      description: "View and manage integrated applications",
      icon: LayoutPanelLeft,
      link: "/applications",
      color: "bg-orange-50 hover:bg-orange-100 border-orange-200",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        </div>

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Link
                key={index}
                href={card.link}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.description}</p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-600 group-hover:text-blue-700">
                  <span>View details</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Donut Chart Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Access Distribution</h2>
            <DonutChart 
              analyticsData={{
                totalAccess: chartData.totalAccess,
                lowRisk: chartData.lowRisk,
                roles: chartData.roles,
                users: chartData.users,
                sodViolations: chartData.sodViolations,
                inactiveAccounts: chartData.inactiveAccounts,
              }}
            />
          </div>

          {/* Horizontal Bar Chart Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Entitlements Overview</h2>
            <HorizontalBarChart 
              analyticsData={{
                totalEntitlements: chartData.totalEntitlements,
                newAccess: chartData.newAccess,
                directAssignment: chartData.directAssignment,
                groupAssignment: chartData.groupAssignment,
                lowRisk: chartData.lowRisk,
                highRisk: chartData.highRisk,
              }}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    href={action.link}
                    className={`${action.color} border rounded-lg p-4 hover:shadow-md transition-all duration-200 group`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          <Icon className="h-5 w-5 text-gray-700" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity / Alerts Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity & Alerts</h2>
            <Link href="/reports" className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-4">
            {stats.highRiskItems > 0 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{stats.highRiskItems} High Risk {stats.highRiskItems === 1 ? 'Item' : 'Items'} Detected</p>
                  <p className="text-xs text-gray-600 mt-1">Review and remediate high-risk access immediately</p>
                </div>
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
            )}
            {stats.activeReviews > 0 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <ListTodo className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{stats.activeReviews} Active {stats.activeReviews === 1 ? 'Review' : 'Reviews'}</p>
                  <p className="text-xs text-gray-600 mt-1">You have {stats.activeReviews} ongoing access review{stats.activeReviews === 1 ? '' : 's'} that need attention</p>
                </div>
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
            )}
            {stats.highRiskItems === 0 && stats.activeReviews === 0 && !loading && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">No Active Alerts</p>
                  <p className="text-xs text-gray-600 mt-1">All systems are operating normally</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
