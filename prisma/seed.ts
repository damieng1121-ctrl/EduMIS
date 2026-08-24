import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedDemoTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "willowbrook" },
    create: {
      name: "Willowbrook Primary School",
      slug: "willowbrook",
      domain: "willowbrook-primary.sch.uk",
      urn: "999999",
      phase: "PRIMARY",
      brandColor: "#2563eb",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "admin@willowbrook-primary.sch.uk" },
    create: {
      email: "admin@willowbrook-primary.sch.uk",
      name: "Priya Shah",
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
      jobTitle: "School Business Manager",
    },
    update: { tenantId: tenant.id },
  });

  await prisma.user.upsert({
    where: { email: "office@willowbrook-primary.sch.uk" },
    create: {
      email: "office@willowbrook-primary.sch.uk",
      name: "Sam Okafor",
      role: "STAFF",
      tenantId: tenant.id,
      jobTitle: "School Office Manager",
    },
    update: { tenantId: tenant.id },
  });

  await prisma.user.upsert({
    where: { email: "j.taylor@willowbrook-primary.sch.uk" },
    create: {
      email: "j.taylor@willowbrook-primary.sch.uk",
      name: "Jamie Taylor",
      role: "STAFF",
      tenantId: tenant.id,
      jobTitle: "Year 3 Teacher",
      isTeacher: true,
    },
    update: { tenantId: tenant.id },
  });

  console.log(`Seeded demo tenant '${tenant.name}' (${tenant.slug}) with admin/office/teacher users.`);
}

/** Weekdays only, working backwards from today — good enough for demo attendance/meal data. */
function lastNWeekdays(n: number): Date[] {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (dates.length < n) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates.reverse();
}

/**
 * Populates the School MIS side of the demo tenant: academic year, form
 * groups, pupils, guardians (parent portal accounts), and a slice of
 * attendance/behaviour/SEND/assessment/ops/parents'-evening/messaging data
 * across every module, so the demo tenant showcases the whole product.
 * Guarded by a single "any pupils already exist?" check for idempotency.
 */
async function seedSchoolMis() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: "willowbrook" } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@willowbrook-primary.sch.uk" } });
  const office = await prisma.user.findUniqueOrThrow({ where: { email: "office@willowbrook-primary.sch.uk" } });
  const teacher = await prisma.user.findUniqueOrThrow({ where: { email: "j.taylor@willowbrook-primary.sch.uk" } });

  const existingPupils = await prisma.pupil.count({ where: { tenantId: tenant.id } });
  if (existingPupils > 0) {
    console.log("School MIS demo data already seeded — skipping.");
    return;
  }

  const academicYear = await prisma.academicYear.create({
    data: {
      tenantId: tenant.id,
      name: "2025/2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-07-21"),
      isCurrent: true,
    },
  });

  const formGroup3W = await prisma.formGroup.create({
    data: { tenantId: tenant.id, academicYearId: academicYear.id, name: "3W", yearGroup: "YEAR_3", staffLeadId: teacher.id },
  });
  const formGroup1G = await prisma.formGroup.create({
    data: { tenantId: tenant.id, academicYearId: academicYear.id, name: "1G", yearGroup: "YEAR_1" },
  });

  const pupilDefs = [
    { first: "Amelia", last: "Clarke", dob: "2016-09-14", gender: "FEMALE" as const, yearGroup: "YEAR_3" as const, formGroupId: formGroup3W.id, ethnicity: "White British", homeLanguage: "English", postcode: "WB1 2AB" },
    { first: "Oliver", last: "Bennett", dob: "2016-11-02", gender: "MALE" as const, yearGroup: "YEAR_3" as const, formGroupId: formGroup3W.id, ethnicity: "Black British - African", homeLanguage: "English", postcode: "WB2 4CD", sendStatus: "SEND_SUPPORT" as const, pupilPremium: true },
    { first: "Isla", last: "Robinson", dob: "2017-01-20", gender: "FEMALE" as const, yearGroup: "YEAR_3" as const, formGroupId: formGroup3W.id, ethnicity: "White British", homeLanguage: "English", postcode: "WB1 6EF" },
    { first: "Noah", last: "Whitfield", dob: "2016-08-05", gender: "MALE" as const, yearGroup: "YEAR_3" as const, formGroupId: formGroup3W.id, ethnicity: "Mixed - White and Black Caribbean", homeLanguage: "English", postcode: "WB3 1GH", freeSchoolMeals: true },
    { first: "Freya", last: "Ahmed", dob: "2016-12-11", gender: "FEMALE" as const, yearGroup: "YEAR_3" as const, formGroupId: formGroup3W.id, ethnicity: "Asian British - Pakistani", homeLanguage: "Urdu", postcode: "WB2 8JK" },
    { first: "George", last: "Patel", dob: "2019-03-02", gender: "MALE" as const, yearGroup: "YEAR_1" as const, formGroupId: formGroup1G.id, ethnicity: "Asian British - Indian", homeLanguage: "Gujarati", postcode: "WB4 3LM" },
    { first: "Lily", last: "Osei", dob: "2019-05-19", gender: "FEMALE" as const, yearGroup: "YEAR_1" as const, formGroupId: formGroup1G.id, ethnicity: "Black British - African", homeLanguage: "English", postcode: "WB1 9NP", sendStatus: "EHCP" as const, pupilPremium: true, freeSchoolMeals: true },
    { first: "Harry", last: "Novak", dob: "2018-10-30", gender: "MALE" as const, yearGroup: "YEAR_1" as const, formGroupId: formGroup1G.id, ethnicity: "White Other", homeLanguage: "Polish", postcode: "WB3 5QR" },
    { first: "Sophie", last: "Grant", dob: "2019-02-14", gender: "FEMALE" as const, yearGroup: "YEAR_1" as const, formGroupId: formGroup1G.id, ethnicity: "White British", homeLanguage: "English", postcode: "WB2 7ST" },
    { first: "Mohammed", last: "Iqbal", dob: "2018-09-09", gender: "MALE" as const, yearGroup: "YEAR_1" as const, formGroupId: formGroup1G.id, ethnicity: "Asian British - Pakistani", homeLanguage: "Urdu", postcode: "WB4 2UV" },
  ];

  const pupils = await Promise.all(
    pupilDefs.map((p, i) =>
      prisma.pupil.create({
        data: {
          tenantId: tenant.id,
          upn: `A80100000${String(i + 1).padStart(4, "0")}`,
          admissionNumber: `${1000 + i}`,
          firstName: p.first,
          lastName: p.last,
          dob: new Date(p.dob),
          gender: p.gender,
          yearGroup: p.yearGroup,
          formGroupId: p.formGroupId,
          ethnicity: p.ethnicity,
          homeLanguage: p.homeLanguage,
          addressLine1: `${i + 1} School Lane`,
          city: "Willowbrook",
          postcode: p.postcode,
          sendStatus: p.sendStatus ?? "NONE",
          pupilPremium: p.pupilPremium ?? false,
          freeSchoolMeals: p.freeSchoolMeals ?? false,
          admissionDate: new Date("2022-09-01"),
        },
      }),
    ),
  );
  const [amelia, oliver, isla, noah, freya] = pupils;

  // --- Attendance: 10 school days for the 3W form group, Oliver dips below the 90% persistent-absence threshold ---
  const days = lastNWeekdays(10);
  const form3wPupils = [amelia, oliver, isla, noah, freya];
  for (const pupil of form3wPupils) {
    for (const [i, date] of days.entries()) {
      const isOliver = pupil.id === oliver.id;
      const mark = isOliver && i % 3 === 0 ? "AUTHORISED_ABSENCE" : i === 2 && pupil.id === isla.id ? "LATE" : "PRESENT";
      const code = mark === "AUTHORISED_ABSENCE" ? "I" : mark === "LATE" ? "L" : "/";
      for (const session of ["AM", "PM"] as const) {
        await prisma.attendanceRecord.create({
          data: { tenantId: tenant.id, pupilId: pupil.id, date, session, mark, statutoryCode: code, recordedById: teacher.id },
        });
      }
    }
  }

  // --- Behaviour & welfare ---
  await prisma.behaviourIncident.create({
    data: { tenantId: tenant.id, pupilId: amelia.id, date: new Date(), category: "ACHIEVEMENT", points: 5, description: "Excellent teamwork leading her maths group.", recordedById: teacher.id },
  });
  await prisma.behaviourIncident.create({
    data: { tenantId: tenant.id, pupilId: oliver.id, date: new Date(), category: "CONCERN", points: -2, description: "Struggled to stay on task during literacy.", followUpRequired: true, followUpNotes: "Discuss a visual timer with SENCO.", recordedById: teacher.id },
  });
  await prisma.behaviourIncident.create({
    data: { tenantId: tenant.id, pupilId: noah.id, date: new Date(), category: "BULLYING", points: -5, description: "Reported unkind comments toward another pupil at lunch — following up with both families.", isConfidential: true, followUpRequired: true, recordedById: admin.id },
  });
  await prisma.accidentReport.create({
    data: { tenantId: tenant.id, pupilId: isla.id, date: new Date(), time: "10:45", location: "Playground", description: "Grazed knee falling during a chasing game.", actionTaken: "Cleaned and dressed the graze; pupil returned to class.", severity: "MINOR", parentNotified: true, parentNotifiedAt: new Date(), reportedById: teacher.id, firstAidGivenById: office.id },
  });
  await prisma.sendPlan.create({
    data: {
      tenantId: tenant.id,
      pupilId: oliver.id,
      status: "SEND_SUPPORT",
      primaryNeed: "COGNITION",
      description: "Additional support needed to maintain focus and process multi-step instructions.",
      targets: [{ target: "Complete a 3-step task independently", progress: "Emerging", reviewDate: "2026-01-15" }],
      externalAgencies: "Educational psychologist (termly review)",
      reviewDate: new Date("2026-01-15"),
      createdById: teacher.id,
    },
  });
  await prisma.sendPlan.create({
    data: {
      tenantId: tenant.id,
      pupilId: pupils.find((p) => p.lastName === "Osei")!.id,
      status: "EHCP",
      primaryNeed: "COMMUNICATION",
      description: "EHCP in place — 1:1 TA support for communication and language development.",
      targets: [{ target: "Use a 3-word phrase to request help", progress: "In progress", reviewDate: "2026-02-01" }],
      reviewDate: new Date("2026-02-01"),
      createdById: teacher.id,
    },
  });

  // --- Assessment ---
  const subjects = await Promise.all(
    ["Reading", "Writing", "Maths"].map((name, order) => prisma.assessmentSubject.create({ data: { tenantId: tenant.id, name, order } })),
  );
  const [reading] = subjects;
  for (const pupil of form3wPupils) {
    for (const subject of subjects) {
      await prisma.assessmentResult.create({
        data: {
          tenantId: tenant.id,
          pupilId: pupil.id,
          subjectId: subject.id,
          academicYearId: academicYear.id,
          term: "Autumn 1",
          attainment: pupil.id === oliver.id ? "Working Towards" : "Expected",
          teacherId: teacher.id,
          date: new Date(),
        },
      });
    }
  }
  await prisma.pupilTarget.create({
    data: {
      tenantId: tenant.id,
      pupilId: oliver.id,
      subjectId: reading.id,
      title: "Improve reading fluency",
      description: "Move from Working Towards to Expected by reading a wider range of decodable texts.",
      targetDate: new Date("2026-02-01"),
      status: "IN_PROGRESS",
      createdById: teacher.id,
    },
  });

  // --- School operations ---
  for (const pupil of form3wPupils) {
    await prisma.mealRecord.create({
      data: { tenantId: tenant.id, pupilId: pupil.id, date: days[days.length - 1], mealType: pupil.freeSchoolMeals ? "FSM" : "SCHOOL_MEAL", recordedById: teacher.id },
    });
  }
  const club = await prisma.club.create({
    data: { tenantId: tenant.id, academicYearId: academicYear.id, name: "Football Club", description: "After-school football for KS2.", dayOfWeek: 2, startTime: "15:30", endTime: "16:30", capacity: 16, staffLeadId: teacher.id },
  });
  for (const pupil of [amelia, oliver, noah]) {
    await prisma.clubMembership.create({ data: { tenantId: tenant.id, clubId: club.id, pupilId: pupil.id, status: "ACTIVE" } });
  }
  await Promise.all([
    prisma.staffProfile.create({ data: { tenantId: tenant.id, userId: teacher.id, staffType: "TEACHING", safeguardingTrainingDate: new Date("2025-09-01"), contractType: "Permanent, full-time" } }),
    prisma.staffProfile.create({ data: { tenantId: tenant.id, userId: office.id, staffType: "ADMIN", dbsCheckDate: new Date("2024-06-01"), safeguardingTrainingDate: new Date("2025-09-01"), contractType: "Permanent, full-time" } }),
    prisma.staffProfile.create({ data: { tenantId: tenant.id, userId: admin.id, staffType: "ADMIN", dbsCheckDate: new Date("2024-06-01"), safeguardingTrainingDate: new Date("2025-09-01"), contractType: "Permanent, full-time" } }),
  ]);
  const intervention = await prisma.intervention.create({
    data: { tenantId: tenant.id, pupilId: oliver.id, title: "Phonics booster group", subjectArea: "Reading", providerId: teacher.id, groupSize: 4, startDate: new Date("2025-11-01"), targetOutcome: "Close phonics gap to age-related expectation.", status: "ACTIVE" },
  });
  await prisma.interventionNote.create({
    data: { tenantId: tenant.id, interventionId: intervention.id, authorId: teacher.id, note: "Good progress on Phase 5 sounds this week." },
  });

  // --- Guardians / parent portal ---
  const demoPassword = await bcrypt.hash("Password123!", 10);
  const chinelo = await prisma.user.create({
    data: { email: "chinelo.bennett@example.com", name: "Chinelo Bennett", role: "PARENT", tenantId: tenant.id, passwordHash: demoPassword, phone: "07700 900123" },
  });
  const tom = await prisma.user.create({
    data: { email: "tom.whitfield@example.com", name: "Tom Whitfield", role: "PARENT", tenantId: tenant.id, passwordHash: demoPassword, phone: "07700 900456" },
  });
  await prisma.pupilGuardian.create({
    data: { tenantId: tenant.id, pupilId: oliver.id, guardianId: chinelo.id, relationship: "MOTHER", parentalResponsibility: true, isPrimaryContact: true, isEmergencyContact: true, canCollect: true },
  });
  await prisma.pupilGuardian.create({
    data: { tenantId: tenant.id, pupilId: noah.id, guardianId: tom.id, relationship: "FATHER", parentalResponsibility: true, isPrimaryContact: true, isEmergencyContact: true, canCollect: true },
  });

  // --- Parents' evening ---
  const eveningDate = new Date();
  eveningDate.setDate(eveningDate.getDate() + 14);
  const evening = await prisma.parentsEveningEvent.create({
    data: {
      tenantId: tenant.id,
      title: "Autumn Term Parents' Evening",
      date: eveningDate,
      startTime: "15:30",
      endTime: "18:00",
      slotMinutes: 10,
      formGroupIds: [formGroup3W.id],
      bookingOpensAt: new Date(),
      locationNote: "School hall",
      createdById: admin.id,
    },
  });
  const slotStart = new Date(eveningDate);
  slotStart.setHours(15, 30, 0, 0);
  for (let i = 0; i < 6; i++) {
    const start = new Date(slotStart.getTime() + i * 10 * 60 * 1000);
    const end = new Date(start.getTime() + 10 * 60 * 1000);
    const isBooked = i === 0;
    await prisma.appointmentSlot.create({
      data: {
        tenantId: tenant.id,
        eventId: evening.id,
        teacherId: teacher.id,
        startTime: start,
        endTime: end,
        status: isBooked ? "BOOKED" : "AVAILABLE",
        pupilId: isBooked ? oliver.id : null,
        guardianId: isBooked ? chinelo.id : null,
      },
    });
  }

  // --- Parent messaging ---
  const welcomeMessage = await prisma.parentMessage.create({
    data: { tenantId: tenant.id, senderId: admin.id, subject: "Welcome to the Willowbrook parent portal", body: "You can now check attendance, messages, and book parents' evening slots online. Let the office know if you have any questions.", audience: "ALL_PARENTS" },
  });
  await prisma.parentMessageRecipient.create({ data: { tenantId: tenant.id, messageId: welcomeMessage.id, guardianId: chinelo.id } });
  await prisma.parentMessageRecipient.create({ data: { tenantId: tenant.id, messageId: welcomeMessage.id, guardianId: tom.id, readAt: new Date() } });

  console.log(`Seeded School MIS demo data for '${tenant.name}': ${pupils.length} pupils across 2 form groups, plus attendance, behaviour, SEND, assessment, ops, parents' evening, and messaging.`);
  console.log(`Demo parent logins: chinelo.bennett@example.com / tom.whitfield@example.com, password: Password123!`);
}

/**
 * Two multi-school groupings, alongside standalone Willowbrook, so the
 * TRUST_ADMIN "switch between my Trust's schools" flow has something real
 * to click through: a small Federation (two schools sharing one head) and
 * a larger Multi-Academy Trust (three academies, one CEO/trust leader).
 * Kept light on MIS data deliberately — Willowbrook already demonstrates
 * that depth; these exist to demonstrate the Trust structure itself.
 */
async function seedTrusts() {
  const federation = await prisma.trust.upsert({
    where: { slug: "two-rivers-federation" },
    create: { name: "Two Rivers Federation", slug: "two-rivers-federation" },
    update: {},
  });
  const alderBank = await prisma.tenant.upsert({
    where: { slug: "alder-bank" },
    create: {
      name: "Alder Bank Primary School",
      slug: "alder-bank",
      domain: "alder-bank.sch.uk",
      phase: "PRIMARY",
      brandColor: "#0d9488",
      trustId: federation.id,
    },
    update: { trustId: federation.id },
  });
  const elmGrove = await prisma.tenant.upsert({
    where: { slug: "elm-grove" },
    create: {
      name: "Elm Grove Primary School",
      slug: "elm-grove",
      domain: "elm-grove.sch.uk",
      phase: "PRIMARY",
      brandColor: "#0d9488",
      trustId: federation.id,
    },
    update: { trustId: federation.id },
  });
  await prisma.user.upsert({
    where: { email: "head@alder-bank.sch.uk" },
    create: { email: "head@alder-bank.sch.uk", name: "Nadia Farooq", role: "TENANT_ADMIN", tenantId: alderBank.id, jobTitle: "Head of School" },
    update: { tenantId: alderBank.id },
  });
  await prisma.user.upsert({
    where: { email: "head@elm-grove.sch.uk" },
    create: { email: "head@elm-grove.sch.uk", name: "Callum Reid", role: "TENANT_ADMIN", tenantId: elmGrove.id, jobTitle: "Head of School" },
    update: { tenantId: elmGrove.id },
  });
  await prisma.user.upsert({
    where: { email: "federation.head@two-rivers-federation.org" },
    create: {
      email: "federation.head@two-rivers-federation.org",
      name: "Morgan Reyes",
      role: "TRUST_ADMIN",
      trustId: federation.id,
      jobTitle: "Executive Headteacher",
    },
    update: { trustId: federation.id },
  });

  const oakTrust = await prisma.trust.upsert({
    where: { slug: "oak-learning-trust" },
    create: { name: "Oak Learning Trust", slug: "oak-learning-trust" },
    update: {},
  });
  const oakSchools = [
    { name: "Oakfield Primary Academy", slug: "oakfield-primary", domain: "oakfield-primary.oaklearningtrust.org", head: "Priti Malhotra" },
    { name: "Riverside Primary Academy", slug: "riverside-primary", domain: "riverside-primary.oaklearningtrust.org", head: "Ben Sutherland" },
    { name: "Northgate Primary Academy", slug: "northgate-primary", domain: "northgate-primary.oaklearningtrust.org", head: "Aisha Kone" },
  ];
  for (const school of oakSchools) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: school.slug },
      create: { name: school.name, slug: school.slug, domain: school.domain, phase: "PRIMARY", brandColor: "#b45309", trustId: oakTrust.id },
      update: { trustId: oakTrust.id },
    });
    await prisma.user.upsert({
      where: { email: `head@${school.domain}` },
      create: { email: `head@${school.domain}`, name: school.head, role: "TENANT_ADMIN", tenantId: tenant.id, jobTitle: "Head of School" },
      update: { tenantId: tenant.id },
    });
  }
  await prisma.user.upsert({
    where: { email: "ceo@oaklearningtrust.org" },
    create: { email: "ceo@oaklearningtrust.org", name: "Dr Amara Osei", role: "TRUST_ADMIN", trustId: oakTrust.id, jobTitle: "Trust CEO" },
    update: { trustId: oakTrust.id },
  });

  console.log("Seeded Two Rivers Federation (2 schools) and Oak Learning Trust (3 schools).");
}

/**
 * A platform-wide super admin, not tied to any school. Only usable if its
 * email is also listed in EDUMIS_SUPER_ADMIN_EMAILS — that env var is what
 * actually grants the role on sign-in (see resolveTenantAndRole in
 * src/lib/auth.ts); this row just gives the "Dev login" button on /login
 * something to sign into locally, without needing real Google OAuth.
 */
async function seedPlatformSuperAdmin() {
  await prisma.user.upsert({
    where: { email: "superadmin@edumis.dev" },
    create: {
      email: "superadmin@edumis.dev",
      name: "EduMIS Platform Admin",
      role: "SUPER_ADMIN",
      tenantId: null,
    },
    update: {},
  });
  console.log("Seeded platform super admin (superadmin@edumis.dev).");
}

async function main() {
  await seedDemoTenant();
  await seedSchoolMis();
  await seedTrusts();
  await seedPlatformSuperAdmin();

  console.log("\nDemo logins:");
  console.log("  Super admin:   superadmin@edumis.dev (sees every school and every Trust)");
  console.log("  Tenant admin:  admin@willowbrook-primary.sch.uk (standalone school)");
  console.log("  Staff:         office@willowbrook-primary.sch.uk");
  console.log("  Staff/teacher: j.taylor@willowbrook-primary.sch.uk");
  console.log("  Federation head: federation.head@two-rivers-federation.org (Two Rivers Federation, 2 schools)");
  console.log("  Trust CEO:       ceo@oaklearningtrust.org (Oak Learning Trust, 3 schools)");
  console.log("  (Use the 'Dev login' panel on /login in development — no password needed.)");
  console.log("  Parent portal: chinelo.bennett@example.com / tom.whitfield@example.com, password: Password123!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
