"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth, useFirestore, requestPermission, updateDocumentNonBlocking } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { doc, GeoPoint } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BellRing, MapPin, Camera, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileImageCropper } from "@/components/profile-image-cropper";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useNotificationPermission } from "@/hooks/use-notification-permission";
import { NotificationPermissionAlert } from "@/components/notification-permission-alert";


export default function SettingsPage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const { permission: notificationPermission } = useNotificationPermission();


  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setBio(user.bio || "Loves hiking and photography.");
    }
  }, [user]);

  const handleSaveChanges = async () => {
    if (!user || !auth.currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save changes.",
      });
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name });

      const userRef = doc(firestore, "users", user.uid);
      updateDocumentNonBlocking(userRef, { name: name, bio: bio });

      toast({
        title: "Success!",
        description: "Your profile has been updated.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not save your profile. Please try again.",
      });
    } finally {
        setIsSaving(false);
    }
  };

  const handleUpdateLocation = () => {
    if (!user) return;
    setIsUpdatingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = new GeoPoint(latitude, longitude);
          const userRef = doc(firestore, "users", user.uid);
          updateDocumentNonBlocking(userRef, {
            coordinates: newLocation,
          });
          toast({
            title: "Location Updated",
            description: "Your location has been successfully updated.",
          });
          setIsUpdatingLocation(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            variant: "destructive",
            title: "Location Error",
            description: "Could not retrieve your location. Please check your browser settings.",
          });
          setIsUpdatingLocation(false);
        }
      );
    } else {
      toast({
        variant: "destructive",
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
      });
      setIsUpdatingLocation(false);
    }
  };

    const getInitials = (name?: string | null) => {
    if (!name) return "";
    const nameParts = name.split(" ");
    if (nameParts.length === 1 && nameParts[0].length > 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    return nameParts.map((part) => part[0]).join("").toUpperCase();
  };
  
  const handleAvatarSave = async (imageBlob: Blob) => {
    if (!user || !auth.currentUser) return;
    
    setIsUploading(true);
    
    try {
        const downloadURL = await uploadToCloudinary(imageBlob);

        await updateProfile(auth.currentUser, { photoURL: downloadURL });

        const userDocRef = doc(firestore, 'users', user.uid);
        updateDocumentNonBlocking(userDocRef, { profilePictureUrl: downloadURL });

        toast({
            title: "Avatar Updated!",
            description: "Your new profile picture has been saved.",
        });
        
        setAvatarKey(Date.now());
        setIsCropperOpen(false);

    } catch (error) {
        console.error("Error uploading avatar:", error);
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "Could not update your profile picture. Please try again."
        });
    } finally {
        setIsUploading(false);
    }
  };


  return (
    <div className="container mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              This is how others will see you on the site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
                <div className="relative group">
                    <Avatar className="h-24 w-24">
                        <AvatarImage key={avatarKey} src={user?.photoURL || ''} alt={user?.displayName || ''} />
                        <AvatarFallback className="text-3xl">
                            {getInitials(user?.displayName)}
                        </AvatarFallback>
                    </Avatar>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setIsCropperOpen(true)}
                    >
                        <Camera className="h-5 w-5" />
                    </Button>
                </div>
                 <ProfileImageCropper 
                    open={isCropperOpen}
                    onOpenChange={setIsCropperOpen}
                    onSave={handleAvatarSave}
                    isSaving={isUploading}
                 />
                <div className="flex-grow space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label>Location</Label>
                <p className="text-sm text-muted-foreground">
                  Update your location to get better suggestions.
                </p>
              </div>
              <Button onClick={handleUpdateLocation} variant="outline" disabled={isUpdatingLocation}>
                <MapPin className="mr-2 h-4 w-4" />
                {isUpdatingLocation ? "Updating..." : "Update Location"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select a theme for the application.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <NotificationPermissionAlert />
            {notificationPermission === 'granted' && (
                <div className="flex items-center space-x-2 text-green-600">
                    <BellRing className="h-5 w-5" />
                    <p className="font-medium">Broadcast notifications are enabled.</p>
                </div>
            )}
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <Label>PushAll Notifications</Label>
                <p className="text-sm text-muted-foreground">
                    Subscribe to our PushAll channel for more notification options.
                </p>
              </div>
              <Button asChild variant="outline">
                <a href="https://pushall.ru/?fs=5965" target="_blank" rel="noopener noreferrer">
                    <Bell className="mr-2 h-4 w-4" />
                    Subscribe
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
            <Button onClick={handleSaveChanges} disabled={isSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isSaving ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </div>
    </div>
  );
}
