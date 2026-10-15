import { draftMode } from "next/headers";
import { apiError, requireAdminApi } from "@/lib/auth/dal";

/** Turn on Draft Mode for a signed-in administrator, then open the site (optionally at a section anchor). */
export async function POST(request: Request) {
  try {
    await requireAdminApi(request);
    (await draftMode()).enable();
    let anchor = "";
    try {
      const form = await request.formData();
      const a = String(form.get("anchor") ?? "");
      if (/^[a-z0-9-]{1,90}$/.test(a)) anchor = `#${a}`;
    } catch {
      // No form body: open the top of the page.
    }
    return new Response(null, { status: 303, headers: { Location: `/${anchor}` } });
  } catch (err) {
    return apiError(err);
  }
}
