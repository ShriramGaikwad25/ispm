export interface ReviewerCertificationInfo {
  certificationName: string;
  certificationType: string;
  certificationCreatedOn: string;
  certificationExpiration: string;
  status: string;
  certificationSignedOff: boolean;
  certificateRequester: string;
}

export interface ReviewerCertificateActionInfo {
  percentageCompleted: number;
  totalActions: number;
  totalActionsCompleted: number;
}

export interface RawCertification {
  reviewerId: string;
  certificationId: string;
  campaignId: string;
  reviewerCertificationInfo?: ReviewerCertificationInfo[];
  reviewerCertificateActionInfo?: ReviewerCertificateActionInfo[];
}

export interface CertificationRow {
  id: string; // Unique ID for the row
  reviewerId: string;
  taskId: string;
  certificationId: string;
  campaignId: string;
  certificationName: string;
  certificationType: string;
  certificationCreatedOn: string;
  certificationExpiration: string;
  status: string;
  certificationSignedOff: boolean;
  certificateRequester: string;
  percentageCompleted: number;
  totalActions: number;
  totalActionsCompleted: number;
}

export interface UserRowData {
  id: string;
  username?: string;
  userid?: string;
  userStatus?: string;
  manager?: string;
  department?: string;
  JobTitle?: string;
  userType?: 'Internal' | 'External';
  certificationId: string;
  taskId: string;
  lineItemId?: string;
  entitlementName?: string;
  status?: string;
  numOfApplicationsCertified?: number;
  numOfRolesCertified?: number;
  numOfEntitlementsCertified?: number;
  profileChange?: string;
  SoDConflicts?: string;
  addedAccounts?: string;
  addedEntitlements?: string;
  user?: string;
  risk?: string;
  applicationName?: string;
  lastLogin?: string;
  recommendation?: string;
  entitlementDescription?: string;
  accessedWithinAMonth?: string;
  itemRisk?: string;
  entitlementType?: string;
}
