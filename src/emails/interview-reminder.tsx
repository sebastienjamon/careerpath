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

interface InterviewReminderProps {
  userName: string;
  companyName: string;
  jobTitle: string;
  stepType: string;
  scheduledDate: string;
  scheduledTime: string;
  objectives?: string[];
}

export default function InterviewReminderEmail({
  userName = "there",
  companyName = "Company",
  jobTitle = "Position",
  stepType = "Interview",
  scheduledDate = "Tomorrow",
  scheduledTime = "10:00 AM",
  objectives = [],
}: InterviewReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>Reminder: {stepType} with {companyName} tomorrow</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Interview Reminder</Heading>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            This is a reminder that you have an upcoming interview:
          </Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Company</Text>
            <Text style={detailValue}>{companyName}</Text>

            <Text style={detailLabel}>Position</Text>
            <Text style={detailValue}>{jobTitle}</Text>

            <Text style={detailLabel}>Type</Text>
            <Text style={detailValue}>{stepType}</Text>

            <Text style={detailLabel}>When</Text>
            <Text style={detailValue}>{scheduledDate} at {scheduledTime}</Text>
          </Section>

          {objectives && objectives.length > 0 && (
            <>
              <Text style={text}>
                <strong>Your objectives for this interview:</strong>
              </Text>
              <ul>
                {objectives.map((obj, i) => (
                  <li key={i} style={text}>{obj}</li>
                ))}
              </ul>
            </>
          )}

          <Hr style={hr} />

          <Text style={text}>
            Good luck! You&apos;ve got this.
          </Text>

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
  backgroundColor: "#f8fafc",
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
