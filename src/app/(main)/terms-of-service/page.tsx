
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-3xl">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Terms of Service</CardTitle>
          <CardDescription>Last updated: July 29, 2024</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-muted-foreground">
          <p className="text-base text-foreground">
            Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the ConnectSphere application (the "Service") operated by us.
          </p>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">1. Accounts</h2>
            <p>
              When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">2. User Conduct</h2>
            <p>
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload, post, email, transmit, or otherwise make available any content that is unlawful, harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable.</li>
              <li>Harm minors in any way.</li>
              <li>Impersonate any person or entity.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">3. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">4. Changes</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect.
            </p>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">5. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at: terms@connectsphere.app
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
