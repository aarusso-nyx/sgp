import {
  assertRetroactiveReference,
  buildR2000Envelope,
  buildR2000EventHeader,
  buildR2000EventId,
  competenceText,
  moneyText,
  ReinfRegistrationType,
  R2000BaseEventInput,
  xmlEscape,
} from './r2000.builder';

export interface R2055ProducerInput {
  registrationType: Extract<ReinfRegistrationType, '1' | '2' | '3'>;
  registrationNumber: string;
  name: string;
  ruralProducerOption?: 'S' | 'N';
}

export interface R2055AcquiringEstablishmentInput {
  registrationType: ReinfRegistrationType;
  registrationNumber: string;
  producer: R2055ProducerInput;
}

export interface R2055JudicialProcessInput {
  processNumber: string;
  suspendedPrincipalAmount?: string;
  suspendedGilratAmount?: string;
  suspendedSenarAmount?: string;
}

export interface R2055RetroactiveAdjustmentInput {
  referenceCompetence: string;
  originalReceiptNumber: string;
  reason: string;
}

export interface R2055AcquisitionInput {
  sourceRunId?: string;
  acquisitionIndicator: string;
  grossAmount: string;
  principalWithheldAmount: string;
  gilratWithheldAmount: string;
  senarWithheldAmount: string;
  additionalWithheldAmount?: string;
  judicialProcess?: R2055JudicialProcessInput;
  retroactiveAdjustment?: R2055RetroactiveAdjustmentInput;
}

export interface R2055EventInput extends Omit<
  R2000BaseEventInput,
  'eventCode'
> {
  eventCode?: 'R2055';
  acquiringEstablishment: R2055AcquiringEstablishmentInput;
  acquisitions: R2055AcquisitionInput[];
}

export function buildR2055EventXml(input: R2055EventInput): string {
  if (!input.acquisitions.length) {
    throw new Error('R2055 acquisitions are required');
  }
  for (const acquisition of input.acquisitions) {
    if (acquisition.retroactiveAdjustment) {
      assertRetroactiveReference(
        input.reportingCompetence,
        acquisition.retroactiveAdjustment.referenceCompetence,
      );
    }
  }

  const eventCode = 'R2055' as const;
  const eventId =
    input.eventId ??
    buildR2000EventId(
      eventCode,
      `${input.contributor.registrationNumber}:${input.reportingCompetence}:${input.acquiringEstablishment.producer.registrationNumber}`,
    );
  const baseInput = { ...input, eventCode, eventId };
  const headerXml = buildR2000EventHeader(baseInput);
  const acquisitionsXml = input.acquisitions
    .map(buildAcquisitionXml)
    .join('\n');
  const bodyXml = `    <infoAquisProd>
      <ideEstabAdquir>
        <tpInscAdq>${input.acquiringEstablishment.registrationType}</tpInscAdq>
        <nrInscAdq>${xmlEscape(input.acquiringEstablishment.registrationNumber)}</nrInscAdq>
        <tpInscProd>${input.acquiringEstablishment.producer.registrationType}</tpInscProd>
        <nrInscProd>${xmlEscape(input.acquiringEstablishment.producer.registrationNumber)}</nrInscProd>
        <nomeProd>${xmlEscape(input.acquiringEstablishment.producer.name)}</nomeProd>
        <indOpcCP>${input.acquiringEstablishment.producer.ruralProducerOption ?? 'N'}</indOpcCP>
${acquisitionsXml}
      </ideEstabAdquir>
    </infoAquisProd>`;

  return buildR2000Envelope({
    eventCode,
    eventElement: 'evtAqProd',
    eventId,
    headerXml,
    bodyXml,
  });
}

function buildAcquisitionXml(acquisition: R2055AcquisitionInput): string {
  const sourceRunAttribute = acquisition.sourceRunId
    ? ` sourceRunId="${xmlEscape(acquisition.sourceRunId)}"`
    : '';
  const judicialProcessXml = acquisition.judicialProcess
    ? `
          <infoProcJud>
            <nrProc>${xmlEscape(acquisition.judicialProcess.processNumber)}</nrProc>
            <vlrCPSusp>${moneyText(acquisition.judicialProcess.suspendedPrincipalAmount)}</vlrCPSusp>
            <vlrRatSusp>${moneyText(acquisition.judicialProcess.suspendedGilratAmount)}</vlrRatSusp>
            <vlrSenarSusp>${moneyText(acquisition.judicialProcess.suspendedSenarAmount)}</vlrSenarSusp>
          </infoProcJud>`
    : '';
  const retroactiveXml = acquisition.retroactiveAdjustment
    ? `
          <infoAjusteRetroativo>
            <perRef>${competenceText(acquisition.retroactiveAdjustment.referenceCompetence)}</perRef>
            <nrReciboOrig>${xmlEscape(acquisition.retroactiveAdjustment.originalReceiptNumber)}</nrReciboOrig>
            <descAjuste>${xmlEscape(acquisition.retroactiveAdjustment.reason)}</descAjuste>
          </infoAjusteRetroativo>`
    : '';
  return `        <detAquis${sourceRunAttribute}>
          <indAquis>${xmlEscape(acquisition.acquisitionIndicator)}</indAquis>
          <vlrBruto>${moneyText(acquisition.grossAmount)}</vlrBruto>
          <vlrCPDescPR>${moneyText(acquisition.principalWithheldAmount)}</vlrCPDescPR>
          <vlrRatDescPR>${moneyText(acquisition.gilratWithheldAmount)}</vlrRatDescPR>
          <vlrSenarDesc>${moneyText(acquisition.senarWithheldAmount)}</vlrSenarDesc>
          <vlrAdicDescPR>${moneyText(acquisition.additionalWithheldAmount)}</vlrAdicDescPR>${judicialProcessXml}${retroactiveXml}
        </detAquis>`;
}
