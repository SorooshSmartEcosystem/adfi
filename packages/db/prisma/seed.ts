import {
  Agent,
  AppointmentStatus,
  CallStatus,
  DraftStatus,
  FindingSeverity,
  Goal,
  PhoneNumberStatus,
  Plan,
  Platform,
  PrismaClient,
  SubscriptionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const MAYA_ID = "00000000-0000-0000-0000-000000000001";
const ORB_NUMBER = "+14165550172";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function wipeMaya() {
  // Child tables first (respecting FKs), then user.
  await prisma.finding.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.appointment.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.call.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.message.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.agentEvent.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.competitor.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.contentPost.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.contentDraft.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.phoneNumber.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.agentContext.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.connectedAccount.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.subscription.deleteMany({ where: { userId: MAYA_ID } });
  await prisma.user.deleteMany({ where: { id: MAYA_ID } });
}

async function main() {
  const now = Date.now();

  await wipeMaya();

  const user = await prisma.user.create({
    data: {
      id: MAYA_ID,
      email: "maya@ceramicsco.example",
      phone: "+14165551234",
      businessDescription:
        "Small-batch ceramic studio in Toronto. I make functional pottery — mugs, vases, serving bowls.",
      goal: Goal.MORE_CUSTOMERS,
      onboardedAt: new Date(now - 3 * DAY),
      trialEndsAt: new Date(now + 4 * DAY),
    },
  });

  await prisma.subscription.create({
    data: {
      userId: user.id,
      stripeCustomerId: "cus_maya_demo",
      stripeSubscriptionId: "sub_maya_demo",
      plan: Plan.SOLO,
      status: SubscriptionStatus.TRIALING,
      currentPeriodEnd: new Date(now + 4 * DAY),
    },
  });

  await prisma.phoneNumber.create({
    data: {
      userId: user.id,
      number: ORB_NUMBER,
      twilioSid: "PN_maya_demo",
      status: PhoneNumberStatus.ACTIVE,
    },
  });

  const draftAwaitingPhotos = await prisma.contentDraft.create({
    data: {
      userId: user.id,
      platform: Platform.INSTAGRAM,
      status: DraftStatus.AWAITING_PHOTOS,
      content: {
        caption: "Serving bowl collection — hand-thrown, speckled.",
        hashtags: ["#serveware", "#handmade"],
      },
    },
  });

  await prisma.contentDraft.create({
    data: {
      userId: user.id,
      platform: Platform.INSTAGRAM,
      status: DraftStatus.AWAITING_REVIEW,
      content: {
        caption:
          "New batch of speckled mugs — the ones with the cobalt rim. 12 fired this morning.",
        hashtags: ["#handmadeceramics", "#torontomakers", "#pottery"],
      },
      scheduledFor: new Date(now + 2 * HOUR),
    },
  });

  await prisma.contentDraft.create({
    data: {
      userId: user.id,
      platform: Platform.INSTAGRAM,
      status: DraftStatus.APPROVED,
      content: {
        caption: "Behind the scenes in the glazing room.",
        hashtags: ["#pottery", "#studiolife"],
      },
      scheduledFor: new Date(now + 1 * DAY),
    },
  });

  await prisma.competitor.createMany({
    data: [
      {
        userId: user.id,
        name: "East Fork",
        handle: "@eastfork",
        platform: Platform.INSTAGRAM,
      },
      {
        userId: user.id,
        name: "Heath Ceramics",
        handle: "@heathceramics",
        platform: Platform.INSTAGRAM,
      },
    ],
  });

  const call = await prisma.call.create({
    data: {
      userId: user.id,
      fromNumber: "+14165559876",
      durationSeconds: 143,
      extractedIntent: {
        category: "custom_commission",
        summary: "Looking for a set of 8 matching mugs",
      },
      estimatedValueCents: 48000,
      recoveredStatus: CallStatus.ANSWERED_BY_SIGNAL,
      startedAt: new Date(now - 4 * HOUR),
    },
  });

  await prisma.appointment.create({
    data: {
      userId: user.id,
      callId: call.id,
      customerName: "Jamie Lee",
      customerPhone: "+14165559876",
      scheduledFor: new Date(now + 3 * DAY),
      estimatedValueCents: 48000,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  await prisma.finding.create({
    data: {
      userId: user.id,
      agent: Agent.ECHO,
      severity: FindingSeverity.NEEDS_ATTENTION,
      summary:
        "Draft needs photos — the serving bowl post I wrote this morning.",
      payload: { draftId: draftAwaitingPhotos.id },
    },
  });

  console.log(`Seeded Maya fixture (user id: ${MAYA_ID}).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
