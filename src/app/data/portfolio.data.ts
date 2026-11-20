/**
 * All portfolio content lives here, so text can be updated without touching components.
 * Content mirrors Kishore_Resume.pdf.
 */

export const PROFILE = {
  name: 'Kishore V',
  firstName: 'Kishore',
  role: 'Java Full Stack Developer',
  roles: [
    'Java Full Stack Developer',
    'Spring Boot Expert',
    'Angular Developer',
    'Microservices Developer',
    'Problem Solver',
  ],
  email: 'kishorebe1199@gmail.com',
  phone: '+91 6369384178',
  phoneHref: 'tel:+916369384178',
  location: 'Chennai, Tamilnadu, India',
  github: 'https://github.com/Kishore1199',
  githubUser: 'Kishore1199',
  linkedin: 'https://www.linkedin.com/in/kishore-v-a64b2417b/',
  linkedinUser: 'kishore-v-a64b2417b',
  resume: 'assets/Kishore_Resume.pdf',
  company: 'Kaaspro Enterprises',
};

export const STATS = [
  { value: '3+', label: 'Years experience' },
  { value: '6', label: 'Projects shipped' },
  { value: '55+', label: 'Technologies' },
];

export const ABOUT_HIGHLIGHTS = [
  {
    icon: 'code',
    title: 'Full-Stack Development',
    desc: 'Angular frontends & Spring Boot backends with Hibernate, JPA, and Microservices architecture.',
  },
  {
    icon: 'database',
    title: 'Database Management',
    desc: 'MySQL, MongoDB, Hibernate ORM and JPA with query optimization and data modelling.',
  },
  {
    icon: 'cloud',
    title: 'DevOps & Tools',
    desc: 'CI/CD with Jenkins, Maven & Gradle, Git/GitHub & SVN, Kafka messaging, Splunk monitoring, Agile delivery.',
  },
  {
    icon: 'spark',
    title: 'AI-Assisted Development',
    desc: 'Claude AI, GitHub Copilot, Google Gemini, ChatGPT and DeepSeek to speed up coding, debugging and docs.',
  },
] as const;

export interface Skill {
  name: string;
  color: string;
}
export interface SkillCategory {
  name: string;
  icon: string;
  blurb: string;
  skills: Skill[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    name: 'Backend',
    icon: 'server',
    blurb: 'APIs, services and data access on the JVM',
    skills: [
      { name: 'Java', color: '#ED8B00' },
      { name: 'Spring Boot', color: '#6DB33F' },
      { name: 'Spring', color: '#77BC1F' },
      { name: 'Hibernate', color: '#BCAE79' },
      { name: 'Spring Security', color: '#6DB33F' },
      { name: 'JPA', color: '#5382A1' },
      { name: 'JWT', color: '#D63AFF' },
      { name: 'Microservices', color: '#00BCD4' },
      { name: 'Servlets', color: '#F89820' },
      { name: 'JSP', color: '#F89820' },
      { name: 'JDBC', color: '#5382A1' },
      { name: 'REST APIs', color: '#10B981' },
      { name: 'Eureka', color: '#6DB33F' },
      { name: 'Spring Cloud API Gateway', color: '#6DB33F' },
      { name: 'Kafka', color: '#A3A3A3' },
      { name: 'PHP', color: '#8892BF' },
      { name: 'OpenEMR', color: '#14B8A6' },
      { name: 'FHIR R4', color: '#F05A28' },
    ],
  },
  {
    name: 'Frontend',
    icon: 'layout',
    blurb: 'Responsive, component-driven user interfaces',
    skills: [
      { name: 'Angular', color: '#DD0031' },
      { name: 'TypeScript', color: '#3178C6' },
      { name: 'JavaScript', color: '#F7DF1E' },
      { name: 'HTML', color: '#E34F26' },
      { name: 'CSS', color: '#1572B6' },
      { name: 'SCSS', color: '#CC6699' },
      { name: 'SASS', color: '#CF649A' },
      { name: 'Bootstrap', color: '#7952B3' },
      { name: 'Ionic Framework', color: '#3880FF' },
      { name: 'jQuery', color: '#3D8FD1' },
      { name: 'Twig', color: '#8BC34A' },
    ],
  },
  {
    name: 'Database & DevOps',
    icon: 'database',
    blurb: 'Storage, builds, CI/CD and monitoring',
    skills: [
      { name: 'MySQL', color: '#4479A1' },
      { name: 'MongoDB', color: '#47A248' },
      { name: 'MariaDB', color: '#C0765A' },
      { name: 'Firebase', color: '#FFCA28' },
      { name: 'Jenkins', color: '#D33833' },
      { name: 'GitHub', color: '#8B949E' },
      { name: 'SVN', color: '#809CC9' },
      { name: 'Maven', color: '#C71A36' },
      { name: 'Gradle', color: '#5EA3B5' },
      { name: 'Splunk', color: '#FF5733' },
      { name: 'Docker', color: '#2496ED' },
      { name: 'Google Cloud', color: '#4285F4' },
      { name: 'Sentry', color: '#8B5CF6' },
    ],
  },
  {
    name: 'Testing & Process',
    icon: 'flask',
    blurb: 'Quality, logging, reporting and Agile delivery',
    skills: [
      { name: 'Manual Testing', color: '#43B02A' },
      { name: 'Playwright', color: '#2EAD33' },
      { name: 'Agile', color: '#2684FF' },
      { name: 'Log4j & SLF4J', color: '#F59E0B' },
      { name: 'Jasper Studio', color: '#0A6FB7' },
      { name: 'Spring AOP', color: '#6DB33F' },
    ],
  },
  {
    name: 'Tools & IDEs',
    icon: 'wrench',
    blurb: 'My everyday development environment',
    skills: [
      { name: 'Eclipse', color: '#7B68EE' },
      { name: 'Spring Tool Suite', color: '#6DB33F' },
      { name: 'VS Code', color: '#007ACC' },
      { name: 'Postman', color: '#FF6C37' },
    ],
  },
  {
    name: 'AI Tools',
    icon: 'spark',
    blurb: 'AI assistants I use to ship faster',
    skills: [
      { name: 'Claude AI', color: '#D97757' },
      { name: 'Claude Code', color: '#E8875F' },
      { name: 'GitHub Copilot', color: '#8957E5' },
      { name: 'Google Gemini', color: '#4285F4' },
      { name: 'ChatGPT', color: '#10A37F' },
      { name: 'DeepSeek', color: '#4D6BFE' },
    ],
  },
];

export interface Project {
  title: string;
  period: string;
  org: string;
  badge: string;
  image: string | null;
  /** CSS object-position for the screenshot crop (default: center top). */
  imagePosition?: string;
  accent: string;
  accent2: string;
  tech: string[];
  features: string[];
  link: string | null;
  featured?: boolean;
}

export const PROJECTS: Project[] = [
  {
    title: '75Health EHR',
    period: 'Dec 2024 – Present',
    org: 'Kaaspro Enterprises',
    badge: 'Live Product',
    image: 'assets/75health-new.png',
    accent: '#3B82F6',
    accent2: '#06B6D4',
    featured: true,
    tech: ['Java 21', 'Spring Boot', 'Spring Security', 'Hibernate 6.x', 'Angular 17', 'MySQL', 'MongoDB', 'Gradle', 'Log4j', 'GitHub'],
    features: [
      'Cloud-based EHR platform for clinics & hospitals worldwide',
      'Patient records, clinical documentation, SOAP charts & e-prescriptions',
      'Appointment scheduling and lab integration',
      'Improved performance, security & interoperability for multi-user clinical workflows',
      'Enhanced UI/UX for providers — smoother navigation, faster clinical operations',
      'Role-based access, audit tracking & secure data handling for healthcare compliance',
      'Scalable from single-clinic to multi-location facilities',
    ],
    link: 'https://ehr.75health.com',
  },
  {
    title: '75Health EMR',
    period: 'Mar 2026 – Present',
    org: 'Kaaspro Enterprises',
    badge: 'Live Product',
    image: 'assets/75health-emr.jpg',
    imagePosition: 'left top', // keep the logo + sidebar in view
    accent: '#14B8A6',
    accent2: '#6366F1',
    tech: ['PHP 8.4', 'OpenEMR 8', 'MariaDB', 'Docker', 'FHIR R4', 'JavaScript', 'jQuery', 'Twig', 'Google Cloud', 'Sentry', 'Playwright', 'Claude Code'],
    features: [
      'Cloud EMR SaaS for 75Health, built on the open-source OpenEMR platform',
      'Upgraded end-to-end to OpenEMR 8 / PHP 8.4 using AI tools (Claude Code, GitHub Copilot)',
      'Multi-tenant SaaS: self-service clinic signup with Free & Premium plan limits (patients, users, appointments, storage)',
      'Google SSO, OTP email flows and appointment SMS notifications',
      'FHIR R4 REST API for patient import/export and interoperability',
      'E-prescription module and a complete 75Health UI/UX redesign',
      'Dockerized deployments to Google Cloud with Sentry monitoring and Playwright UI tests',
    ],
    link: 'https://emr.75health.com',
  },
  {
    title: '75Health Website',
    period: 'Dec 2024 – Present',
    org: 'Kaaspro Enterprises',
    badge: 'Live',
    image: 'assets/75health-website.png',
    accent: '#22C55E',
    accent2: '#14B8A6',
    tech: ['Angular 17', 'Bootstrap', 'HTML', 'CSS', 'TypeScript'],
    features: [
      'Cloud EHR/EMR platform driving digital transformation for practices in multiple countries',
      'Responsive product showcase website for the EHR/EMR solution',
      'Improved UI layout and structured content hierarchy',
      'Cross-browser compatibility & performance optimization',
      'Consistent design system across all pages',
    ],
    link: 'https://75health.com',
  },
  {
    title: 'Kaaspro Website',
    period: 'Dec 2024 – Present',
    org: 'Kaaspro Enterprises',
    badge: 'Live',
    image: 'assets/kaaspro-website.jpg',
    accent: '#F97316',
    accent2: '#EF4444',
    tech: ['HTML', 'CSS', 'Bootstrap', 'Java'],
    features: [
      'Responsive website for an IT services company',
      'Showcases web development, cloud and mobile-app services',
      'Structured content for better readability & navigation',
      'Consistent design & performance across devices and browsers',
    ],
    link: 'https://kaaspro.com',
  },
  {
    title: 'MySales – CRM',
    period: 'Internship',
    org: 'Techietact Solutions',
    badge: 'Internship',
    image: null,
    accent: '#A855F7',
    accent2: '#EC4899',
    tech: ['Java', 'Spring Boot 3.x', 'Angular 16', 'Microservices', 'Spring Cloud API Gateway 2022.0.2', 'Spring Security', 'Hibernate 6.x', 'Maven', 'MySQL'],
    features: [
      'CRM platform to manage customer interactions & sales',
      'Centralized customer data storage & organization',
      'Sales activity tracking and team communication',
      'Microservices architecture with Spring Cloud API Gateway',
      'Detailed reports to track in/out transactions',
    ],
    link: null,
  },
  {
    title: 'MyCognitiv – Online Exams',
    period: 'Internship',
    org: 'Techietact Solutions',
    badge: 'Internship',
    image: null,
    accent: '#8B5CF6',
    accent2: '#3B82F6',
    tech: ['Java 8', 'Spring MVC 4.x', 'Spring Security', 'Hibernate 5.x', 'JSP', 'MySQL', 'Maven', 'Log4j', 'AJAX', 'GitHub'],
    features: [
      'Online exam planning & management for organizations',
      'Question creation, results & category modules',
      'Multi-layer architecture: rich UI, business delegates & business layers',
      'Spring transaction management, Log4j logging & custom caching',
      'Hibernate persistence layer with exception handling',
    ],
    link: null,
  },
];

export const EXPERIENCE = [
  {
    role: 'Software Developer',
    company: 'Kaaspro Enterprises',
    period: 'Dec 2024 – Present',
    duration: '2 years',
    current: true,
    summary:
      'Developing and maintaining web applications using Java, Spring Boot, Hibernate, Angular, and MySQL — including the 75Health cloud EHR platform — and upgrading the PHP-based 75Health EMR (OpenEMR) using AI tools. This role has strengthened my problem-solving abilities, adaptability, and knowledge of Microservices, HTML, CSS, and TypeScript.',
    tech: ['Java 21', 'Spring Boot', 'Spring Security', 'Hibernate', 'Angular 17', 'MySQL', 'MongoDB', 'Gradle', 'Microservices', 'TypeScript', 'PHP 8.4', 'OpenEMR', 'Docker'],
    projects: ['75Health EHR', '75Health EMR', '75Health Website', 'Kaaspro Website'],
    initials: 'KE',
  },
  {
    role: 'Java Full Stack Developer Intern',
    company: 'Techietact Solutions Pvt Ltd',
    period: 'Internship',
    duration: '1 year',
    current: false,
    summary:
      'Hands-on experience as a Java Full Stack Developer building web applications with Java, Spring Boot, Hibernate, Angular, JSP, Servlets, and MySQL, while learning industry-standard development practices.',
    tech: ['Java', 'Spring Boot', 'Hibernate', 'Angular', 'JSP', 'Servlets', 'MySQL'],
    projects: ['MySales – CRM', 'MyCognitiv – Online Exams'],
    initials: 'TS',
  },
];

export const RESPONSIBILITIES = [
  'Involved in the migration process',
  'Involved in development activities to achieve goals',
  'Analyse requirements and develop the required technical components',
  'Daily scrum meetings to report progress',
  'Support system testing for deployment and track defects',
];

/** Listed oldest → newest so the section reads as a learning journey. */
export const EDUCATION = [
  {
    degree: 'Secondary School Leaving Certificate',
    short: 'SSLC',
    institution: 'Sri Ragavendra Matric Hr. Sec. School, Veeraganur',
    period: '2013 – 2014',
    year: '2014',
    grade: '80%',
    score: 80,
    accent: '#F59E0B',
    accent2: '#EF4444',
    description: 'Foundational schooling with focus on core academics.',
  },
  {
    degree: 'Higher Secondary Certificate',
    short: 'HSC',
    institution: 'Sri Ragavendra Matric Hr. Sec. School, Veeraganur',
    period: '2014 – 2016',
    year: '2016',
    grade: '80%',
    score: 80,
    accent: '#14B8A6',
    accent2: '#0EA5E9',
    description: 'Strong academic foundation in science and mathematics.',
  },
  {
    degree: 'Bachelor of Mechanical Engineering',
    short: 'B.E',
    institution: 'M.Kumarasamy College of Engineering, Karur',
    period: '2016 – 2020',
    year: '2020',
    grade: '62%',
    score: 62,
    accent: '#EC4899',
    accent2: '#A855F7',
    description: 'Engineering fundamentals with strong analytical and problem-solving skills applied to software development.',
  },
];

export const NAV_LINKS = [
  { label: 'Home', id: 'home' },
  { label: 'About', id: 'about' },
  { label: 'Skills', id: 'skills' },
  { label: 'Projects', id: 'projects' },
  { label: 'Experience', id: 'experience' },
  { label: 'Education', id: 'education' },
  { label: 'Prep', id: 'prep' },
  { label: 'Contact', id: 'contact' },
];

/** EmailJS settings (same account as the original portfolio). */
export const EMAILJS = {
  serviceId: 'service_0v0kn4u',
  templateId: 'template_i82mpxj',
  publicKey: 'piFgvLuRG7BQKuX9_filM',
};
