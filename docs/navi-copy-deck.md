# Navi — UX Copy Deck

Friendly, calm, modern. Berlin-inspired. No corporate language, no drama, no robotic phrasing.

---

## 1. Welcome Screen

**Headline:** Berlin's on the move. So are we.

**Description:** Report issues, get help, and stay in the loop on the U-Bahn and S-Bahn — all in one place.

**Buttons:**
- Log in
- Create account

---

## 2. Sign Up

**Welcome text:** Let's get you set up.
**Subtext:** Takes less than a minute.

**Fields:**
- Full name
- Email address
- Password
- Confirm password

**Password guidance:** At least 8 characters, with one number.

**Terms/privacy text:** By creating an account, you agree to Navi's Terms of Service and Privacy Policy.

**Button:** Create account

**Errors:**
- Email already in use: "That email's already registered. Try logging in instead."
- Invalid email: "That email address doesn't look quite right."
- Weak password: "Your password needs at least 8 characters and a number."
- Password mismatch: "Those passwords don't match. Give it another go."
- Missing fields: "Looks like something's missing above."
- Generic: "Something went wrong on our end. Please try again."

**Success:** You're all set. Welcome to Navi.

---

## 3. Log In

**Welcome back:** Welcome back.
**Subtext:** Good to see you again.

**Fields:**
- Email address
- Password

**Forgot password:** Forgot password?

**Button:** Log in

**Errors:**
- Invalid credentials: "Email or password doesn't match. Try again."
- Missing fields: "Enter your email and password to continue."
- Generic: "Something went wrong. Please try again in a moment."

---

## 4. Home Screen

**Greeting:** How can we help?
**Greeting (personalized):** How can we help, {name}?

**Main actions:**

| Action | Description |
|---|---|
| Report something | Saw something? Let us know what's happening and where. |
| Get help | Need assistance right now? We're here for you. |

---

## 5. Report Category Screen

**Title:** What's going on?
**Subtitle:** Pick the option that fits best.

| Category | Description |
|---|---|
| Something I found | Found an item that isn't yours? Tell us where. |
| Lost property | Lost something on your journey? We'll help you look. |
| Delay or disruption | Trains running late or service interrupted. |
| Theft | Something was taken from you or someone nearby. |
| Suspicious activity | Something feels off and you want to flag it. |
| Harassment or feeling unsafe | You or someone nearby is being harassed or feels unsafe. |
| Medical situation | Someone needs medical attention. |
| Damage or infrastructure issue | Broken equipment or something that needs fixing. |
| Something else | Doesn't fit the categories above? Tell us in your own words. |

---

## 6. Location Screen

**Title:** Where's this happening?
**Explanation:** This helps us point people to the right spot.

**Use my current location:** Use my current location

**Location permission request:**
- Title: Navi would like to use your location
- Body: This helps us find your nearest station automatically. You can also enter it manually.
- Allow: Allow location access
- Deny: Not now

**Nearest station result:**
- "Looks like you're near {station}."
- Confirm: Yes, that's right
- Change: Choose a different station

**Manual station selection:**
- Title: Select your station
- Placeholder: Choose a station

**Search station:**
- Placeholder: Search for a station
- No results: No stations found. Try a different name.

**Location unavailable:** We couldn't find your location. Search for your station instead.

**Incorrect location:** Not the right spot? Search for your station below.

---

## 7. Report Details Screen

**Title:** Tell us what happened

**Instructions:** Share what you saw or experienced, in your own words. Every detail helps.

**Text area placeholder:** Tell us what happened in your own words.

**Optional additional details:** Anything else we should know? (optional)

**Helpful example text:** For example: "Two people are arguing loudly near the platform doors at Alexanderplatz."

---

## 8. Severity Screen

**Title:** How urgent is this?
**Subtitle:** This helps us understand how soon it needs attention.

| Level | Description | Example situations |
|---|---|---|
| Low | Not urgent — can be looked at when there's time. | Litter, minor delays, general feedback |
| Medium | Needs attention, but no one's in danger. | Broken escalator, lost item, unusual behavior |
| High | A serious situation that may need immediate assistance. | Someone is hurt, in danger, or needs urgent help |

---

## 9. High Severity Warning

**Headline:** If anyone is in immediate danger

**Explanation:** Navi helps you report incidents and request assistance, but we can't respond to emergencies in real time. If this is urgent, please contact emergency services directly.

**Options:**
- Continue with my report
- Contact emergency services (112)

*Note: copy never states or implies that police, security guards, BVG, Deutsche Bahn, or emergency services have been contacted automatically.*

---

## 10. Report Review Screen

**Title:** Review your report
**Subtitle:** Take a moment to make sure everything looks right.

**Labels:**
- Category
- Location
- Station
- Description
- Urgency

**Buttons:**
- Edit
- Submit report

---

## 11. Submission Success Screen

**Confirmation:** Your report is on its way.

**Explanation:** Thanks for speaking up — our team will look into this.

**Report ID:** Report ID: {id}

**Buttons:**
- View my reports
- Back to home

*Note: no response time is promised.*

---

## 12. Get Help Screen

**Title:** What kind of help do you need?
**Subtitle:** Choose what fits your situation. We're here for you.

| Option | Description |
|---|---|
| I feel unsafe | Get support if you're feeling uneasy or threatened. |
| Medical help | Request assistance for a health situation. |
| Theft or robbery | Report something stolen and get support. |
| Immediate danger | If you or someone else is in danger right now, contact emergency services. |

---

## 13. My Reports

**Title:** My reports

**Empty state:** You haven't submitted any reports yet. When you do, they'll show up here.

**Statuses:**

| Status | Explanation |
|---|---|
| Submitted | We've received your report and it's in the queue. |
| Received | Your report has reached the right team. |
| Under review | Someone's actively looking into this. |
| Resolved | This report has been addressed and closed. |

---

## 14. Profile

- Profile
- Personal details
- Privacy
- My reports
- Log out
- Delete account
  - Confirmation: "Are you sure you want to delete your account? This can't be undone."

---

## 15. Error States

| Case | Message |
|---|---|
| No internet connection | You're offline. Check your connection and try again. |
| Location unavailable | We can't find your location right now. Try entering your station manually. |
| Something went wrong | Something went wrong on our end. Please try again. |
| Report could not be sent | Your report couldn't be sent. Nothing's lost — try again in a moment. |
| Session expired | You've been logged out for security. Log back in to continue. |
| Invalid information | Some information doesn't look right. Please check and try again. |

---

## 16. Microcopy

| Key | Text |
|---|---|
| Back | Back |
| Continue | Continue |
| Cancel | Cancel |
| Save | Save |
| Edit | Edit |
| Submit | Submit |
| Done | Done |
| Try again | Try again |
| Close | Close |
| Search | Search |
| Loading | Loading… |
