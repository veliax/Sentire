import { NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

export function middleware(req: any) {
  const token = req.cookies.get("token")?.value;

  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    if (!token || !verifyToken(token)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}
