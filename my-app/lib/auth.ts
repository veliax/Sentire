export function getToken(): string | undefined {
  if (typeof window === "undefined") return undefined
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1]
}

export function setToken(token: string) {
  if (typeof window === "undefined") return
  document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
}

export function clearToken() {
  if (typeof window === "undefined") return
  document.cookie = "token=; path=/; max-age=0"
}
