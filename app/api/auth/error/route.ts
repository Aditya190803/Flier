import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");

  // Return proper JSON response instead of HTML
  return NextResponse.json({
    error: error || "Unknown authentication error",
    message: getErrorMessage(error),
    timestamp: new Date().toISOString(),
  });
}

function getErrorMessage(error: string | null): string {
  switch (error) {
    case "Configuration":
      return "Server configuration error. Please check environment variables.";
    case "AccessDenied":
      return "Access was denied. Please try again.";
    case "Verification":
      return "Verification failed. Please try again.";
    default:
      return "An authentication error occurred. Please try again.";
  }
}
