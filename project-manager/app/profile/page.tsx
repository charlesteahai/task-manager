"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import Link from "next/link";

const { storage, db } = getFirebaseServices();

export default function ProfilePage() {
  const { user, handleAuthError, refreshUser } = useAuth();
  const { userProfile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDisplayNameUpdate = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName.trim()
      });

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim()
      });

      toast.success("Display name updated successfully!");
      refreshUser(); // Refresh user data to reflect changes
    } catch (error) {
      handleAuthError(error, "update-display-name");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user || !user.email) return;

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully!");
    } catch (error) {
      handleAuthError(error, "change-password");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB for Firebase Storage)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      // Try Firebase Storage first
      try {
        // Create a reference to the image in storage
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `${timestamp}.${fileExtension}`;
        const imageRef = ref(storage, `profile-pictures/${user.uid}/${fileName}`);
        
        // Upload the file with metadata
        const metadata = {
          contentType: file.type,
          customMetadata: {
            uploadedBy: user.uid,
            uploadedAt: timestamp.toString()
          }
        };
        
        console.log('Starting Firebase Storage upload...', { path: `profile-pictures/${user.uid}/${fileName}`, size: file.size });
        
        // Use resumable upload for better reliability
        const uploadTask = uploadBytesResumable(imageRef, file, metadata);
        
        // Wait for upload to complete
        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Upload is ' + progress + '% done');
            },
            (error) => {
              console.error('Firebase Storage upload failed:', error);
              reject(error);
            },
            () => {
              console.log('Firebase Storage upload completed successfully');
              resolve(uploadTask.snapshot);
            }
          );
        });
        
        // Get the download URL
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        console.log('Download URL obtained:', downloadURL);

        // Update Firebase Auth profile
        await updateProfile(user, {
          photoURL: downloadURL
        });

        // Update Firestore user document
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          photoURL: downloadURL,
          photoUpdatedAt: Date.now(),
          hasCustomPhoto: true,
          storageType: 'firebase-storage'
        });

        toast.success("Profile picture updated successfully using Firebase Storage!");
        refreshUser();
        
      } catch (storageError) {
        console.warn('Firebase Storage failed, falling back to base64:', storageError);
        
        // Fallback to base64 if Firebase Storage isn't set up
        if (file.size > 1 * 1024 * 1024) {
          toast.error("Firebase Storage not available. Please use images under 1MB or set up Firebase Storage.");
          return;
        }

        // Convert image to base64 as fallback
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        console.log('Using base64 fallback, size:', base64.length);

        // Store base64 image in Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          photoURL: base64,
          photoUpdatedAt: Date.now(),
          hasCustomPhoto: true,
          storageType: 'base64'
        });

        await updateProfile(user, {
          photoURL: null
        });

        toast.success("Profile picture updated using fallback storage. Consider setting up Firebase Storage for better performance.");
        refreshUser();
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error instanceof Error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        handleAuthError(error, "upload-profile-picture");
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Update display name when user profile data changes
  useEffect(() => {
    if (userProfile?.displayName !== undefined) {
      setDisplayName(userProfile.displayName || "");
    }
  }, [userProfile?.displayName]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need to be logged in to access this page.</p>
          <Link href="/login" className="text-blue-600 hover:text-blue-800">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Picture Section */}
          <Card>
                         <CardHeader>
               <CardTitle>Profile Picture</CardTitle>
               <CardDescription>
                 Upload a new profile picture. Supported formats: JPG, PNG, GIF (max 5MB)
                 <br />
                 <span className="text-blue-600 text-sm">Automatically uses Firebase Storage when available, falls back to compressed storage otherwise.</span>
               </CardDescription>
             </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={userProfile?.photoURL || user.photoURL || undefined} />
                    <AvatarFallback className="text-lg">
                      {userProfile?.displayName ? userProfile.displayName.charAt(0) : 
                       user.displayName ? user.displayName.charAt(0) : 
                       user.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={triggerFileInput}
                    disabled={uploadingImage}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <p className="font-medium">{userProfile?.displayName || user.displayName || "No display name"}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {uploadingImage && (
                <p className="text-sm text-blue-600">Uploading image...</p>
              )}
            </CardContent>
          </Card>

          {/* Display Name Section */}
          <Card>
            <CardHeader>
              <CardTitle>Display Name</CardTitle>
              <CardDescription>
                This is the name that will be displayed to other users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={handleDisplayNameUpdate}
                disabled={loading || displayName.trim() === (userProfile?.displayName || user.displayName || "")}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                Update Display Name
              </Button>
            </CardContent>
          </Card>

          {/* Password Change Section */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={handlePasswordChange}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your basic account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="text-sm text-gray-900 mt-1">{user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">User ID</Label>
                  <p className="text-sm text-gray-900 mt-1 font-mono text-xs">{user.uid}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Account Created</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Last Sign In</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 