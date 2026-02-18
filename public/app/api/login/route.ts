import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

const fakeUser = {
  email: "admin@test.com",
  password: bcrypt.hashSync("123456", 10),
};

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (email !== fakeUser.email) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, fakeUser.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signToken({ email });

  const response = NextResponse.json({ success: true });

  response.cookies.set("token", token, {
    httpOnly: true,
    secure: true,
    path: "/",
  });

  return response;
}
