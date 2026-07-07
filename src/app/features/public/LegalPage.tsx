import { Link } from 'react-router';

type LegalSection = {
  title: string;
  body: string;
};

const termsSections: LegalSection[] = [
  {
    title: 'Use of WellnessConnect',
    body: 'WellnessConnect helps clients discover wellness services, complete intake flows, book sessions, and access care-related resources. You agree to provide accurate information and use the platform for lawful, personal wellness purposes.',
  },
  {
    title: 'Health and Safety',
    body: 'The platform supports counselling, fitness, and coaching workflows, but it is not a replacement for emergency care. If you are in immediate danger or experiencing a medical emergency, contact local emergency services right away.',
  },
  {
    title: 'Accounts and Bookings',
    body: 'You are responsible for keeping your login details secure. Session availability, practitioner assignment, cancellations, and rescheduling may depend on service policies, professional availability, and operational review.',
  },
  {
    title: 'Payments and Plans',
    body: 'Memberships, invoices, refunds, and payment rules will follow the plan terms shown during purchase or booking. Any billing disputes should be raised through support so the finance team can review them.',
  },
  {
    title: 'Platform Changes',
    body: 'We may update services, workflows, content, or these terms as the product evolves. Continued use of the platform means you accept the latest published terms.',
  },
];

const privacySections: LegalSection[] = [
  {
    title: 'Information We Collect',
    body: 'We collect account details, contact information, wellness goals, intake answers, booking details, consent records, and support interactions needed to provide the WellnessConnect service.',
  },
  {
    title: 'How We Use Information',
    body: 'We use your information to create your account, personalize intake flows, recommend appropriate services, manage bookings, support care coordination, improve the platform, and meet legal or safety obligations.',
  },
  {
    title: 'Care Team Access',
    body: 'Relevant counsellors, trainers, coaches, help desk, admin, legal, or finance team members may access information only when needed for service delivery, safety review, operations, or compliance.',
  },
  {
    title: 'Data Protection',
    body: 'We use role-based access, authentication, and operational controls to protect personal data. No system is perfect, so we continue improving safeguards as the platform grows.',
  },
  {
    title: 'Your Choices',
    body: 'You can request support for account updates, consent questions, or data concerns through the contact channels provided by WellnessConnect.',
  },
];

const pageCopy = {
  terms: {
    title: 'Terms of Service',
    intro: 'These terms explain the basic rules for using WellnessConnect.',
    sections: termsSections,
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'This policy explains how WellnessConnect handles personal and wellness-related information.',
    sections: privacySections,
  },
};

export default function LegalPage({ type }: { type: 'terms' | 'privacy' }) {
  const copy = pageCopy[type];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {import.meta.env.DEV && (
        <div className="mb-6 rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <strong>Development notice:</strong> These documents have not been reviewed by legal counsel.
          Replace with reviewed content before launch.
        </div>
      )}
      <div className="mb-8">
        <Link to="/get-started?step=5" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Back to get started
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{copy.intro}</p>
      </div>

      <div className="space-y-4">
        {copy.sections.map((section) => (
          <section key={section.title} className="border-t border-slate-200 py-5">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
