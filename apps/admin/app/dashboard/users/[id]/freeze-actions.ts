"use server";

// Server actions for the user-detail page's freeze/unfreeze buttons.
// Calls the admin tRPC procedures server-side, then triggers a
// revalidate so the page re-renders with the new deletedAt state.

import { revalidatePath } from "next/cache";
import { trpcServer } from "../../../../lib/trpc-server";

export async function freezeUserAction(userId: string, reason: string) {
  const trpc = await trpcServer();
  await trpc.admin.suspendUser({ id: userId, reason });
  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath(`/dashboard/users`);
}

export async function unfreezeUserAction(userId: string) {
  const trpc = await trpcServer();
  await trpc.admin.unsuspendUser({ id: userId });
  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath(`/dashboard/users`);
}

// Per-business freeze. STUDIO/AGENCY users have multiple Business
// rows; this lets admins freeze just one brand inside a real account.

export async function freezeBusinessAction(
  businessId: string,
  userId: string,
) {
  const trpc = await trpcServer();
  await trpc.admin.freezeBusiness({ id: businessId });
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function unfreezeBusinessAction(
  businessId: string,
  userId: string,
) {
  const trpc = await trpcServer();
  await trpc.admin.unfreezeBusiness({ id: businessId });
  revalidatePath(`/dashboard/users/${userId}`);
}
