import { NextResponse } from "next/server";
import { mineEchoPatternsForUser, runAgentForAllEligibleUsers } from "@orb/api";
import { Agent } from "@orb/db";

function unauthorized(): NextResponse {
  return new NextResponse("unauthorized", { status: 401 });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return unauthorized();
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const result = await runAgentForAllEligibleUsers(
    Agent.ECHO,
    mineEchoPatternsForUser,
  );
  return NextResponse.json(result);
}
