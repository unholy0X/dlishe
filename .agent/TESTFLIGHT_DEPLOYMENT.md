# DishFlow - TestFlight Deployment Guide

## Prerequisites

### 1. Apple Developer Account
- **Required**: Paid Apple Developer Program membership ($99/year)
- Sign up at: https://developer.apple.com/programs/
- Verify your account is active

### 2. Development Tools
- Xcode installed (latest version)
- EAS CLI installed globally
- Valid Apple ID with 2FA enabled

## Step-by-Step Deployment

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```
Enter your Expo account credentials.

### Step 3: Configure EAS Build

Create `eas.json` in project root:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

### Step 4: Update app.json

Ensure your `app.json` has proper iOS configuration:
```json
{
  "expo": {
    "name": "DishFlow",
    "slug": "dishflow",
    "version": "2.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.dishflow",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "DishFlow needs camera access to scan ingredients and barcodes.",
        "NSPhotoLibraryUsageDescription": "DishFlow needs photo library access to save recipe images."
      }
    }
  }
}
```

### Step 5: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com/
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: DishFlow
   - **Primary Language**: English
   - **Bundle ID**: Create new (com.yourcompany.dishflow)
   - **SKU**: dishflow-001
   - **User Access**: Full Access

### Step 6: Configure App Information

In App Store Connect:
1. **App Information**:
   - Category: Food & Drink
   - Subcategory: Recipe/Cooking
   - Content Rights: Check if applicable

2. **Pricing and Availability**:
   - Price: Free
   - Availability: All countries (or select specific)

### Step 7: Build for TestFlight

```bash
# First build (will prompt for credentials)
eas build --platform ios --profile production

# Follow prompts:
# - Generate new credentials? Yes
# - Apple ID: your-apple-id@example.com
# - Password: (use app-specific password)
# - Team ID: (select your team)
```

**Note**: For app-specific password:
1. Go to https://appleid.apple.com/
2. Sign in → Security → App-Specific Passwords
3. Generate new password
4. Use this password (not your Apple ID password)

### Step 8: Wait for Build

Build process takes 10-20 minutes. Monitor progress:
```bash
# Check build status
eas build:list
```

You'll receive an email when build completes.

### Step 9: Submit to TestFlight

```bash
# Automatic submission
eas submit --platform ios --latest

# Or manual submission:
# 1. Download .ipa from EAS dashboard
# 2. Upload via Transporter app
# 3. Or use Application Loader
```

### Step 10: Configure TestFlight

In App Store Connect → TestFlight:

1. **Test Information**:
   - Beta App Description
   - Feedback Email
   - Marketing URL (optional)
   - Privacy Policy URL (if collecting data)

2. **Export Compliance**:
   - Does your app use encryption? → Yes (HTTPS)
   - Is it exempt from regulations? → Yes (standard encryption)

3. **Add Testers**:
   - **Internal Testing**: Add up to 100 Apple Developer team members
   - **External Testing**: Add up to 10,000 external testers
   - Groups: Create groups for organized testing

### Step 11: Invite Testers

**Internal Testers** (immediate access):
```
1. Go to TestFlight → Internal Testing
2. Click "+" to add testers
3. Enter email addresses
4. Testers receive invitation immediately
```

**External Testers** (requires review):
```
1. Go to TestFlight → External Testing
2. Create a new group
3. Add testers to group
4. Submit for Beta App Review (1-2 days)
5. Once approved, testers can install
```

### Step 12: Testers Install App

Testers receive email with instructions:
1. Install TestFlight app from App Store
2. Tap invitation link
3. Accept invitation
4. Install DishFlow
5. Provide feedback via TestFlight

## Updating Your TestFlight Build

### Increment Version/Build Number

In `app.json`:
```json
{
  "expo": {
    "version": "2.0.1",  // Increment version
    "ios": {
      "buildNumber": "2"  // Increment build number
    }
  }
}
```

### Build and Submit Update

```bash
# Build new version
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest
```

Updates are available to testers within 1-2 hours.

## Common Issues & Solutions

### Issue: "No valid code signing identity found"
**Solution**: 
```bash
eas credentials
# Select iOS → Production → Manage credentials → Remove all
# Then rebuild - EAS will generate new credentials
```

### Issue: "Bundle identifier is already in use"
**Solution**: Choose a unique bundle ID in app.json

### Issue: "App-specific password required"
**Solution**: Generate at appleid.apple.com → Security → App-Specific Passwords

### Issue: "Missing compliance information"
**Solution**: In App Store Connect → TestFlight → Export Compliance → Answer questions

### Issue: Build fails with "Archive not found"
**Solution**: 
```bash
# Clear EAS cache
eas build:cancel --all
eas build --platform ios --profile production --clear-cache
```

## Testing Checklist

Before submitting to TestFlight:
- [ ] Test on iOS simulator
- [ ] Verify all features work
- [ ] Check camera/photo permissions
- [ ] Test offline functionality
- [ ] Verify database migrations
- [ ] Test on different screen sizes
- [ ] Check app icon displays correctly
- [ ] Verify splash screen
- [ ] Test deep linking (if applicable)

## Production Release (After TestFlight)

Once testing is complete:

1. **Prepare App Store Listing**:
   - Screenshots (6.5" and 5.5" displays)
   - App Preview video (optional)
   - Description (4000 chars max)
   - Keywords
   - Support URL
   - Privacy Policy URL

2. **Submit for Review**:
   ```bash
   # Build production version
   eas build --platform ios --profile production
   
   # In App Store Connect:
   # 1. Add build to version
   # 2. Complete all required fields
   # 3. Submit for review
   ```

3. **Review Process**:
   - Takes 1-3 days typically
   - Respond to any rejection feedback
   - Resubmit if needed

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view [build-id]

# Cancel build
eas build:cancel [build-id]

# Manage credentials
eas credentials

# View project info
eas project:info

# Check for updates
eas update

# View submissions
eas submit:list
```

## Resources

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **TestFlight Guide**: https://developer.apple.com/testflight/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Expo Forums**: https://forums.expo.dev/

## Quick Start (TL;DR)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Configure project
eas build:configure

# 4. Build for iOS
eas build --platform ios --profile production

# 5. Submit to TestFlight
eas submit --platform ios --latest

# 6. Add testers in App Store Connect
# 7. Testers install via TestFlight app
```

---

**Estimated Timeline**:
- Setup: 30 minutes
- First build: 20 minutes
- TestFlight processing: 1-2 hours
- Beta review (external): 1-2 days
- Total: ~1 day for internal testing, ~3 days for external testing

**Cost**:
- Apple Developer Program: $99/year
- EAS Build: Free tier (limited builds) or $29/month (unlimited)
