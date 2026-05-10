"use server";

import { revalidatePath } from "next/cache";
import { trpcServer } from "../../../lib/trpc-server";

export async function purchaseNumberAction(input: {
  businessId: string;
  areaCode?: number;
}) {
  const trpc = await trpcServer();
  await trpc.admin.purchasePhoneNumber({
    businessId: input.businessId,
    ...(input.areaCode ? { areaCode: input.areaCode } : {}),
  });
  revalidatePath("/dashboard/numbers");
}

export async function releaseNumberAction(id: string) {
  const trpc = await trpcServer();
  await trpc.admin.releasePhoneNumber({ id });
  revalidatePath("/dashboard/numbers");
}

export async function syncWebhooksAction(id: string) {
  const trpc = await trpcServer();
  await trpc.admin.syncPhoneNumberWebhooks({ id });
  revalidatePath("/dashboard/numbers");
}
