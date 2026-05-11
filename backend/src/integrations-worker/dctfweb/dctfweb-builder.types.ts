import { QueryResultRow } from 'pg';

import {
  DctfwebDeclarationDto,
  DctfwebDeclarationKind,
  DctfwebMitStatus,
  DctfwebSourceEvent,
} from './dctfweb.dto';

export interface TotalizerRow extends QueryResultRow {
  kind: 'S-5011' | 'S-5012' | 'S-5013' | 'R-9015';
  source_event_recibo: string;
  payload: Record<string, unknown> | string;
}

export interface DeclarationRow extends QueryResultRow {
  id: string;
  competence: Date | string;
  kind: DctfwebDeclarationKind;
  status: DctfwebDeclarationDto['status'];
  original_declaration_id: string | null;
  payload_xml_ref: string;
  payload_xml: string;
  payload_xml_hash: string;
  signed_xml_ref: string | null;
  signed_xml: string | null;
  signed_xml_hash: string | null;
  transmitted_xml_hash: string | null;
  receipt_number: string | null;
  receipt_at: Date | string | null;
  item_count: number | string;
  total_base_amount: string;
  total_amount: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ItemRow extends QueryResultRow {
  id: string;
  source_event: DctfwebSourceEvent;
  source_run_id: string;
  debit_code: string;
  base_amount: string;
  amount: string;
  csll_adicional_amount: string | null;
  mit_status: DctfwebMitStatus | null;
  mit_debit_id: string | null;
  cnpj_filial: string | null;
}

export interface PgdTaxDebitRow extends QueryResultRow {
  pgd_declaration_id: string;
  pgd_debit_id: string;
  cnpj_filial: string;
  tax_code: string;
  base_amount: string;
  amount: string;
  csll_adicional_amount: string | null;
  mit_status: DctfwebMitStatus | null;
}

export interface SourceItem {
  sourceEvent: DctfwebSourceEvent;
  sourceRunId: string;
  debitCode: string;
  baseAmount: string;
  amount: string;
  csllAdicionalAmount: string;
  mitStatus?: DctfwebMitStatus | undefined;
  mitDebitId?: string | undefined;
  cnpjFilial?: string | undefined;
}

export interface XmlItemMetadata {
  mitStatus?: DctfwebMitStatus;
  mitDebitId?: string;
  cnpjFilial?: string;
}
