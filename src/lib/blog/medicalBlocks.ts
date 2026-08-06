// Reusable medical content sections for the blog editor.
// Each block inserts semantic HTML that the article page styles.

export interface MedicalBlock {
  id: string;
  label: string;
  description: string;
  html: string;
}

const section = (heading: string, body: string) =>
  `<h2>${heading}</h2>${body}`;

export const MEDICAL_BLOCKS: MedicalBlock[] = [
  {
    id: "introduction",
    label: "Introduction",
    description: "Opening paragraph that frames the condition",
    html: section("Introduction", "<p>Briefly explain what this condition is and who it affects.</p>"),
  },
  {
    id: "symptoms",
    label: "Symptoms",
    description: "Signs a patient may notice",
    html: section(
      "Symptoms",
      "<ul><li>First common symptom</li><li>Second common symptom</li><li>Third common symptom</li></ul>",
    ),
  },
  {
    id: "causes",
    label: "Causes",
    description: "What leads to the condition",
    html: section("Causes", "<ul><li>Primary cause</li><li>Secondary cause</li></ul>"),
  },
  {
    id: "risk-factors",
    label: "Risk Factors",
    description: "Who is most at risk",
    html: section("Risk Factors", "<ul><li>Risk factor one</li><li>Risk factor two</li></ul>"),
  },
  {
    id: "diagnosis",
    label: "Diagnosis",
    description: "How the clinic identifies it",
    html: section("Diagnosis", "<p>Describe the examination, X-rays or tests used at the clinic.</p>"),
  },
  {
    id: "treatment",
    label: "Treatment",
    description: "Available treatment options",
    html: section(
      "Treatment Options",
      "<ol><li>First-line treatment</li><li>Alternative treatment</li><li>Advanced option</li></ol>",
    ),
  },
  {
    id: "prevention",
    label: "Prevention",
    description: "How patients can avoid it",
    html: section("Prevention", "<ul><li>Daily habit to adopt</li><li>Habit to avoid</li></ul>"),
  },
  {
    id: "home-care",
    label: "Home Care",
    description: "Self-care guidance",
    html: section("Home Care", "<p>Safe steps a patient can take at home before or after treatment.</p>"),
  },
  {
    id: "recovery",
    label: "Recovery",
    description: "What to expect afterwards",
    html: section("Recovery", "<p>Typical healing timeline and what is normal during recovery.</p>"),
  },
  {
    id: "when-to-visit",
    label: "When To Visit A Dentist",
    description: "Clear escalation guidance",
    html: section(
      "When To Visit A Dentist",
      "<p>See a dentist promptly if you notice any of the following:</p><ul><li>Pain lasting more than two days</li><li>Swelling of the face or gums</li><li>Bleeding that does not stop</li></ul>",
    ),
  },
  {
    id: "expert-tips",
    label: "Expert Tips",
    description: "Highlighted clinician advice",
    html: `<div class="blog-callout blog-callout-tip"><p class="blog-callout-title">Expert Tip</p><p>Share a practical tip from the clinical team.</p></div>`,
  },
  {
    id: "warning",
    label: "Warning Box",
    description: "Cautionary highlighted box",
    html: `<div class="blog-callout blog-callout-warning"><p class="blog-callout-title">Important</p><p>Describe what patients should avoid doing.</p></div>`,
  },
  {
    id: "emergency",
    label: "Emergency Information",
    description: "Urgent contact box",
    html: `<div class="blog-callout blog-callout-emergency"><p class="blog-callout-title">Dental Emergency?</p><p>Call Muhazi Dental Clinic on <a href="tel:+250787630399">+250 787 630 399</a>. We are open every day from 8:00 AM to 8:00 PM.</p></div>`,
  },
  {
    id: "faq",
    label: "FAQs",
    description: "Question and answer section",
    html: section(
      "Frequently Asked Questions",
      "<h3>First question?</h3><p>Answer to the first question.</p><h3>Second question?</h3><p>Answer to the second question.</p>",
    ),
  },
  {
    id: "references",
    label: "Medical References",
    description: "Source list for trust signals",
    html: section(
      "Medical References",
      '<ol><li>Source name — <a href="https://example.org" rel="nofollow noopener" target="_blank">link</a></li></ol>',
    ),
  },
  {
    id: "cta",
    label: "Appointment CTA",
    description: "Booking call-to-action block",
    html: `<div class="blog-cta"><p class="blog-cta-title">Book your dental appointment</p><p>Our team in Rwamagana is available every day, 8:00 AM – 8:00 PM.</p><p><a class="blog-cta-button" href="/book">Book an appointment</a></p></div>`,
  },
];

export const CALLOUT_VARIANTS = [
  { id: "info", label: "Info", className: "blog-callout-info", title: "Good to know" },
  { id: "tip", label: "Tip", className: "blog-callout-tip", title: "Expert Tip" },
  { id: "warning", label: "Warning", className: "blog-callout-warning", title: "Important" },
  { id: "emergency", label: "Emergency", className: "blog-callout-emergency", title: "Dental Emergency?" },
] as const;

export function calloutHtml(variant: string, title: string, body: string) {
  return `<div class="blog-callout ${variant}"><p class="blog-callout-title">${title}</p><p>${body}</p></div>`;
}
