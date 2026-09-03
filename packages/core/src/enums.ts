
export const USER_ROLES = ['PLAYER', 'COACH', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const MEMBERSHIP_TIERS = ['BASE', 'PRO'] as const;
export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number];

export const VIDEO_ASSET_KINDS = [
  'PLAYER_UPLOAD',
  'COACH_FEEDBACK',
  'LIBRARY_DRILL',
  'PROTOCOL',
] as const;
export type VideoAssetKind = (typeof VIDEO_ASSET_KINDS)[number];

export const VIDEO_ASSET_STATUSES = [
  'PENDING_UPLOAD',
  'UPLOADING',
  'PROCESSING',
  'READY',
  'ERRORED',
] as const;
export type VideoAssetStatus = (typeof VIDEO_ASSET_STATUSES)[number];

export const SUBMISSION_STATUSES = ['SUBMITTED', 'IN_REVIEW', 'ANALYZED'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const ANALYSIS_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export const TRAINING_DAY_KINDS = ['REHAB', 'STRENGTH'] as const;
export type TrainingDayKind = (typeof TRAINING_DAY_KINDS)[number];

export const PROTOCOL_TYPES = ['WARMUP', 'RECOVERY'] as const;
export type ProtocolType = (typeof PROTOCOL_TYPES)[number];
