import type { Prisma } from "@prisma/client";

export type UserWithSubscription = Prisma.UserGetPayload<{
  include: { subscriptions: true };
}>;

export type CallWithAppointments = Prisma.CallGetPayload<{
  include: { appointments: true };
}>;

export type ContentDraftWithPosts = Prisma.ContentDraftGetPayload<{
  include: { posts: true };
}>;

export type MessageWithUser = Prisma.MessageGetPayload<{
  include: { user: true };
}>;
