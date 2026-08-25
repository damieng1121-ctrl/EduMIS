import { XMLParser } from "fast-xml-parser";

/**
 * Common Transfer File (CTF) — the DfE's XML interchange format for moving
 * a pupil's record between schools.
 *
 * IMPORTANT: this targets the well-documented CORE structure of the format
 * (the mandatory identifiers — UPN/Surname/Forename/DOB/Sex — plus the
 * common BasicDetails/Address/SEN/FSM/SchoolHistory containers), which has
 * stayed consistent across CTF versions 15 through 25 per DfE's published
 * guidance. It was NOT built against the current byte-exact XSD — this
 * session's environment couldn't reach gov.uk's asset domains to fetch it.
 * Validate a sample export against a real receiving system (or the DfE's
 * own CTF tooling) before relying on this for an actual pupil transfer.
 * The numbers in the comments (100001, 100003, ...) are DfE's own "data
 * item" reference numbers for these fields, kept for traceability.
 */

export type CtfPupilInput = {
  upn: string | null;
  formerUpn: string | null;
  firstName: string;
  middleNames: string | null;
  lastName: string;
  dob: Date;
  gender: "MALE" | "FEMALE";
  ethnicity: string | null;
  homeLanguage: string | null;
  nationality: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  sendStatus: string;
  freeSchoolMeals: boolean;
  admissionDate: Date | null;
};

type SourceSchoolInfo = { name: string; urn: string | null };

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function el(tag: string, value: string | null | undefined): string {
  if (!value) return `<${tag}/>`;
  return `<${tag}>${xmlEscape(value)}</${tag}>`;
}

function formatDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** Builds a single-pupil CTF XML document. */
export function buildCtfXml(pupil: CtfPupilInput, school: SourceSchoolInfo): string {
  const sex = pupil.gender === "MALE" ? "M" : "F";
  return `<?xml version="1.0" encoding="UTF-8"?>
<SchoolDataMLwithSpecials xmlns="http://www.dfes.gov.uk/datatransfer/schooldata">
  <Header>
    <DocumentType>CTF</DocumentType>
    <SourceSchool>
      ${el("SchoolName", school.name)}
      ${el("URN", school.urn)}
    </SourceSchool>
    ${el("DateTime", new Date().toISOString())}
  </Header>
  <Pupils>
    <Pupil>
      <PupilIdentifiers>
        <!-- 100001 -->
        ${el("UPN", pupil.upn)}
        ${el("FormerUPN", pupil.formerUpn)}
      </PupilIdentifiers>
      <BasicDetails>
        <!-- 100003 -->
        ${el("Surname", pupil.lastName)}
        <!-- 100004 -->
        ${el("Forename", pupil.firstName)}
        ${el("MiddleNames", pupil.middleNames)}
        <!-- 100007 -->
        ${el("DOB", formatDate(pupil.dob))}
        <!-- 100008 -->
        ${el("Sex", sex)}
        ${el("Ethnicity", pupil.ethnicity)}
        ${el("FirstLanguage", pupil.homeLanguage)}
        ${el("Nationality", pupil.nationality)}
      </BasicDetails>
      <AddressDetail>
        <Address>
          ${el("AddressLine1", pupil.addressLine1)}
          ${el("AddressLine2", pupil.addressLine2)}
          ${el("Town", pupil.city)}
          ${el("PostCode", pupil.postcode)}
        </Address>
      </AddressDetail>
      <SENDetails>
        ${el("SENStatus", pupil.sendStatus)}
      </SENDetails>
      <FSMDetails>
        ${el("FSMEligibility", pupil.freeSchoolMeals ? "Y" : "N")}
      </FSMDetails>
      <SchoolHistory>
        <School>
          ${el("URN", school.urn)}
          ${el("EntryDate", formatDate(pupil.admissionDate))}
        </School>
      </SchoolHistory>
    </Pupil>
  </Pupils>
</SchoolDataMLwithSpecials>
`;
}

export type ParsedCtfPupil = {
  upn: string | null;
  formerUpn: string | null;
  firstName: string | null;
  middleNames: string | null;
  lastName: string | null;
  dob: string | null;
  gender: "MALE" | "FEMALE" | null;
  ethnicity: string | null;
  homeLanguage: string | null;
  nationality: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  freeSchoolMeals: boolean;
};

/**
 * Parses an uploaded CTF file into a plain object for review before import
 * — never writes straight to the database, since this is data from another
 * school's system and needs a human to confirm the mapping first.
 *
 * Uses fast-xml-parser, which does not resolve DTDs or external entities
 * (unlike a DOM-based XML parser), so a malicious upload can't use an XXE
 * payload to read local files or make the server issue outbound requests.
 */
export function parseCtfXml(xml: string): { pupil: ParsedCtfPupil } | { error: string } {
  const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    return { error: "That file isn't valid XML." };
  }

  const root = (doc as Record<string, unknown>)?.SchoolDataMLwithSpecials as Record<string, unknown> | undefined;
  const pupilsNode = root?.Pupils as Record<string, unknown> | undefined;
  const pupilNode = pupilsNode?.Pupil as Record<string, unknown> | undefined;
  if (!pupilNode) {
    return { error: "Couldn't find a <Pupil> record in this file — is it a CTF export?" };
  }

  const identifiers = (pupilNode.PupilIdentifiers as Record<string, unknown>) ?? {};
  const basic = (pupilNode.BasicDetails as Record<string, unknown>) ?? {};
  const address = ((pupilNode.AddressDetail as Record<string, unknown>)?.Address as Record<string, unknown>) ?? {};
  const fsm = (pupilNode.FSMDetails as Record<string, unknown>) ?? {};

  const str = (v: unknown): string | null => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };

  const sexRaw = str(basic.Sex);
  const gender: ParsedCtfPupil["gender"] = sexRaw === "M" ? "MALE" : sexRaw === "F" ? "FEMALE" : null;

  return {
    pupil: {
      upn: str(identifiers.UPN),
      formerUpn: str(identifiers.FormerUPN),
      firstName: str(basic.Forename),
      middleNames: str(basic.MiddleNames),
      lastName: str(basic.Surname),
      dob: str(basic.DOB),
      gender,
      ethnicity: str(basic.Ethnicity),
      homeLanguage: str(basic.FirstLanguage),
      nationality: str(basic.Nationality),
      addressLine1: str(address.AddressLine1),
      addressLine2: str(address.AddressLine2),
      city: str(address.Town),
      postcode: str(address.PostCode),
      freeSchoolMeals: str(fsm.FSMEligibility) === "Y",
    },
  };
}
