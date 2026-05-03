export interface GovBrSignRequestDto {
  resourceType: string;
  resourceId?: string;
  payload: Record<string, unknown>;
  returnUrl?: string;
}

export interface GovBrSignCallbackQueryDto {
  state?: string;
  decision?: string;
  challenge?: string;
}
