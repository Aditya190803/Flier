export async function register(): Promise<void> {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.DYNO?.startsWith("web.")
  ) {
    await import("./scripts/scheduled-clock");
  }
}
