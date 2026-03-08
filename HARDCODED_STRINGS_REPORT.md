# Hardcoded Strings Report

This document lists all hardcoded English strings found in the codebase that should be translated using the `t()` function from react-i18next.

## Summary

| Category | Count |
|----------|-------|
| Text Components | 45+ |
| Alert Messages | 15+ |
| Placeholder Text | 5 |
| Modal/Header Titles | 20+ |
| Button Labels | 10+ |
| Other UI Text | 30+ |

---

## Detailed List

### 1. src/screens/AboutScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 21 | "Back" | `common.back` |
| 23 | "About Bonyad" | `about.title` |
| 29 | "Empowering Service Excellence" | `about.mainTitle` |
| 31-33 | "Bonyad bridges project owners..." | `about.description` |
| 37 | "What We Offer" | `about.whatWeOffer` |
| 40 | "Verified technicians with proven expertise" | `about.features.verifiedTechnicians` |
| 44 | "Wide coverage across home, commercial, and industrial services" | `about.features.wideCoverage` |
| 48 | "Real-time project tracking and transparent communication" | `about.features.realTimeTracking` |
| 52 | "AI-powered assistance to scope, price, and plan projects" | `about.features.aiAssistance` |
| 57 | "Why Bonyad" | `about.whyBonyad` |
| 58-61 | "From quick fixes to complex builds..." | `about.whyBonyadDescription` |
| 66 | "Our Values" | `about.ourValues` |
| 68 | "Trust" | `about.values.trust` |
| 69 | "Every technician is vetted to ensure dependable results." | `about.values.trustDescription` |
| 72 | "Innovation" | `about.values.innovation` |
| 73 | "We integrate AI experiences to speed up every step." | `about.values.innovationDescription` |
| 76 | "Community" | `about.values.community` |
| 77 | "We uplift technicians and empower customers to build confidently." | `about.values.communityDescription` |

### 2. src/screens/ContactScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 32 | "Back" | `common.back` |
| 34 | "Contact Us" | `contact.title` |
| 40 | "We're here to help" | `contact.mainTitle` |
| 41-43 | "Reach out to the Bonyad team..." | `contact.subtitle` |
| 47 | "Email" | `contact.emailLabel` |
| 55 | "Phone" | `contact.phoneLabel` |
| 63 | "Our Offices" | `contact.officesLabel` |
| 67 | "Riyadh Headquarters" | `contact.riyadhOffice` |
| 68-69 | "King Fahd Road, Financial District..." | `contact.riyadhAddress` |
| 77 | "Jeddah Office" | `contact.jeddahOffice` |
| 78-79 | "Prince Sultan Street..." | `contact.jeddahAddress` |
| 86 | "Business Hours" | `contact.businessHoursLabel` |
| 87-88 | "Sunday - Thursday..." | `contact.businessHours` |
| 90-91 | "Our team will respond within 24 hours..." | `contact.responseNote` |

### 3. src/screens/IntroToAppScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 17 | "Bonyad App Introduction - Part 1" | `intro.videoTitles.part1` |
| 21 | "Bonyad App Introduction - Part 2" | `intro.videoTitles.part2` |
| 25 | "Bonyad App Introduction - Part 3" | `intro.videoTitles.part3` |
| 29 | "Bonyad App Introduction - Part 4" | `intro.videoTitles.part4` |
| 33 | "Bonyad App Introduction - Part 5" | `intro.videoTitles.part5` |
| 37 | "Bonyad App Introduction - Part 6" | `intro.videoTitles.part6` |
| 41 | "Bonyad App Introduction - Part 7" | `intro.videoTitles.part7` |
| 99 | "Back" | `common.back` |
| 101 | "Intro to the App" | `intro.title` |
| 110 | "Learn About Bonyad" | `intro.learnTitle` |
| 111-113 | "Watch these videos to learn more about Bonyad..." | `intro.description` |

### 4. src/screens/OnboardingScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 29 | "Welcome to Bonyad" | `onboarding.welcome.title` |
| 30 | "Your trusted platform for home services..." | `onboarding.welcome.subtitle` |
| 37 | "Find Expert Technicians" | `onboarding.findTechnicians.title` |
| 38 | "Browse verified professionals, compare bids..." | `onboarding.findTechnicians.subtitle` |
| 45 | "Let's Get Started!" | `onboarding.getStarted.title` |
| 46 | "Join thousands of homeowners and technicians..." | `onboarding.getStarted.subtitle` |
| 53 | "Next" | `common.next` |
| 60 | "Skip" | `common.skip` |
| 67 | "Get Started" | `common.getStarted` |

### 5. src/screens/OverviewScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 369 | "Loading assets..." | `common.loadingAssets` |
| 739 | "Top Rated Technicians" | `home.topRatedTechnicians` |
| 741 | "See All" | `common.seeAll` |
| 791 | "Our Coverage Areas" | `home.coverageAreas` |
| 820 | "Available Projects" | `home.availableProjects` |
| 853 | "App Screenshots" | `home.appScreenshots` |
| 959 | "Download the Bonyad App" | `download.title` |
| 961 | "One App for Both Users and Technicians" | `download.subtitle` |
| 964-966 | "Whether you're a homeowner looking for skilled professionals..." | `download.description` |
| 974 | "Available on" | `download.availableOn` |
| 975 | "iOS" | `download.ios` |
| 984 | "Available on" | `download.availableOn` |
| 985 | "Android" | `download.android` |
| 997-998 | "Connecting skilled technicians with homeowners..." | `footer.description` |
| 1004 | "Quick Links" | `footer.quickLinks` |
| 1021 | "Contact Us" | `footer.contactUs` |
| 1025 | "King Fahd Road, Olaya..." | `footer.address` |
| 1031 | "info@bonyad.com" | `footer.email` |
| 1037 | "+966 11 123 4567" | `footer.phone` |
| 1044 | "Need Help?" | `footer.needHelp` |
| 1050 | "Get Support" | `footer.getSupport` |
| 1092 | "Chat Support" | `support.chatSupport` |

### 6. src/screens/home/UserHomeScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 237 | "Services" | `home.services` |
| 347 | "My Projects" | `home.myProjects` |
| 360 | "No projects yet" | `home.noProjects` |
| 364 | "My Task Requests" | `home.myTaskRequests` |
| 382 | "Premium Subscripti..." | `premium.title` |
| 383 | "Get 3 months FREE" | `premium.offerSubtitle` |
| 385 | "Unlock unlimited bids and priority..." | `premium.description` |
| 389 | "50% OFF" | `premium.discount` |
| 394 | "Upgrade Now" | `premium.upgradeNow` |

### 7. src/screens/home/TechnicalHomeScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 167 | "Showcase your work" | `portfolio.showcaseWork` |
| 204 | "Design Services (A..." | `projects.designServices` |
| 227 | "Design Services (A..." | `projects.designServices` |
| 250 | "Desi..." | `projects.designShort` |
| 253 | "CON..." | `status.contracted` |
| 273 | "Tendered Projects" | `projects.tenderedProjects` |
| 285 | "Direct" | `projects.direct` |
| 305 | "Bidded Projects" | `projects.biddedProjects` |
| 317 | "My Small Tasks" | `tasks.mySmallTasks` |
| 332 | "Refer & Earn" | `referral.title` |
| 335 | "Invite friends and earn cash rewards" | `referral.description` |

### 8. src/components/LocationPicker.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 577 | "Select Location" | `location.selectTitle` |
| 601 | "Search Results" | `location.searchResults` |
| 735 | "Cancel" | `common.cancel` |
| 741 | "Confirm" | `common.confirm` |

### 9. src/screens/RoomVisualizerScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 283 | "Download Image" | `roomVisualizer.downloadImage` |
| 294 | "AI Image Generation" | `roomVisualizer.aiGeneration` |
| 300 | "Powered by Stability.ai" | `roomVisualizer.poweredBy` |

### 10. src/components/Footer.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 132-134 | "Connecting clients with trusted service providers..." | `footer.description` |
| 142 | "support@Bonyad.com" | `footer.supportEmail` |
| 150 | "+1 (555) 123-4567" | `footer.supportPhone` |
| 157 | "123 Service Street, CA 90210" | `footer.address` |

### 11. src/components/IconExamples.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 28 | "Available Icon Libraries" | `icons.title` |
| 32 | "Ionicons (iOS-style)" | `icons.libraries.ionicons` |
| 46 | "Material Icons" | `icons.libraries.material` |
| 60 | "Material Community Icons" | `icons.libraries.materialCommunity` |
| 74 | "FontAwesome 5" | `icons.libraries.fontAwesome` |
| 88 | "Feather (Clean & Simple)" | `icons.libraries.feather` |
| 102 | "AntDesign" | `icons.libraries.antDesign` |
| 116 | "Entypo" | `icons.libraries.entypo` |
| 130 | "Simple Line Icons" | `icons.libraries.simpleLine` |
| 144 | "Browse all icons at: https://icons.expo.fyi/" | `icons.footer` |

### 12. src/screens/SignupScreenOld.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 46 | "OK" | `common.ok` |
| 203 | "Error" (Alert title) | `common.error` |
| 208 | "Error" (Alert title) | `common.error` |
| 213 | "Error" (Alert title) | `common.error` |
| 219 | "Error" (Alert title) | `common.error` |
| 224 | "Error" (Alert title) | `common.error` |
| 252 | "Error" (Alert title) | `common.error` |
| 300 | "Error" (Alert title) | `common.error` |
| 358 | "Error" (Alert title) | `common.error` |
| 364 | "Coming Soon" | `common.comingSoon` |
| 364 | "Google Sign-Up" | `auth.googleSignUp` |
| 754 | "Twitter signup" | `auth.twitterSignup` |

### 13. src/screens/NotificationsScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 192 | "Error" (Alert title) | `common.error` |
| 192 | "Failed to mark notification as read" | `notifications.markReadError` |
| 201 | "Error" (Alert title) | `common.error` |
| 201 | "Not authenticated" | `auth.notAuthenticated` |
| 239 | "Error" (Alert title) | `common.error` |
| 239 | "Failed to mark all notifications as read" | `notifications.markAllReadError` |

### 14. src/screens/TechnicianOnboardingScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 581 | "09:00" (placeholder) | `onboarding.placeholders.startTime` |
| 598 | "17:00" (placeholder) | `onboarding.placeholders.endTime` |
| 783 | "SAR {plan.finalPrice}" | `subscription.priceSar` |
| 785 | "SAR {plan.price}" | `subscription.originalPriceSar` |

### 15. src/screens/BidFormModal.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 132 | "No auth token found" | `auth.noToken` |
| 269 | "SAR" | `currency.sar` |

### 16. src/screens/ChangePhoneScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 251 | "5XXXXXXXX" (placeholder) | `phone.placeholder` |

### 17. src/screens/SubscriptionScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 355 | "SAR {subscriptionPrice}" | `subscription.priceSar` |
| 489 | "SAR {priceValue}" | `subscription.priceSar` |
| 490 | "/month" | `subscription.perMonth` |

### 18. src/screens/CommissionPaymentScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 140 | "SAR" | `currency.sar` |

### 19. src/screens/ProjectDetailModal.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 459 | "SAR" | `currency.sar` |

### 20. src/components/ColorPicker.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 137 | "#00549B" (placeholder) | `colorPicker.placeholder` |

### 21. src/components/PhaseManagementModal.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 430 | "0" (placeholder) | `phases.placeholderZero` |
| 456 | "0.00" (placeholder) | `phases.placeholderAmount` |

### 22. src/screens/UserProjectProgressPage.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 122 | "Pay {{amount}} SAR for Phase {{number}}?" | `payment.payPhaseConfirmation` |
| 304 | "{formatBudget(phase.moneySpent)} SAR" | `payment.amountSar` |
| 343 | "Pay {formatBudget(phase.moneySpent)} SAR" | `payment.payAmountSar` |

### 23. src/components/SmallTaskBidFormModal.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 250 | "Your Bid Amount (SAR)" | `bids.yourBidAmountSar` |

### 24. src/screens/UserPhaseViewPage.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 150 | "No phases planned yet" | `phases.noPhasesPlanned` |

### 25. src/screens/ApprovedProjectScreen.tsx

| Line | Hardcoded String | Suggested Translation Key |
|------|------------------|---------------------------|
| 433 | "Describe the changes you would like..." | `feedback.modificationPlaceholder` |

---

## Files Missing Translation Imports

The following files are using hardcoded strings and also missing the `useTranslation` hook import:

1. `src/screens/AboutScreen.tsx` - Missing `useTranslation` import
2. `src/screens/ContactScreen.tsx` - Missing `useTranslation` import
3. `src/screens/IntroToAppScreen.tsx` - Missing `useTranslation` import
4. `src/screens/OverviewScreen.tsx` - Has `useTranslation` but many hardcoded strings
5. `src/components/Footer.tsx` - Has `useTranslation` but some hardcoded strings
6. `src/components/IconExamples.tsx` - Missing `useTranslation` import
7. `src/components/LocationPicker.tsx` - Has `useTranslation` but some hardcoded strings

---

## Recommended Priority

### High Priority (User-facing screens)
1. `src/screens/AboutScreen.tsx` - Complete page content
2. `src/screens/ContactScreen.tsx` - Complete page content
3. `src/screens/IntroToAppScreen.tsx` - Complete page content
4. `src/screens/OnboardingScreen.tsx` - First-time user experience
5. `src/screens/OverviewScreen.tsx` - Landing page content

### Medium Priority (Home screens)
6. `src/screens/home/UserHomeScreen.tsx` - User dashboard
7. `src/screens/home/TechnicalHomeScreen.tsx` - Technician dashboard

### Low Priority (Components)
8. `src/components/LocationPicker.tsx` - Location selection modal
9. `src/components/Footer.tsx` - Footer component
10. `src/components/IconExamples.tsx` - Developer-only component (may not need translation)

---

## How to Fix

Example of fixing a hardcoded string:

**Before:**
```tsx
<Text style={styles.title}>About Bonyad</Text>
```

**After:**
```tsx
const { t } = useTranslation();
// ...
<Text style={styles.title}>{t('about.title')}</Text>
```

Add the translation key to your translation files (e.g., `en.json`, `ar.json`):

```json
{
  "about": {
    "title": "About Bonyad"
  }
}
```
