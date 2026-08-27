// Navi — UX copy and text content
// Brand voice: friendly, calm, modern, concise, human. Berlin-inspired, never corporate or alarmist.

export const copy = {
  // 1. WELCOME SCREEN
  welcome: {
    headline: "Berlin's on the move. So are we.",
    description:
      "Report issues, get help, and stay in the loop on the U-Bahn and S-Bahn — all in one place.",
    loginButton: "Log in",
    signupButton: "Create account",
  },

  // 2. SIGN UP
  signup: {
    welcomeText: "Let's get you set up.",
    subtext: "Takes less than a minute.",
    fields: {
      name: "Full name",
      email: "Email address",
      password: "Password",
      confirmPassword: "Confirm password",
    },
    passwordGuidance: "At least 8 characters, with one number.",
    termsText:
      "By creating an account, you agree to Navi's Terms of Service and Privacy Policy.",
    button: "Create account",
    errors: {
      emailInUse: "That email's already registered. Try logging in instead.",
      invalidEmail: "That email address doesn't look quite right.",
      weakPassword: "Your password needs at least 8 characters and a number.",
      passwordMismatch: "Those passwords don't match. Give it another go.",
      missingFields: "Looks like something's missing above.",
      generic: "Something went wrong on our end. Please try again.",
    },
    success: "You're all set. Welcome to Navi.",
    checkEmail: "Almost there — we've sent a confirmation link to {email}. Tap it to finish setting up your account.",
  },

  // 3. LOG IN
  login: {
    welcomeBack: "Welcome back.",
    subtext: "Good to see you again.",
    fields: {
      email: "Email address",
      password: "Password",
    },
    forgotPassword: "Forgot password?",
    button: "Log in",
    errors: {
      invalidCredentials: "Email or password doesn't match. Try again.",
      missingFields: "Enter your email and password to continue.",
      generic: "Something went wrong. Please try again in a moment.",
    },
  },

  // 4. HOME SCREEN
  home: {
    greeting: "How can we help?",
    greetingWithName: "How can we help, {name}?",
    actions: {
      report: {
        title: "Report something",
        description: "Saw something? Let us know what's happening and where.",
      },
      help: {
        title: "Get help",
        description: "Need assistance right now? We're here for you.",
      },
    },
  },

  // 5. REPORT CATEGORY SCREEN
  reportCategory: {
    title: "What's going on?",
    subtitle: "Pick the option that fits best.",
    categories: {
      foundItem: {
        title: "Something I found",
        description: "Found an item that isn't yours? Tell us where.",
      },
      lostProperty: {
        title: "Lost property",
        description: "Lost something on your journey? We'll help you look.",
      },
      delay: {
        title: "Delay or disruption",
        description: "Trains running late or service interrupted.",
      },
      theft: {
        title: "Theft",
        description: "Something was taken from you or someone nearby.",
      },
      suspiciousActivity: {
        title: "Suspicious activity",
        description: "Something feels off and you want to flag it.",
      },
      harassment: {
        title: "Harassment or feeling unsafe",
        description: "You or someone nearby is being harassed or feels unsafe.",
      },
      medical: {
        title: "Medical situation",
        description: "Someone needs medical attention.",
      },
      damage: {
        title: "Damage or infrastructure issue",
        description: "Broken equipment or something that needs fixing.",
      },
      other: {
        title: "Something else",
        description: "Doesn't fit the categories above? Tell us in your own words.",
      },
    },
  },

  // 6. LOCATION SCREEN
  location: {
    title: "Where's this happening?",
    explanation: "This helps us point people to the right spot.",
    useCurrentLocation: "Use my current location",
    permission: {
      title: "Navi would like to use your location",
      body: "This helps us find your nearest station automatically. You can also enter it manually.",
      allow: "Allow location access",
      deny: "Not now",
    },
    nearestStation: {
      result: "Looks like you're near {station}.",
      confirm: "Yes, that's right",
      change: "Choose a different station",
    },
    manualSelection: {
      title: "Select your station",
      placeholder: "Choose a station",
    },
    search: {
      placeholder: "Search for a station",
      noResults: "No stations found. Try a different name.",
    },
    locationUnavailable: "We couldn't find your location. Search for your station instead.",
    incorrectLocation: "Not the right spot? Search for your station below.",
  },

  // 7. REPORT DETAILS SCREEN
  reportDetails: {
    title: "Tell us what happened",
    instructions: "Share what you saw or experienced, in your own words. Every detail helps.",
    placeholder: "Tell us what happened in your own words.",
    optionalDetails: "Anything else we should know? (optional)",
    exampleText:
      "For example: \"Two people are arguing loudly near the platform doors at Alexanderplatz.\"",
  },

  // 8. SEVERITY SCREEN
  severity: {
    title: "How urgent is this?",
    subtitle: "This helps us understand how soon it needs attention.",
    levels: {
      low: {
        name: "Low",
        description: "Not urgent — can be looked at when there's time.",
        examples: "Litter, minor delays, general feedback",
      },
      medium: {
        name: "Medium",
        description: "Needs attention, but no one's in danger.",
        examples: "Broken escalator, lost item, unusual behavior",
      },
      high: {
        name: "High",
        description: "A serious situation that may need immediate assistance.",
        examples: "Someone is hurt, in danger, or needs urgent help",
      },
    },
  },

  // 9. HIGH SEVERITY WARNING
  highSeverityWarning: {
    headline: "If anyone is in immediate danger",
    explanation:
      "Navi helps you report incidents and request assistance, but we can't respond to emergencies in real time. If this is urgent, please contact emergency services directly.",
    continueOption: "Continue with my report",
    emergencyOption: "Contact emergency services (112)",
  },

  // 10. REPORT REVIEW SCREEN
  reportReview: {
    title: "Review your report",
    subtitle: "Take a moment to make sure everything looks right.",
    labels: {
      category: "Category",
      location: "Location",
      station: "Station",
      description: "Description",
      severity: "Urgency",
    },
    edit: "Edit",
    submit: "Submit report",
  },

  // 11. SUBMISSION SUCCESS SCREEN
  submissionSuccess: {
    confirmation: "Your report is on its way.",
    explanation: "Thanks for speaking up — our team will look into this.",
    reportId: "Report ID: {id}",
    viewReports: "View my reports",
    backHome: "Back to home",
  },

  // 12. GET HELP SCREEN
  getHelp: {
    title: "What kind of help do you need?",
    subtitle: "Choose what fits your situation. We're here for you.",
    options: {
      unsafe: {
        title: "I feel unsafe",
        description: "Get support if you're feeling uneasy or threatened.",
      },
      medical: {
        title: "Medical help",
        description: "Request assistance for a health situation.",
      },
      theft: {
        title: "Theft or robbery",
        description: "Report something stolen and get support.",
      },
      immediateDanger: {
        title: "Immediate danger",
        description: "If you or someone else is in danger right now, contact emergency services.",
      },
    },
  },

  // 13. MY REPORTS
  myReports: {
    title: "My reports",
    emptyState: "You haven't submitted any reports yet. When you do, they'll show up here.",
    statuses: {
      submitted: {
        name: "Submitted",
        description: "We've received your report and it's in the queue.",
      },
      received: {
        name: "Received",
        description: "Your report has reached the right team.",
      },
      underReview: {
        name: "Under review",
        description: "Someone's actively looking into this.",
      },
      resolved: {
        name: "Resolved",
        description: "This report has been addressed and closed.",
      },
    },
  },

  // 14. PROFILE
  profile: {
    title: "Profile",
    appearance: {
      title: "Appearance",
      dark: "Dark",
      light: "Light",
    },
    personalDetails: "Personal details",
    privacy: "Privacy",
    myReports: "My reports",
    logout: "Log out",
    deleteAccount: "Delete account",
    deleteAccountConfirm: "Are you sure you want to delete your account? This can't be undone.",
  },

  // 15. ERROR STATES
  errors: {
    noInternet: "You're offline. Check your connection and try again.",
    locationUnavailable: "We can't find your location right now. Try entering your station manually.",
    somethingWrong: "Something went wrong on our end. Please try again.",
    reportFailed: "Your report couldn't be sent. Nothing's lost — try again in a moment.",
    sessionExpired: "You've been logged out for security. Log back in to continue.",
    invalidInformation: "Some information doesn't look right. Please check and try again.",
  },

  // 16. MICROCOPY
  microcopy: {
    back: "Back",
    continue: "Continue",
    cancel: "Cancel",
    save: "Save",
    edit: "Edit",
    submit: "Submit",
    done: "Done",
    tryAgain: "Try again",
    close: "Close",
    search: "Search",
    loading: "Loading…",
  },
} as const;

export type NaviCopy = typeof copy;
