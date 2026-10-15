import { draftMode } from "next/headers";
import { apiError, assertSameOrigin } from "@/lib/auth/dal";

/** Leave Draft Mode. Allowed without a session so a stale preview can always be closed. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    (await draftMode()).disable();
    return new Response(null, { status: 303, headers: { Location: "/admin" } });
  } catch (err) {
    return apiError(err);
  }
}
