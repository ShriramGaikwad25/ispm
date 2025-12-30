import { FormData } from "@/types/stepTypes";

/**
 * Transforms form data from the wizard form into the API payload structure
 */
export function transformFormDataToPayload(formData: FormData): any {
  const step1 = formData.step1 || {};
  const step2 = formData.step2 || {};
  const step3 = formData.step3 || {};
  const step4 = formData.step4 || {};

  // Helper function to build filter criteria from expression array
  const buildFilterCriteria = (expressions: any[]) => {
    if (!expressions || expressions.length === 0) {
      return undefined;
    }

    if (expressions.length === 1) {
      const exp = expressions[0];
      return {
        attribute: exp.attribute?.value || exp.attribute,
        operator: exp.operator?.value || exp.operator,
        value: exp.value,
      };
    }

    // For multiple expressions, build a tree structure
    return {
      condition: "AND", // Default to AND, could be made configurable
      children: expressions.map((exp) => ({
        attribute: exp.attribute?.value || exp.attribute,
        operator: exp.operator?.value || exp.operator,
        value: exp.value,
      })),
    };
  };

  // Build reviewers array from stages
  const reviewers: any[] = [];
  if (step3.stages && step3.stages.length > 0) {
    step3.stages.forEach((stage) => {
      const reviewerType = stage.reviewer;
      
      // Map form reviewer types to API reviewer types
      let mappedReviewerType = reviewerType;
      if (reviewerType === "Manager") mappedReviewerType = "Manager";
      else if (reviewerType === "User") mappedReviewerType = "User";
      else if (reviewerType === "Entitlement Owner") mappedReviewerType = "Entitlement Owner";
      else if (reviewerType === "Application Owner") mappedReviewerType = "Application Owner";
      else if (reviewerType === "Role Owner") mappedReviewerType = "Role Owner";
      else if (reviewerType === "custom-reviewer") {
        // Handle custom certifier
        if (stage.genericExpression && stage.genericExpression.length > 0) {
          // This is a CustomCertifiers type
          const customCertifiers: any[] = [];
          
          // Group expressions by entity type if possible, or create entries
          // For now, create a simple structure
          stage.genericExpression.forEach((exp: any) => {
            // This is a simplified mapping - you may need to adjust based on actual form structure
            customCertifiers.push({
              entitytype: "User", // Default, should be determined from form
              entityList: [], // Should be populated from form data
              reviewerId: exp.value || "", // Use value as reviewerId
            });
          });

          reviewers.push({
            reviewerType: "CustomCertifiers",
            customCertifiers: customCertifiers,
            description: `Custom certifiers for stage`,
          });
        } else {
          // Static or Dynamic certifier
          reviewers.push({
            reviewerType: "Certifier",
            certifier: {
              type: "Static", // Default, could be dynamic based on form
              reviewerId: stage.customReviewerlist?.name || "",
            },
            description: `Certifier for stage`,
          });
        }
      } else {
        // Standard reviewer types
        reviewers.push({
          reviewerType: mappedReviewerType,
          description: `${mappedReviewerType} will review the access`,
        });
      }
    });
  } else {
    // Default reviewer if no stages
    reviewers.push({
      reviewerType: "Manager",
      description: "User's manager will review the access",
    });
  }

  // Build userCriteria
  const userCriteria: any = {
    criteria: "allUsers", // Default
  };

  if (step2.userType === "All users") {
    userCriteria.criteria = "allUsers";
  } else if (step2.userType === "Specific users") {
    userCriteria.criteria = "filter";
    userCriteria.filtercriteria = buildFilterCriteria(step2.specificUserExpression || []);
  } else if (step2.userType === "Custom User Group") {
    userCriteria.criteria = "specificUsers";
    // Extract user IDs from group list or file
    userCriteria.selectedUsers = step2.userGroupList 
      ? step2.userGroupList.split(",").map((u: string) => u.trim())
      : [];
  }

  if (step2.excludeUsersIsChecked && step2.excludeUsers) {
    userCriteria.excludeUsersFromCampaign = step2.excludeUsers
      .split(",")
      .map((u: string) => u.trim());
  }

  // Build scopingCriteria
  const scopingCriteria: any = {
    criteria: "allApplications", // Default
  };

  if (step2.selectData === "All Applications") {
    scopingCriteria.criteria = "allApplications";
  } else if (step2.selectData === "Specific Applications") {
    scopingCriteria.criteria = "selectedApplications";
    scopingCriteria.selectedApplications = (step2.specificApps || []).map((app: any) => 
      typeof app === "string" ? app : app.value || app.label || app
    );
  }

  // Build app-specific filters
  if (step2.specificApps && step2.specificApps.length > 0) {
    scopingCriteria.appSpecificFilter = step2.specificApps.map((app: any) => {
      const appName = typeof app === "string" ? app : app.value || app.label || app;
      return {
        appName: appName,
        criteria: "allAccounts", // Default
        filtercriteria: buildFilterCriteria(step2.expressionApps || []),
        createdAfter: "",
      };
    });
  }

  // Build entitlement filters
  if (step2.expressionEntitlement && step2.expressionEntitlement.length > 0) {
    scopingCriteria.commonFilterForEntitlements = {
      criteria: "allEntitlements",
      filtercriteria: buildFilterCriteria(step2.expressionEntitlement),
      assignedAfter: "",
    };

    // Build specific entitlements filter per app
    if (step2.specificApps && step2.specificApps.length > 0) {
      scopingCriteria.specificEntitlementsFilter = step2.specificApps.map((app: any) => {
        const appName = typeof app === "string" ? app : app.value || app.label || app;
        return {
          appName: appName,
          criteria: "allEntitlements",
          filtercriteria: buildFilterCriteria(step2.expressionEntitlement || []),
          assignedAfter: "",
        };
      });
    }
  }

  // Build reminders
  const reminders = {
    enabled: (step4.socReminders && step4.socReminders.length > 0) || 
             (step4.eocReminders && step4.eocReminders.length > 0),
    frequencyInDays: 5, // Default, could be extracted from form
    notificationTemplate: {
      subject: `Reminder: Access Review for Campaign ${step1.certificationTemplate || "Campaign"}`,
      body: `Hi ${"${reviewer.firstname}"},<br/><br/>You have pending items in the access review campaign: <strong>${step1.certificationTemplate || "Campaign"}</strong>.<br/>Please complete your review by <strong>${"${campaign.enddate}"}</strong>.<br/><br/><a href='${"${certificationUrl}"}'>Access Review Link</a><br/><br/>Thanks,<br/>Saviynt Team`,
    },
  };

  // Build notifications
  const notifications: any = {
    onStart: {
      notificationTemplate: {
        subject: `Access Review Started: ${step1.certificationTemplate || "Campaign"}`,
        body: `Hello ${"${reviewer.firstname}"},<br/><br/>The access certification campaign <strong>${step1.certificationTemplate || "Campaign"}</strong> has started.<br/>Start Date: ${"${campaign.startdate}"}<br/>End Date: ${"${campaign.enddate}"}<br/><br/><a href='${"${certificationUrl}"}'>Review Now</a><br/><br/>Thanks,<br/>Saviynt Governance Team`,
      },
    },
    onCompletion: {
      notificationTemplate: {
        subject: `Access Review Completed: ${step1.certificationTemplate || "Campaign"}`,
        body: `Dear ${"${reviewer.firstname}"},<br/><br/>The campaign <strong>${step1.certificationTemplate || "Campaign"}</strong> has been completed.<br/><br/>Thank you for your participation.<br/><br/>Saviynt Governance Team`,
      },
    },
  };

  if (step4.allowEscalation) {
    notifications.onEscalation = {
      enabled: true,
      notificationTemplate: {
        subject: `Escalation: Pending Access Review for ${step1.certificationTemplate || "Campaign"}`,
        body: `Hi ${"${reviewer.firstname}"},<br/><br/>You have not yet completed your access review for <strong>${step1.certificationTemplate || "Campaign"}</strong>.<br/>Please take action immediately to avoid non-compliance.<br/><br/><a href='${"${certificationUrl}"}'>Complete Review</a><br/><br/>Regards,<br/>Saviynt`,
      },
    };
  }

  // Build escalation
  const escalation = {
    enabled: !!step4.allowEscalation,
    daysBeforeExpiry: step4.allowEscalation ? parseInt(step4.allowEscalation) || 10 : 10,
  };

  // Build certificationOptions
  const certificationOptions = {
    allowDelegation: true, // Default
    allowPreDelegateToSignOff: step4.preDelegate || false,
    requireCommentOnRevoke: step4.enforceComments === "Revoke" || step4.enforceComments === "Custom Fields",
    requireCommentOnCertify: step4.enforceComments === "Certify" || step4.enforceComments === "Custom Fields",
    closedLoopRemediation: step4.remediationTicketing || false,
  };

  // Build campaignSchedularSetting
  const campaignSchedularSetting: any = {};
  if (step4.startDate) {
    campaignSchedularSetting.startDate = step4.startDate instanceof Date 
      ? step4.startDate.toISOString() 
      : step4.startDate;
  }
  if (step4.reviewRecurrence) {
    campaignSchedularSetting.frequency = parseInt(step4.reviewRecurrence) || 90;
  }
  campaignSchedularSetting.endOfCampaign = step4.end || "Never";

  // Determine campaign type (default to UserAccessReview)
  let campaignType = "UserAccessReview";
  // Could be determined from form data if available

  // Build campaign owner
  const campaignOwner = step1.ownerType === "User" 
    ? (step1.ownerUser?.[0]?.value || step1.ownerUser?.[0]?.label || "owner1")
    : (step1.ownerGroup?.[0]?.value || step1.ownerGroup?.[0]?.label || "owner1");

  // Build the final payload
  const payload: any = {
    name: step1.certificationTemplate || "",
    description: step1.description || "",
    campaignType: campaignType,
    campaignOwner: campaignOwner,
    reviewers: reviewers,
    userCriteria: userCriteria,
    scopingCriteria: scopingCriteria,
    reminders: reminders,
    notifications: notifications,
    escalation: escalation,
    certificationOptions: certificationOptions,
  };

  // Add dates if available (from step4 or step1)
  if (step4.startDate) {
    payload.startDate = step4.startDate instanceof Date 
      ? step4.startDate.toISOString() 
      : step4.startDate;
  }
  if (step4.duration) {
    // Calculate endDate from startDate + duration
    const start = step4.startDate instanceof Date ? step4.startDate : new Date(step4.startDate);
    const days = parseInt(step4.duration) || 30;
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + days);
    payload.endDate = endDate.toISOString();
  }

  // Add scheduler settings if provided
  if (Object.keys(campaignSchedularSetting).length > 0) {
    payload.campaignSchedularSetting = campaignSchedularSetting;
  }

  return payload;
}

