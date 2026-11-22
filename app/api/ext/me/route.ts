import { NextResponse } from "next/server";
import { cors, extUser, preflight } from "@/lib/ext-auth";
import { route } from "@/lib/http";
import { profileAnswers } from "@/lib/kit";
import { getSettings } from "@/lib/settings";
import { EXTENSION_VERSION } from "@/lib/version";

export const OPTIONS = preflight;

/** Dados que a extensão usa para preencher campos objetivos + link temporário do CV. */
export const GET = route(async (req: Request) => {
  const { admin, userId } = await extUser(req);
  const { data: p } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  const { data: cv } = await admin.from("cv_versions").select("file_path, file_name, mime_type").eq("user_id", userId).eq("is_default", true).maybeSingle();
  const signed = cv ? await admin.storage.from("cvs").createSignedUrl(cv.file_path, 300) : null;
  const settings = await getSettings(admin, userId);
  const [first, ...rest] = (p?.full_name ?? "").split(" ");
  const lastExp = p?.experiences?.[0];
  return cors(
    NextResponse.json({
      latestVersion: EXTENSION_VERSION,
      confirmed: Boolean(p?.confirmed_at),
      fields: p
        ? {
            full_name: p.full_name, first_name: first, last_name: rest.join(" "), email: p.email, phone: p.phone, city: p.city,
            linkedin: p.links?.linkedin, github: p.links?.github, portfolio: p.links?.portfolio,
            current_company: lastExp?.company, current_role: lastExp?.role,
            salary_clt: p.salary_clt, salary_pj: p.salary_pj, availability: p.availability,
            work_authorization: p.work_authorization, relocation: p.accepts_relocation,
            gender: p.diversity?.gender ?? null, race: p.diversity?.race ?? null, pcd: p.diversity?.pcd ?? null,
          }
        : null,
      quickAnswers: p ? profileAnswers(p) : [],
      charLimit: settings.answer_char_limit,
      cv: cv && signed?.data ? { url: signed.data.signedUrl, name: cv.file_name, mime: cv.mime_type } : null,
    }),
  );
});
