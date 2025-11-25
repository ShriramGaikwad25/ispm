import { NextRequest } from "next/server";
import { COOKIE_NAMES } from "@/lib/auth";

export function getJwtTokenFromRequest(request: NextRequest): string | null {
  try {
    return request.cookies.get(COOKIE_NAMES.JWT_TOKEN)?.value ?? null;
  } catch {
    return null;
  }
}

export function withAuthHeader(
  headers: HeadersInit | undefined,
  jwtToken: string | null
): HeadersInit | undefined {
  if (!jwtToken) {
    return headers;
  }

  const headerBag = new Headers(headers ?? undefined);

  if (!headerBag.has("Authorization")) {
    headerBag.set("Authorization", `Bearer ${jwtToken}`);
  }

  return headerBag;
}

