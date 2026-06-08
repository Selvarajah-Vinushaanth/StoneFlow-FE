export const metadata = { title: 'Privacy Policy — Stone Co' };

export default function PrivacyPolicy() {
  return (
    <div className="h-screen w-full overflow-y-auto bg-white text-gray-900">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Stone Co Sdn Bhd · Last updated: June 2026</p>
        </div>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">1. Introduction</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Stone Co Sdn Bhd (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates a factory workflow management
            system that coordinates production jobs and notifies our workers via the WhatsApp Business Cloud API
            provided by Meta Platforms, Inc. This Privacy Policy explains how we collect, use, store, and protect
            personal data when our team members communicate with the system via WhatsApp.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">2. Data We Collect</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            When a worker or supervisor uses our WhatsApp workflow service, we collect:
          </p>
          <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1">
            <li>Name, role, and WhatsApp phone number</li>
            <li>Preferred language</li>
            <li>Job and task assignments, status updates, and timestamps</li>
            <li>Messages exchanged with the system (e.g. DONE, ISSUE, HELP replies)</li>
            <li>Issue reports and help requests submitted during a task</li>
          </ul>
          <p className="text-sm text-gray-600 leading-relaxed mt-2">
            This is an internal operational tool. We do <strong>not</strong> use it to collect data from the general
            public or customers.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">3. How We Use Your Data</h2>
          <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1">
            <li>To assign work and notify the responsible team member of their tasks</li>
            <li>To track task progress, timers, and completion across a job</li>
            <li>To route issue reports and help requests to the relevant supervisor or admin</li>
            <li>To maintain an audit trail of workflow activity for operational accountability</li>
          </ul>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">4. WhatsApp Business Cloud API</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We use the WhatsApp Business Cloud API to send and receive messages. Messages are transmitted through
            Meta&apos;s infrastructure in accordance with Meta&apos;s own Privacy Policy and the WhatsApp Business Terms.
            By messaging the system on WhatsApp, you acknowledge that Meta processes message data as described in their
            policies. We store only what is necessary for workflow management in our own secure database.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">5. Data Sharing</h2>
          <p className="text-sm text-gray-600 leading-relaxed">We do not sell personal data. We only share data with:</p>
          <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1 mt-2">
            <li>Meta Platforms, Inc. — as required to deliver WhatsApp messages</li>
            <li>Our authorised management and supervisory staff — for workflow coordination</li>
            <li>Authorities — if required by Malaysian law</li>
          </ul>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">6. Data Retention</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Message and workflow data is retained for as long as necessary for operational and record-keeping
            purposes. You may request deletion of your personal data at any time by contacting your administrator.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">7. Data Security</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Data is stored in an access-controlled database. We apply appropriate technical and organisational
            measures to protect personal data against unauthorised access, disclosure, or loss.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">8. Your Rights (PDPA Malaysia)</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Under Malaysia&apos;s Personal Data Protection Act 2010 (PDPA), you have the right to access and correct
            your personal data, request its deletion, and withdraw consent for processing. To exercise these rights,
            contact your administrator.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">9. Changes to This Policy</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We may update this Privacy Policy from time to time. The latest version will always be available at this URL.
          </p>
        </section>

        <section className="mb-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">10. Contact Us</h2>
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
