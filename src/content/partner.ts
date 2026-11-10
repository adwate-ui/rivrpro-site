export const partner = {
  title: 'Partner with *RIVR*.',
  description: 'Tell us about you and your venue. We reply within two working days.',
  intro: 'Tell us about you and your venue.',
  next: [
    { title: 'We reply', text: 'Within two working days.' },
    { title: 'We talk', text: 'A call about your plans.' },
    { title: 'We visit', text: 'If it fits, we see your site.' },
  ],
  thanks: { title: 'Thank *you*.', text: 'We’ll reply within two working days.' },
  notSent: { title: 'Not *sent*.', text: 'Something went wrong. Try again, or message us on WhatsApp.' },
  fields: {
    name: 'Name', phone: 'Mobile', email: 'Email', city: 'City',
    offers: 'Interested in', venueStatus: 'Your venue', message: 'Message (optional)', submit: 'Send',
  },
  venues: { 'have-venue': 'I have a venue', looking: 'Looking for one', 'running-club': 'I run a club' },
  errors: {
    name: 'Enter your name.', phone: 'Enter a 10-digit mobile number.', email: 'Enter a valid email.',
    city: 'Enter your city.', offers: 'Pick at least one.', venueStatus: 'Pick one.', message: 'Keep it under 2,000 characters.',
  },
  status: {
    sending: 'Sending…',
    fields: 'Check the marked fields.',
    check: 'Check failed. Try again.',
    failed: 'Not sent. Message us on WhatsApp.',
    offline: 'Not sent. Check your connection.',
  },
} as const;
