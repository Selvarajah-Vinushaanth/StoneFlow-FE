export const metadata = { title: 'Terms of Service — Stone Co' };

export default function TermsOfService() {
  return (
    <div className="h-screen w-full overflow-y-auto bg-white text-gray-900">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Terms of Service</h1>
          <p className="text-sm text-gray-500">Stone Co Sdn Bhd · Last updated: June 2026</p>
        </div>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">1. Acceptance of Terms</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            These Terms of Service govern the use of Stone Co Sdn Bhd&apos;s internal factory workflow management
            system and its associated WhatsApp messaging service. By using the system, you agree to these terms.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">2. Eligible Users</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            This is an internal tool intended solely for authorised Stone Co employees, contractors, and management.
            Access is provided by the administrator and may be revoked at any time. The service is not offered to the
            general public.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">3. The WhatsApp Service</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">Through the WhatsApp Business Cloud API, the system may:</p>
          <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1">
            <li>Notify you of tasks assigned to you and their time allocations</li>
            <li>Receive your status replies (e.g. DONE, ISSUE, HELP)</li>
            <li>Relay messages between workers and supervisors</li>
            <li>Send reminders when a task timer expires</li>
          </ul>
          <p className="text-sm text-gray-600 leading-relaxed mt-2">
            Standard WhatsApp and mobile carrier terms and charges may apply to your use of WhatsApp.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">4. Acceptable Use</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            You agree to use the system only for legitimate work purposes, to provide accurate status updates, and not
            to misuse, disrupt, or attempt unauthorised access to the service. Accounts and phone numbers must not be
            shared.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">5. Data &amp; Privacy</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your use of the service is also governed by our{' '}
            <a href="/privacy" className="text-amber-600 underline">
              Privacy Policy
            </a>
            , which explains how we handle personal data.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">6. Availability</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We aim to keep the service available but do not guarantee uninterrupted operation. Message delivery depends
            on Meta&apos;s WhatsApp platform and mobile networks, which are outside our control.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">7. Limitation of Liability</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            To the extent permitted by Malaysian law, Stone Co Sdn Bhd is not liable for indirect or consequential
            losses arising from use of, or inability to use, the service.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">8. Changes to These Terms</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We may update these Terms from time to time. The latest version will always be available at this URL.
          </p>
        </section>

        <section className="mb-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">9. Contact</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Stone Co Sdn Bhd
            <br />
            Email: support@stoneco.example
          </p>
        </section>
      </div>
    </div>
  );
}
