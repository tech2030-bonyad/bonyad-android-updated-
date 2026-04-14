/**
 * demoDefinitions.ts — Defines interactive demo flows for the app guide system.
 *
 * Each demo is a self-contained walkthrough with dummy data that the chatbot mascot
 * narrates step-by-step, showing the user how a feature works.
 */
import type { ImageSourcePropType } from 'react-native';

export interface DemoStep {
  /** Ionicons icon name shown alongside the step */
  icon: string;
  /** Bold title for this step */
  titleKey: string;
  /** Chatbot narration text (what the robot "says") */
  narrationKey: string;
  /** Optional: visual hint area — describes what part of the screen to look at */
  visualHint?: string;
  /** Optional: dummy data values shown in the visual mockup */
  dummyData?: Record<string, string | number | boolean>;
}

export interface DemoDefinition {
  /** Unique ID for this demo */
  id: string;
  /** Ionicons icon name for the menu card */
  icon: string;
  /** Menu card color accent */
  color: string;
  /** i18n key for the demo title */
  titleKey: string;
  /** i18n key for short description on the menu card */
  descriptionKey: string;
  /** Ordered list of demo steps */
  steps: DemoStep[];
}

// ─── User Home Demos ────────────────────────────────────────────────────────

export const USER_HOME_DEMOS: DemoDefinition[] = [
  {
    id: 'create-project',
    icon: 'construct-outline',
    color: '#00A5F4',
    titleKey: 'demo.user.createProject.title',
    descriptionKey: 'demo.user.createProject.desc',
    steps: [
      {
        icon: 'add-circle-outline',
        titleKey: 'demo.user.createProject.step1.title',
        narrationKey: 'demo.user.createProject.step1.narration',
        dummyData: { buttonLabel: '+' },
      },
      {
        icon: 'options-outline',
        titleKey: 'demo.user.createProject.step2.title',
        narrationKey: 'demo.user.createProject.step2.narration',
        dummyData: { projectType: 'Large Project', smallTask: 'Small Task' },
      },
      {
        icon: 'create-outline',
        titleKey: 'demo.user.createProject.step3.title',
        narrationKey: 'demo.user.createProject.step3.narration',
        dummyData: { title: 'Kitchen Renovation', budget: '15,000 SAR', description: 'Full kitchen remodel with new cabinets...' },
      },
      {
        icon: 'images-outline',
        titleKey: 'demo.user.createProject.step4.title',
        narrationKey: 'demo.user.createProject.step4.narration',
        dummyData: { photos: 3 },
      },
      {
        icon: 'paper-plane-outline',
        titleKey: 'demo.user.createProject.step5.title',
        narrationKey: 'demo.user.createProject.step5.narration',
        dummyData: { bidsReceived: 5, status: 'Pending' },
      },
    ],
  },
  {
    id: 'post-small-task',
    icon: 'flash-outline',
    color: '#F59E0B',
    titleKey: 'demo.user.smallTask.title',
    descriptionKey: 'demo.user.smallTask.desc',
    steps: [
      {
        icon: 'flash-outline',
        titleKey: 'demo.user.smallTask.step1.title',
        narrationKey: 'demo.user.smallTask.step1.narration',
      },
      {
        icon: 'list-outline',
        titleKey: 'demo.user.smallTask.step2.title',
        narrationKey: 'demo.user.smallTask.step2.narration',
        dummyData: { category: 'Plumbing', subCategory: 'Leak Repair' },
      },
      {
        icon: 'location-outline',
        titleKey: 'demo.user.smallTask.step3.title',
        narrationKey: 'demo.user.smallTask.step3.narration',
        dummyData: { location: 'Riyadh, Al Olaya', urgent: true },
      },
      {
        icon: 'checkmark-circle-outline',
        titleKey: 'demo.user.smallTask.step4.title',
        narrationKey: 'demo.user.smallTask.step4.narration',
        dummyData: { technicianName: 'Ahmad M.', rating: 4.8, price: '350 SAR' },
      },
    ],
  },
  {
    id: 'search-technicians',
    icon: 'search-outline',
    color: '#8B5CF6',
    titleKey: 'demo.user.search.title',
    descriptionKey: 'demo.user.search.desc',
    steps: [
      {
        icon: 'search-outline',
        titleKey: 'demo.user.search.step1.title',
        narrationKey: 'demo.user.search.step1.narration',
      },
      {
        icon: 'funnel-outline',
        titleKey: 'demo.user.search.step2.title',
        narrationKey: 'demo.user.search.step2.narration',
        dummyData: { query: 'Electrician', results: 12 },
      },
      {
        icon: 'person-outline',
        titleKey: 'demo.user.search.step3.title',
        narrationKey: 'demo.user.search.step3.narration',
        dummyData: { name: 'Khaled S.', rating: 4.9, jobs: 156, verified: true },
      },
      {
        icon: 'chatbubble-outline',
        titleKey: 'demo.user.search.step4.title',
        narrationKey: 'demo.user.search.step4.narration',
      },
    ],
  },
  {
    id: 'manage-appointments',
    icon: 'calendar-outline',
    color: '#10B981',
    titleKey: 'demo.user.appointments.title',
    descriptionKey: 'demo.user.appointments.desc',
    steps: [
      {
        icon: 'calendar-outline',
        titleKey: 'demo.user.appointments.step1.title',
        narrationKey: 'demo.user.appointments.step1.narration',
      },
      {
        icon: 'time-outline',
        titleKey: 'demo.user.appointments.step2.title',
        narrationKey: 'demo.user.appointments.step2.narration',
        dummyData: { date: '15 Apr 2026', time: '10:00 AM', technician: 'Faisal K.' },
      },
      {
        icon: 'notifications-outline',
        titleKey: 'demo.user.appointments.step3.title',
        narrationKey: 'demo.user.appointments.step3.narration',
      },
    ],
  },
  {
    id: 'track-projects',
    icon: 'bar-chart-outline',
    color: '#EF4444',
    titleKey: 'demo.user.trackProjects.title',
    descriptionKey: 'demo.user.trackProjects.desc',
    steps: [
      {
        icon: 'folder-open-outline',
        titleKey: 'demo.user.trackProjects.step1.title',
        narrationKey: 'demo.user.trackProjects.step1.narration',
      },
      {
        icon: 'eye-outline',
        titleKey: 'demo.user.trackProjects.step2.title',
        narrationKey: 'demo.user.trackProjects.step2.narration',
        dummyData: { projectName: 'Kitchen Renovation', status: 'In Progress', phase: '2/4', progress: 45 },
      },
      {
        icon: 'chatbubbles-outline',
        titleKey: 'demo.user.trackProjects.step3.title',
        narrationKey: 'demo.user.trackProjects.step3.narration',
      },
      {
        icon: 'document-text-outline',
        titleKey: 'demo.user.trackProjects.step4.title',
        narrationKey: 'demo.user.trackProjects.step4.narration',
        dummyData: { contract: 'Signed', payments: '2/4 completed' },
      },
    ],
  },
  {
    id: 'use-chatbot',
    icon: 'chatbubble-ellipses-outline',
    color: '#00A5F4',
    titleKey: 'demo.user.chatbot.title',
    descriptionKey: 'demo.user.chatbot.desc',
    steps: [
      {
        icon: 'chatbubble-ellipses-outline',
        titleKey: 'demo.user.chatbot.step1.title',
        narrationKey: 'demo.user.chatbot.step1.narration',
      },
      {
        icon: 'help-circle-outline',
        titleKey: 'demo.user.chatbot.step2.title',
        narrationKey: 'demo.user.chatbot.step2.narration',
        dummyData: { question: 'How do I create a project?', answer: 'Tap the + button...' },
      },
      {
        icon: 'navigate-outline',
        titleKey: 'demo.user.chatbot.step3.title',
        narrationKey: 'demo.user.chatbot.step3.narration',
      },
    ],
  },
];

// ─── Technician Home Demos ──────────────────────────────────────────────────

export const TECHNICIAN_HOME_DEMOS: DemoDefinition[] = [
  {
    id: 'browse-projects',
    icon: 'briefcase-outline',
    color: '#00A5F4',
    titleKey: 'demo.tech.browseProjects.title',
    descriptionKey: 'demo.tech.browseProjects.desc',
    steps: [
      {
        icon: 'briefcase-outline',
        titleKey: 'demo.tech.browseProjects.step1.title',
        narrationKey: 'demo.tech.browseProjects.step1.narration',
      },
      {
        icon: 'eye-outline',
        titleKey: 'demo.tech.browseProjects.step2.title',
        narrationKey: 'demo.tech.browseProjects.step2.narration',
        dummyData: { projectName: 'Bathroom Renovation', budget: '8,000 SAR', location: 'Jeddah' },
      },
      {
        icon: 'wallet-outline',
        titleKey: 'demo.tech.browseProjects.step3.title',
        narrationKey: 'demo.tech.browseProjects.step3.narration',
        dummyData: { bidAmount: '7,500 SAR', timeline: '2 weeks', message: 'I have 5 years experience...' },
      },
      {
        icon: 'checkmark-done-outline',
        titleKey: 'demo.tech.browseProjects.step4.title',
        narrationKey: 'demo.tech.browseProjects.step4.narration',
      },
    ],
  },
  {
    id: 'accept-tasks',
    icon: 'flash-outline',
    color: '#F59E0B',
    titleKey: 'demo.tech.acceptTasks.title',
    descriptionKey: 'demo.tech.acceptTasks.desc',
    steps: [
      {
        icon: 'flash-outline',
        titleKey: 'demo.tech.acceptTasks.step1.title',
        narrationKey: 'demo.tech.acceptTasks.step1.narration',
      },
      {
        icon: 'hand-left-outline',
        titleKey: 'demo.tech.acceptTasks.step2.title',
        narrationKey: 'demo.tech.acceptTasks.step2.narration',
        dummyData: { task: 'Fix AC unit', location: 'Riyadh', price: '400 SAR' },
      },
      {
        icon: 'chatbubble-outline',
        titleKey: 'demo.tech.acceptTasks.step3.title',
        narrationKey: 'demo.tech.acceptTasks.step3.narration',
      },
    ],
  },
  {
    id: 'manage-portfolio',
    icon: 'images-outline',
    color: '#8B5CF6',
    titleKey: 'demo.tech.portfolio.title',
    descriptionKey: 'demo.tech.portfolio.desc',
    steps: [
      {
        icon: 'images-outline',
        titleKey: 'demo.tech.portfolio.step1.title',
        narrationKey: 'demo.tech.portfolio.step1.narration',
      },
      {
        icon: 'camera-outline',
        titleKey: 'demo.tech.portfolio.step2.title',
        narrationKey: 'demo.tech.portfolio.step2.narration',
        dummyData: { photos: 8, projectName: 'Villa Renovation' },
      },
      {
        icon: 'star-outline',
        titleKey: 'demo.tech.portfolio.step3.title',
        narrationKey: 'demo.tech.portfolio.step3.narration',
      },
    ],
  },
  {
    id: 'manage-appointments-tech',
    icon: 'calendar-outline',
    color: '#10B981',
    titleKey: 'demo.tech.appointments.title',
    descriptionKey: 'demo.tech.appointments.desc',
    steps: [
      {
        icon: 'calendar-outline',
        titleKey: 'demo.tech.appointments.step1.title',
        narrationKey: 'demo.tech.appointments.step1.narration',
      },
      {
        icon: 'checkmark-circle-outline',
        titleKey: 'demo.tech.appointments.step2.title',
        narrationKey: 'demo.tech.appointments.step2.narration',
        dummyData: { client: 'Mohammed A.', date: '16 Apr 2026', time: '2:00 PM' },
      },
      {
        icon: 'navigate-outline',
        titleKey: 'demo.tech.appointments.step3.title',
        narrationKey: 'demo.tech.appointments.step3.narration',
      },
    ],
  },
  {
    id: 'use-chatbot-tech',
    icon: 'chatbubble-ellipses-outline',
    color: '#00A5F4',
    titleKey: 'demo.tech.chatbot.title',
    descriptionKey: 'demo.tech.chatbot.desc',
    steps: [
      {
        icon: 'chatbubble-ellipses-outline',
        titleKey: 'demo.tech.chatbot.step1.title',
        narrationKey: 'demo.tech.chatbot.step1.narration',
      },
      {
        icon: 'help-circle-outline',
        titleKey: 'demo.tech.chatbot.step2.title',
        narrationKey: 'demo.tech.chatbot.step2.narration',
      },
      {
        icon: 'navigate-outline',
        titleKey: 'demo.tech.chatbot.step3.title',
        narrationKey: 'demo.tech.chatbot.step3.narration',
      },
    ],
  },
];
