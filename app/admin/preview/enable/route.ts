import { draftMode } from "next/headers";
import { apiError, requireAdminApi } from "@/lib/auth/dal";

/** Turn on Draft Mode for a signed-in administrator, then open the site. */
export async function POST(request: Request) {
  try {
    await requireAdminApi(request);
    (await draftMode()).enable();
    return new Response(null, { status: 303, headers: { Location: "/" } });
  } catch (err) {
    return apiError(err);
  }
}
