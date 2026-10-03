export const TEMPLATE_CATEGORIES = [
  { value: "marketing", label: "Marketing", color: "bg-blue-500" },
  { value: "newsletter", label: "Newsletter", color: "bg-green-500" },
  { value: "transactional", label: "Transactional", color: "bg-purple-500" },
  { value: "announcement", label: "Announcement", color: "bg-orange-500" },
  { value: "personal", label: "Personal", color: "bg-pink-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

export function getCategoryInfo(category?: string) {
  return TEMPLATE_CATEGORIES.find((c) => c.value === category) || TEMPLATE_CATEGORIES[5];
}

// Default templates that users can quickly add
export const DEFAULT_TEMPLATES = [
  {
    name: "Welcome Email",
    subject: "Welcome to {{company}}, {{name}}! 🎉",
    content: `<p>Hi {{name}},</p>
<p>Welcome aboard! We're thrilled to have you join us.</p>
<p>Here's what you can do next:</p>
<ul>
<li>Explore our features</li>
<li>Set up your profile</li>
<li>Connect with our community</li>
</ul>
<p>If you have any questions, just reply to this email — we're here to help!</p>
<p>Best regards,<br/>The {{company}} Team</p>`,
    category: "transactional",
    icon: "👋",
  },
  {
    name: "Thank You",
    subject: "Thank you, {{name}}!",
    content: `<p>Dear {{name}},</p>
<p>Thank you so much for your support! We truly appreciate it.</p>
<p>Your trust means the world to us, and we're committed to delivering the best experience possible.</p>
<p>Warm regards,<br/>{{sender_name}}</p>`,
    category: "personal",
    icon: "🙏",
  },
  {
    name: "Meeting Request",
    subject: "Meeting Request: {{topic}}",
    content: `<p>Hi {{name}},</p>
<p>I hope this email finds you well.</p>
<p>I'd like to schedule a meeting to discuss <strong>{{topic}}</strong>. Would any of the following times work for you?</p>
<ul>
<li>Option 1: {{date_option_1}}</li>
<li>Option 2: {{date_option_2}}</li>
</ul>
<p>Please let me know what works best for you, or suggest an alternative time.</p>
<p>Looking forward to connecting!</p>
<p>Best,<br/>{{sender_name}}</p>`,
    category: "personal",
    icon: "📅",
  },
  {
    name: "Event Invitation",
    subject: "You're Invited: {{event_name}}",
    content: `<p>Dear {{name}},</p>
<p>We're excited to invite you to <strong>{{event_name}}</strong>!</p>
<p><strong>📅 Date:</strong> {{event_date}}<br/>
<strong>🕐 Time:</strong> {{event_time}}<br/>
<strong>📍 Location:</strong> {{event_location}}</p>
<p>This is a great opportunity to {{event_benefit}}.</p>
<p>Please RSVP by {{rsvp_date}} to confirm your attendance.</p>
<p>We hope to see you there!</p>
<p>Best regards,<br/>{{organizer_name}}</p>`,
    category: "announcement",
    icon: "🎪",
  },
  {
    name: "Newsletter",
    subject: "{{newsletter_title}} - {{month}} Update",
    content: `<p>Hi {{name}},</p>
<p>Here's what's new this month:</p>
<h3>📰 Headlines</h3>
<p>{{headline_1}}</p>
<h3>✨ Featured</h3>
<p>{{featured_content}}</p>
<h3>📅 Upcoming</h3>
<p>{{upcoming_events}}</p>
<p>Thanks for being part of our community!</p>
<p>— The Team</p>`,
    category: "newsletter",
    icon: "📰",
  },
  {
    name: "Follow-up",
    subject: "Following up: {{topic}}",
    content: `<p>Hi {{name}},</p>
<p>I wanted to follow up on our previous conversation about <strong>{{topic}}</strong>.</p>
<p>Have you had a chance to think about it? I'd love to hear your thoughts or answer any questions you might have.</p>
<p>Looking forward to your response!</p>
<p>Best,<br/>{{sender_name}}</p>`,
    category: "personal",
    icon: "🔄",
  },
  {
    name: "Feedback Request",
    subject: "We'd love your feedback, {{name}}!",
    content: `<p>Hi {{name}},</p>
<p>We hope you've been enjoying {{product_or_service}}!</p>
<p>Your feedback is incredibly valuable to us. Would you take a moment to share your thoughts?</p>
<p><strong>Quick questions:</strong></p>
<ul>
<li>What do you like most?</li>
<li>What could we improve?</li>
<li>Would you recommend us to others?</li>
</ul>
<p>Simply reply to this email with your feedback — we read every response!</p>
<p>Thank you for your time,<br/>{{company}} Team</p>`,
    category: "marketing",
    icon: "💬",
  },
  {
    name: "Announcement",
    subject: "📢 Important Update: {{announcement_title}}",
    content: `<p>Dear {{name}},</p>
<p>We have some exciting news to share with you!</p>
<p><strong>{{announcement_title}}</strong></p>
<p>{{announcement_details}}</p>
<p><strong>What this means for you:</strong></p>
<ul>
<li>{{benefit_1}}</li>
<li>{{benefit_2}}</li>
<li>{{benefit_3}}</li>
</ul>
<p>If you have any questions, please don't hesitate to reach out.</p>
<p>Best regards,<br/>{{sender_name}}</p>`,
    category: "announcement",
    icon: "📢",
  },
  {
    name: "Certificate Delivery",
    subject: "🎓 Your Certificate: {{certificate_name}}",
    content: `<p>Dear {{name}},</p>
<p>Congratulations on completing <strong>{{course_or_event}}</strong>! 🎉</p>
<p>Please find your certificate attached to this email.</p>
<p>This is a well-deserved achievement, and we're proud of your accomplishment.</p>
<p>Keep up the great work!</p>
<p>Best wishes,<br/>{{organizer_name}}</p>`,
    category: "transactional",
    icon: "🎓",
  },
  {
    name: "Reminder",
    subject: "⏰ Reminder: {{reminder_subject}}",
    content: `<p>Hi {{name}},</p>
<p>This is a friendly reminder about <strong>{{reminder_subject}}</strong>.</p>
<p><strong>Details:</strong></p>
<ul>
<li>📅 Date: {{date}}</li>
<li>🕐 Time: {{time}}</li>
<li>📍 Location/Link: {{location}}</li>
</ul>
<p>Please make sure to {{action_required}}.</p>
<p>See you soon!</p>
<p>Best,<br/>{{sender_name}}</p>`,
    category: "transactional",
    icon: "⏰",
  },
];
