export const partner = {
  title: 'Partner with *RIVR*.',
  description: 'Tell RIVR Pro about you, your city and your venue. We read every enquiry ourselves and reply within two working days.',
  intro: 'Tell us about you, your city and your venue.',
  next: [
    { title: 'We read it', text: 'Every enquiry is read by the RIVR team, not a call centre.' },
    { title: 'We reply', text: 'Within two working days, by email or phone.' },
    { title: 'We meet', text: 'If it fits, a call and then a visit to your site.' },
  ],
  thanks: { title: 'Thank *you*.', text: 'Your enquiry is with us. We reply within two working days.' },
  notSent: { title: 'Not *sent*.', text: 'Your enquiry did not go through. Message us on WhatsApp, or go back and try again.' },
  fields: {
    name: 'Name', phone: 'Mobile', email: 'Email', city: 'City',
    offers: 'Interested in', venueStatus: 'Your venue', message: 'Anything else (optional)', submit: 'Send enquiry',
  },
  errors: {
    name: 'Enter your name.', phone: 'Enter a 10-digit Indian mobile number.', email: 'Enter a valid email address.',
    city: 'Enter your city.', offers: 'Choose at least one.', venueStatus: 'Choose one.', message: 'Keep it under 2,000 characters.',
  },
} as const;
