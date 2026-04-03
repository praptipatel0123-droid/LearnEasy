export type Lang = 'EN' | 'HI';

const t = {
  EN: {
    // Welcome
    welcome: 'Welcome to',
    tagline: 'Where learn is fun 🚀',

    // Login
    createAccount: 'Create your account',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email ID',
    phone: 'Phone Number',
    city: 'City',
    state: 'State',
    country: 'Country',
    grade: 'Grade',
    selectGrade: 'Select grade',
    board: 'Board',
    selectBoard: 'Select board',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    createPassword: 'Create password',
    repeatPassword: 'Repeat password',
    enterLab: 'Enter Lab',
    settingUp: 'Setting Up...',
    passwordMismatch: 'Passwords do not match.',
    serverError: 'Server error. Make sure the backend is running.',

    // Nav
    logout: 'Logout',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',

    // Lab
    problem: 'Problem',
    problemPlaceholder: 'Enter your question...',
    runSimulation: 'Run Simulation',
    simulating: 'Simulating...',
    manualControls: 'Manual Controls',
    answer: 'Answer',
    enterProblem: 'Enter a problem and run simulation',
    mathError: 'Math Logic Error: Check your API key or try a simpler problem.',
    steps: 'Step-by-Step Solution',
    explanation: 'Simple Explanation',
    knowns: 'Known Values',
    unknowns: 'Unknown Values',
    animationDesc: 'Animation',
    domain: 'Domain',
    formula: 'Formulas',
    history: 'History',
    noHistory: 'No problems solved yet',
    clearAll: 'Clear All',
    justNow: 'Just now',
    send: 'Send',
  },
  HI: {
    // Welcome
    welcome: 'स्वागत है',
    tagline: 'सीखने का आनंद 🚀',

    // Login
    createAccount: 'अपना खाता बनाएं',
    firstName: 'पहला नाम',
    lastName: 'अंतिम नाम',
    email: 'ईमेल आईडी',
    phone: 'फ़ोन नंबर',
    city: 'शहर',
    state: 'राज्य',
    country: 'देश',
    grade: 'कक्षा',
    selectGrade: 'कक्षा चुनें',
    board: 'बोर्ड',
    selectBoard: 'बोर्ड चुनें',
    password: 'पासवर्ड',
    confirmPassword: 'पासवर्ड की पुष्टि करें',
    createPassword: 'पासवर्ड बनाएं',
    repeatPassword: 'पासवर्ड दोहराएं',
    enterLab: 'लैब में प्रवेश करें',
    settingUp: 'तैयार हो रहा है...',
    passwordMismatch: 'पासवर्ड मेल नहीं खाते।',
    serverError: 'सर्वर त्रुटि। कृपया बैकएंड चालू करें।',

    // Nav
    logout: 'लॉग आउट',
    editProfile: 'प्रोफ़ाइल संपादित करें',
    saveChanges: 'बदलाव सहेजें',

    // Lab
    problem: 'समस्या',
    problemPlaceholder: 'अपना प्रश्न दर्ज करें...',
    runSimulation: 'सिमुलेशन चलाएं',
    simulating: 'सिमुलेट हो रहा है...',
    manualControls: 'मैन्युअल नियंत्रण',
    answer: 'उत्तर',
    enterProblem: 'समस्या दर्ज करें और सिमुलेशन चलाएं',
    mathError: 'गणित त्रुटि: API key जांचें या सरल समस्या आज़माएं।',
    steps: 'चरण-दर-चरण हल',
    explanation: 'सरल व्याख्या',
    knowns: 'ज्ञात मान',
    unknowns: 'अज्ञात मान',
    animationDesc: 'एनिमेशन',
    domain: 'विषय',
    formula: 'सूत्र',
    history: 'इतिहास',
    noHistory: 'अभी तक कोई समस्या हल नहीं हुई',
    clearAll: 'सभी हटाएं',
    justNow: 'अभी',
    send: 'भेजें',
  },
};

export default t;
