# IronIQ Development Roadmap

## Project Status

**Current Phase:** Phase 3 Complete ✅
**Next Phase:** Phase 4 (Edit & Finish Workflows)
**Target:** MVP Release

---

## Completed Phases

### ✅ Phase 0: Project Setup (Complete)
- [x] Initialize Expo project with TypeScript
- [x] Create folder structure
- [x] Install dependencies (with React 19.1.0 overrides)
- [x] Configure Firebase environment variables
- [x] Copy reusable code from Rork
- [x] Clean up legacy code

### ✅ Phase 1: Authentication (Complete)
- [x] Firebase service with React Native persistence
- [x] Auth Zustand store
- [x] Login/signup screens
- [x] Auth guards and navigation
- [x] Profile screen with preferences
- [x] Logout flow
- [x] **Tested:** Account creation, login, logout working perfectly

### ✅ Phase 2: Basic NFC Integration (Complete)
- [x] NFC service setup
- [x] Added `react-native-nfc-manager` plugin to app.json
- [x] NFC entitlements configuration
- [x] Basic NFC scan button on home screen
- [x] Read and parse CompactNFCPayload
- [x] Error handling for NFC operations
- [x] **Tested:** Successfully reading NFC tags from gym device

**Key Achievement:** Fixed iOS NFC initialization by adding the plugin to app.json

### ✅ Phase 3: Core Workout Flow (Complete)
**Goal:** Implement complete tap-in/tap-out workout tracking

**Components Built:**
- [x] Active session store (Zustand + AsyncStorage)
- [x] Workout service (session management logic)
- [x] Updated home screen with session states
- [x] Firestore integration for saving workouts
- [x] Error handling for edge cases

**Features Implemented:**
- [x] Tap-in: Start exercise session
- [x] Session active UI with elapsed time
- [x] Tap-out: Complete session and save to Firestore
- [x] Match session ID from tap-in with tap-out data
- [x] Extract and save sets/reps from NFC payload
- [x] Workout grouping (multiple exercises per workout)
- [x] Continue workout functionality
- [x] Active workout ID tracking

**Testing:**
- [x] Full tap-in/tap-out flow with real device
- [x] Session persists across app restart
- [x] Data saved correctly to Firestore
- [x] Error handling when session not found

**Key Achievements:**
- Implemented workout grouping system (stores/workout.ts)
- Created Continue Workout screen with active exercise list
- Added automatic workout creation and exercise grouping
- Session persistence with AsyncStorage hydration

---

## In Progress

No active development phase currently in progress.

---

## Upcoming Phases

### Phase 4: Edit & Finish Workflows (Post-MVP)
**Goal:** Allow users to modify workout data

**Features:**
- Manual set entry
- Edit sets during workout
- Edit completed workouts
- Delete workouts
- Add notes to workouts

**Priority:** Medium
**Estimated Effort:** 2-3 weeks

---

### Phase 5: Polish & Testing (Post-MVP)
**Goal:** Improve UX and add supporting features

**Features:**
- Workout history display
- Machine history ("last workout on this machine")
- Progress charts and analytics
- Workout calendar view
- Export workout data
- Improved error messages
- Loading states and animations

**Priority:** Medium
**Estimated Effort:** 2-3 weeks

---

## Post-MVP Features

### Advanced Session Management
**Description:** Handle edge cases and multiple sessions

**Features:**
- Multiple concurrent active sessions (different machines)
- Session timeout logic (auto-clear old sessions)
- Resume abandoned sessions
- Handle session ID not found gracefully
- Offline mode with sync

**Priority:** Low
**Estimated Effort:** 1-2 weeks

---

### Social & Sharing
**Description:** Share workouts and compete with friends

**Features:**
- Share workout to social media
- Friend system
- Leaderboards
- Workout challenges
- Group workouts

**Priority:** Low
**Estimated Effort:** 3-4 weeks

---

### Machine Management
**Description:** Admin features for gym equipment

**Features:**
- QR code generation for machines
- Machine registration flow
- Update machine info
- Machine maintenance tracking
- Usage analytics per machine

**Priority:** Low
**Estimated Effort:** 2 weeks

---

### Advanced Analytics
**Description:** Detailed progress tracking

**Features:**
- Volume progression charts
- PR (Personal Record) tracking
- Strength gain calculations
- Body part frequency heatmap
- Workout consistency tracking
- Goal setting and tracking

**Priority:** Medium
**Estimated Effort:** 2-3 weeks

---

### Platform Expansion

#### Android Support
- Test NFC on Android devices
- Android-specific UI adjustments
- Google Play Store submission

**Priority:** High (Post-MVP)
**Estimated Effort:** 1 week

#### Apple Watch Companion
- Watch app for quick session start/stop
- Workout summary on watch
- Heart rate integration

**Priority:** Low
**Estimated Effort:** 3-4 weeks

---

## Technical Debt & Improvements

### High Priority
- [ ] Remove debug console.logs from NFC service
- [ ] Add proper error boundaries
- [ ] Implement analytics/crash reporting
- [ ] Add unit tests for core services
- [ ] Improve TypeScript strict mode compliance

### Medium Priority
- [ ] Optimize Firestore queries with indexes
- [ ] Add offline support with React Query
- [ ] Implement proper loading states
- [ ] Add skeleton screens
- [ ] Optimize bundle size

### Low Priority
- [ ] Dark mode support
- [ ] Accessibility improvements
- [ ] Internationalization (i18n)
- [ ] Performance profiling and optimization

---

## MVP Release Checklist

### Features
- [x] User authentication
- [x] NFC scanning
- [x] Tap-in/tap-out workflow
- [x] Save workouts to Firestore
- [x] View active session
- [x] Workout grouping
- [x] Continue workout functionality
- [x] Basic error handling

### Polish
- [ ] App icon and splash screen
- [ ] Onboarding flow
- [ ] Help/tutorial screens
- [ ] Privacy policy & terms of service
- [ ] App store screenshots

### Testing
- [ ] Test on multiple iPhone models
- [ ] Test with multiple NFC devices
- [ ] Test offline behavior
- [ ] Test session persistence
- [ ] Beta testing with real users

### Deployment
- [ ] Production Firebase project
- [ ] Production build configuration
- [ ] App Store submission
- [ ] TestFlight beta distribution

**Target MVP Release:** TBD

---

## Known Issues & Blockers

### Current Issues
- None (Phase 2 complete and working!)

### Potential Blockers
- Need to test with multiple gym devices to ensure NFC format consistency
- May need to adjust session matching logic based on real-world usage
- Firestore structure may need optimization after initial usage data

---

## Decision Log

### Key Decisions Made
1. **Zustand over Context API** - Avoid instability issues from Rork
2. **AsyncStorage for active sessions** - Persist across app restarts
3. **Denormalized Firestore structure** - Fast reads, good for queries
4. **EAS Development Builds** - Required for NFC support
5. **React 19.1.0 with overrides** - Fix peer dependency conflicts
6. **Plugin configuration for NFC** - Critical for iOS NFC to work

### Decisions Pending
- Data retention policy (how long to keep old workouts)
- Pricing model (free vs. paid features)
- Advanced analytics features for MVP vs. post-MVP

---

## Resources

- [Architecture Overview](./architecture.md)
- [NFC Payload Structure](./nfc-payload-structure.md)
- [Workflow Logic](./workflow-logic.md)

---

## Contributing

This is currently a solo project. For questions or collaboration:
- GitHub: [ajennin9/ironiq2](https://github.com/ajennin9/ironiq2)
- Issues: Track bugs and feature requests on GitHub

---

**Last Updated:** November 17, 2025
**Next Review:** Before MVP Release
