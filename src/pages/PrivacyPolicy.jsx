import { Icons } from '../components/Icons';
import './LegalPage.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <a href="/" className="legal-logo">
          <Icons.LogoGlow size={32} />
          <span>Poofpop</span>
        </a>
      </nav>

      <main className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: January 30, 2026</p>

        <section>
          <h2>Introduction</h2>
          <p>
            Welcome to Poofpop ("we," "our," or "us"). We are committed to protecting your personal 
            information and your right to privacy. This Privacy Policy explains how we collect, use, 
            disclose, and safeguard your information when you use our AI-powered video processing service.
          </p>
        </section>

        <section>
          <h2>Information We Collect</h2>
          
          <h3>Account Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>Email address</li>
            <li>Password (stored securely using industry-standard hashing)</li>
            <li>Account preferences</li>
          </ul>

          <h3>Video Content</h3>
          <p>When you use our service, we temporarily process:</p>
          <ul>
            <li>Videos you upload for processing</li>
            <li>Processed output videos</li>
            <li>File metadata (size, format, duration)</li>
          </ul>

          <h3>Usage Information</h3>
          <p>We automatically collect:</p>
          <ul>
            <li>Device and browser information</li>
            <li>IP address</li>
            <li>Usage patterns and preferences</li>
            <li>Error logs for debugging</li>
          </ul>
        </section>

        <section>
          <h2>How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain our video processing services</li>
            <li>Process your transactions and manage your account</li>
            <li>Send you service-related communications</li>
            <li>Improve our services and develop new features</li>
            <li>Detect, prevent, and address technical issues</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2>Data Retention</h2>
          <p>
            <strong>Video Files:</strong> All uploaded videos and processed results are automatically 
            deleted from our servers within 24 hours of processing completion. We do not retain copies 
            of your video content.
          </p>
          <p>
            <strong>Account Data:</strong> We retain your account information for as long as your 
            account is active. You may request deletion of your account at any time.
          </p>
          <p>
            <strong>Usage Logs:</strong> We retain anonymized usage logs for up to 90 days for 
            service improvement purposes.
          </p>
        </section>

        <section>
          <h2>Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your information:
          </p>
          <ul>
            <li>HTTPS encryption for all data in transit</li>
            <li>Secure cloud storage with encryption at rest</li>
            <li>API key hashing using SHA-256</li>
            <li>Password hashing using PBKDF2</li>
            <li>Regular security audits and updates</li>
          </ul>
        </section>

        <section>
          <h2>Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Cloudflare:</strong> Content delivery and security</li>
            <li><strong>Gumroad:</strong> Payment processing</li>
            <li><strong>Sentry:</strong> Error tracking and monitoring</li>
          </ul>
          <p>
            Each of these services has their own privacy policy governing the use of your information.
          </p>
        </section>

        <section>
          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Opt out of marketing communications</li>
            <li>Export your data in a portable format</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:privacy@poofpop.com">privacy@poofpop.com</a>.
          </p>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            We use essential cookies to maintain your session and preferences. We do not use 
            third-party tracking cookies for advertising purposes.
          </p>
        </section>

        <section>
          <h2>Children's Privacy</h2>
          <p>
            Our service is not intended for children under 13 years of age. We do not knowingly 
            collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes 
            by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <ul>
            <li>Email: <a href="mailto:privacy@poofpop.com">privacy@poofpop.com</a></li>
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
