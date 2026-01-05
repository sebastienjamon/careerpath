// Google Calendar API helper functions

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  location?: string;
  htmlLink: string;
}

export interface CalendarEventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
}

/**
 * Check if a token is expired (with 5 minute buffer)
 */
export function isTokenExpired(expiresAt: Date): boolean {
  const buffer = 5 * 60 * 1000; // 5 minutes
  return new Date().getTime() > expiresAt.getTime() - buffer;
}

/**
 * Refresh an access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Failed to refresh token");
  }

  return response.json();
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Failed to exchange code for tokens");
  }

  return response.json();
}

/**
 * Fetch calendar events from Google Calendar API
 */
export async function fetchCalendarEvents(
  accessToken: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    q?: string;
  } = {}
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(options.maxResults || 50),
  });

  // Default to next 30 days if not specified
  if (options.timeMin) {
    params.set("timeMin", options.timeMin);
  } else {
    params.set("timeMin", new Date().toISOString());
  }

  if (options.timeMax) {
    params.set("timeMax", options.timeMax);
  } else {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    params.set("timeMax", thirtyDaysFromNow.toISOString());
  }

  if (options.q) {
    params.set("q", options.q);
  }

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch calendar events");
  }

  const data: CalendarEventsResponse = await response.json();
  return data.items || [];
}

/**
 * Revoke a token with Google
 */
export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
}

/**
 * Build Google OAuth authorization URL
 */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline",
    prompt: "consent", // Force consent to get refresh token
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
