
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Privacy Policy</CardTitle>
          <CardDescription>Last updated: July 29, 2024</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-muted-foreground">
          <p className="text-base text-foreground">
            Welcome to ConnectSphere. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
          </p>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">1. Information We Collect</h2>
            <p>
              We may collect information about you in a variety of ways. The information we may collect via the Application includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Application.
              </li>
              <li>
                <strong>Geolocation Information:</strong> We may request access or permission to and track location-based information from your mobile device, either continuously or while you are using the Application, to provide location-based services.
              </li>
              <li>
                <strong>Push Notifications:</strong> We may request to send you push notifications regarding your account or the Application. If you wish to opt-out from receiving these types of communications, you may turn them off in your device’s settings.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">2. Use of Your Information</h2>
            <p>
              Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create and manage your account.</li>
              <li>Email you regarding your account or order.</li>
              <li>Enable user-to-user communications.</li>
              <li>Generate a personal profile about you to make future visits to the Application more personalized.</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">3. Contact Us</h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact us at: privacy@connectsphere.app
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
