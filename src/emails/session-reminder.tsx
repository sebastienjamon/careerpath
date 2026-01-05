import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface SessionReminderProps {
  recipientName: string;
  otherPartyName: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  isCoach?: boolean;
}

export default function SessionReminderEmail({
  recipientName = "there",
  otherPartyName = "your coach",
  scheduledDate = "Tomorrow",
  scheduledTime = "2:00 PM",
  duration = 60,
  isCoach = false,
}: SessionReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Reminder: Coaching session tomorrow at {scheduledTime}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Session Reminder</Heading>

          <Text style={text}>Hi {recipientName},</Text>

          <Text style={text}>
            This is a reminder about your upcoming coaching session
            {isCoach ? ` with ${otherPartyName}` : ` with ${otherPartyName}`}.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>When</Text>
            <Text style={detailValue}>
              {scheduledDate} at {scheduledTime}
            </Text>

            <Text style={detailLabel}>Duration</Text>
            <Text style={detailValue}>{duration} minutes</Text>

            <Text style={detailLabel}>
              {isCoach ? "Client" : "Coach"}
            </Text>
            <Text style={detailValue}>{otherPartyName}</Text>
          </Section>

          <Text style={text}>
            {isCoach
              ? "Please ensure you're ready and available for the session. Your client is counting on you!"
              : "Make sure to prepare any questions or topics you'd like to discuss. This is your time to get the most value from the session!"}
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            — The CareerPath Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.25",
  marginBottom: "24px",
};

const text = {
  color: "#4a4a4a",
  fontSize: "16px",
  lineHeight: "1.5",
  marginBottom: "16px",
};

const detailsBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
};

const detailLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  marginBottom: "4px",
};

const detailValue = {
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: "500",
  marginBottom: "16px",
};

const hr = {
  borderColor: "#e5e7eb",
  marginTop: "24px",
  marginBottom: "24px",
};

const footer = {
  color: "#9ca3af",
  fontSize: "14px",
  marginTop: "32px",
};
