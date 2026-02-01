import { Icons } from '../components/Icons';
import './LegalPage.css';

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <a href="/" className="legal-logo">
          <Icons.LogoGlow size={32} />
          <span>Poofpop</span>
        </a>
      </nav>

      <main className="legal-content">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: January 30, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Poofpop ("Service"), you agree to be bound by these Terms of Service 
            ("Terms"). If you disagree with any part of these terms, you may not access the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            Poofpop is an AI-powered video processing platform that provides:
          </p>
          <ul>
            <li>Automatic watermark detection and removal</li>
            <li>Object removal from videos</li>
            <li>Video processing and enhancement</li>
          </ul>
          <p>
            The Service is provided on a credit-based system. Users receive free credits upon 
            registration and can purchase additional credits as needed.
          </p>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <p>
            To use certain features of the Service, you must create an account. You are responsible for:
          </p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use</li>
          </ul>
          <p>
            We reserve the right to terminate accounts that violate these Terms.
          </p>
        </section>

        <section>
          <h2>4. Acceptable Use</h2>
          <p>You agree NOT to use the Service to:</p>
          <ul>
            <li>Process content you do not have rights to modify</li>
            <li>Remove watermarks or copyright notices from content you don't own</li>
            <li>Create, distribute, or store illegal content</li>
            <li>Infringe on any intellectual property rights</li>
            <li>Distribute malware or harmful code</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Use automated tools to abuse the Service</li>
            <li>Resell or redistribute the Service without authorization</li>
          </ul>
        </section>

        <section>
          <h2>5. Content Ownership</h2>
          <p>
            <strong>Your Content:</strong> You retain all rights to the videos you upload. By using 
            the Service, you grant us a temporary, limited license to process your content solely 
            for the purpose of providing the Service.
          </p>
          <p>
            <strong>Processed Output:</strong> The processed videos belong to you. We do not claim 
            any ownership over your processed content.
          </p>
          <p>
            <strong>Responsibility:</strong> You are solely responsible for ensuring you have the 
            necessary rights to process any content uploaded to our Service.
          </p>
        </section>

        <section>
          <h2>6. Credits and Payments</h2>
          <p>
            <strong>Free Credits:</strong> New users receive 5 free credits upon registration.
          </p>
          <p>
            <strong>Purchased Credits:</strong> Additional credits can be purchased through our 
            payment partner (Gumroad). Credits never expire.
          </p>
          <p>
            <strong>Credit Usage:</strong> Each video processing job consumes credits based on 
            the task type and video characteristics.
          </p>
          <p>
            <strong>No Refunds:</strong> Credits are non-refundable except where required by law 
            or at our sole discretion.
          </p>
        </section>

        <section>
          <h2>7. Service Availability</h2>
          <p>
            We strive to maintain high availability but do not guarantee uninterrupted access. 
            The Service may be temporarily unavailable due to:
          </p>
          <ul>
            <li>Scheduled maintenance</li>
            <li>System updates and improvements</li>
            <li>Unexpected technical issues</li>
            <li>Circumstances beyond our control</li>
          </ul>
        </section>

        <section>
          <h2>8. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
          </p>
          <ul>
            <li>
              The Service is provided "AS IS" without warranties of any kind, express or implied.
            </li>
            <li>
              We are not liable for any indirect, incidental, special, consequential, or punitive 
              damages arising from your use of the Service.
            </li>
            <li>
              Our total liability shall not exceed the amount you paid for the Service in the 
              12 months preceding the claim.
            </li>
          </ul>
        </section>

        <section>
          <h2>9. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Poofpop and its affiliates from any claims, 
            damages, losses, or expenses arising from:
          </p>
          <ul>
            <li>Your violation of these Terms</li>
            <li>Your content or use of the Service</li>
            <li>Your violation of any third-party rights</li>
          </ul>
        </section>

        <section>
          <h2>10. Intellectual Property</h2>
          <p>
            The Service, including its original content, features, and functionality, is owned 
            by Poofpop and is protected by international copyright, trademark, and other 
            intellectual property laws.
          </p>
        </section>

        <section>
          <h2>11. Termination</h2>
          <p>
            We may terminate or suspend your access to the Service immediately, without prior 
            notice, for any reason, including breach of these Terms. Upon termination:
          </p>
          <ul>
            <li>Your right to use the Service ceases immediately</li>
            <li>Unused credits may be forfeited</li>
            <li>We may delete your account data</li>
          </ul>
        </section>

        <section>
          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will provide notice of 
            significant changes by posting the updated Terms on this page. Your continued use 
            of the Service after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the 
            jurisdiction in which Poofpop operates, without regard to conflict of law provisions.
          </p>
        </section>

        <section>
          <h2>14. Contact Information</h2>
          <p>
            For questions about these Terms, please contact us:
          </p>
          <ul>
            <li>Email: <a href="mailto:legal@poofpop.com">legal@poofpop.com</a></li>
            <li>Website: <a href="https://poofpop.com">poofpop.com</a></li>
          </ul>
        </section>
      </main>

      <footer className="legal-footer">
        <p>&copy; {new Date().getFullYear()} Poofpop. All rights reserved.</p>
        <div className="legal-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/">Back to Home</a>
        </div>
      </footer>
    </div>
  );
}
