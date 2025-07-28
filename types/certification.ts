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
  certificationId: string;
  taskId: string;
  UserName?: string;
  UserID?: string;
  JobTitle?: string;
  Risk?: string;
  numOfApplicationsCertified?: number;
  numOfRolesCertified?: number;
  numOfEntitlementsCertified?: number;
  profileChange?: boolean;
  SoDConflicts?: boolean;
  addedAccounts?: boolean;
  addedEntitlements?: boolean;
}
