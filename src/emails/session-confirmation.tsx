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

interface SessionConfirmationProps {
  clientName: string;
  coachName: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  amount: string;
  isCoach?: boolean;
}

export default function SessionConfirmationEmail({
  clientName = "Client",
  coachName = "Coach",
  scheduledDate = "January 15, 2025",
  scheduledTime = "2:00 PM",
  duration = 60,
  amount = "$50.00",
  isCoach = false,
}: SessionConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Coaching session confirmed for {scheduledDate}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Session Confirmed!</Heading>

          <Text style={text}>
            Hi {isCoach ? coachName : clientName},
          </Text>

          <Text style={text}>
            {isCoach
              ? `Great news! ${clientName} has booked a coaching session with you.`
              : `Your coaching session with ${coachName} has been confirmed.`}
          </Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Date</Text>
            <Text style={detailValue}>{scheduledDate}</Text>

            <Text style={detailLabel}>Time</Text>
            <Text style={detailValue}>{scheduledTime}</Text>

            <Text style={detailLabel}>Duration</Text>
            <Text style={detailValue}>{duration} minutes</Text>

            <Text style={detailLabel}>{isCoach ? "You'll Receive" : "Amount Paid"}</Text>
            <Text style={detailValue}>{amount}</Text>
          </Section>

          <Text style={text}>
            {isCoach
              ? "Please make sure you're available at the scheduled time. You'll receive a reminder 24 hours before the session."
              : "You'll receive a reminder 24 hours before your session. If you need to reschedule, please contact your coach directly."}
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
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
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
