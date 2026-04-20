import { CanvasElement } from './types';
import { nanoid } from 'nanoid';

export interface Template {
  id: string;
  name: string;
  description: string;
  elements: CanvasElement[];
}

export const PRESET_TEMPLATES: Template[] = [
  {
    id: 'saas-basic',
    name: 'SaaS Cloud Architecture',
    description: 'Basic load balancer to web app with database setup.',
    elements: [
      { id: nanoid(), type: 'cloud', x: 100, y: 100, width: 600, height: 400, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c210', text: 'AWS Cloud' },
      { id: nanoid(), type: 'rect', x: 350, y: 150, width: 120, height: 60, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c220', text: 'Load Balancer', cornerRadius: 30 },
      { id: nanoid(), type: 'rect', x: 250, y: 280, width: 100, height: 60, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c220', text: 'Web Server 1', cornerRadius: 4 },
      { id: nanoid(), type: 'rect', x: 450, y: 280, width: 100, height: 60, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c220', text: 'Web Server 2', cornerRadius: 4 },
      { id: nanoid(), type: 'database', x: 360, y: 420, width: 80, height: 80, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c220', text: 'PostgreSQL' },
      { id: nanoid(), type: 'arrow', x: 410, y: 210, points: [0, 0, -60, 70], stroke: '#1971c2', strokeWidth: 2 },
      { id: nanoid(), type: 'arrow', x: 410, y: 210, points: [0, 0, 60, 70], stroke: '#1971c2', strokeWidth: 2 },
      { id: nanoid(), type: 'arrow', x: 300, y: 340, points: [0, 0, 80, 80], stroke: '#1971c2', strokeWidth: 2 },
      { id: nanoid(), type: 'arrow', x: 500, y: 340, points: [0, 0, -80, 80], stroke: '#1971c2', strokeWidth: 2 },
    ]
  },
  {
    id: 'user-flow',
    name: 'Standard User Flow',
    description: 'Login, Dashboard, and Settings flow.',
    elements: [
      { id: nanoid(), type: 'diamond', x: 100, y: 200, width: 100, height: 100, stroke: '#099268', strokeWidth: 2, fill: '#09926810', text: 'Is Logged In?' },
      { id: nanoid(), type: 'rect', x: 250, y: 100, width: 120, height: 80, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c210', text: 'Login Page', cornerRadius: 8 },
      { id: nanoid(), type: 'rect', x: 250, y: 300, width: 120, height: 80, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c210', text: 'Dashboard', cornerRadius: 8 },
      { id: nanoid(), type: 'rect', x: 450, y: 300, width: 120, height: 80, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c210', text: 'Settings', cornerRadius: 8 },
      { id: nanoid(), type: 'arrow', x: 150, y: 200, points: [0, 0, 100, -50], stroke: '#099268', strokeWidth: 2, text: 'No' },
      { id: nanoid(), type: 'arrow', x: 150, y: 300, points: [0, 0, 100, 50], stroke: '#099268', strokeWidth: 2, text: 'Yes' },
      { id: nanoid(), type: 'arrow', x: 370, y: 340, points: [0, 0, 80, 0], stroke: '#1971c2', strokeWidth: 2 },
      { id: nanoid(), type: 'sticky', x: 450, y: 150, width: 150, height: 100, stroke: 'transparent', strokeWidth: 0, fill: '#fef3c7', text: 'Remember to add SSO options here!' }
    ]
  },
  {
    id: 'microservice-mesh',
    name: 'Microservice Mesh',
    description: 'API Gateway with multiple underlying services.',
    elements: [
      { id: nanoid(), type: 'rect', x: 50, y: 200, width: 100, height: 150, stroke: '#be4bdb', strokeWidth: 2, fill: '#be4bdb10', text: 'API Gateway', cornerRadius: 12 },
      { id: nanoid(), type: 'rect', x: 250, y: 100, width: 120, height: 60, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c210', text: 'Auth Service', cornerRadius: 4 },
      { id: nanoid(), type: 'rect', x: 250, y: 200, width: 120, height: 60, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c210', text: 'User Service', cornerRadius: 4 },
      { id: nanoid(), type: 'rect', x: 250, y: 300, width: 120, height: 60, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c210', text: 'Order Service', cornerRadius: 4 },
      { id: nanoid(), type: 'hexagon', x: 450, y: 200, width: 100, height: 100, stroke: '#f08c00', strokeWidth: 2, fill: '#f08c0010', text: 'Redis Cache' },
      { id: nanoid(), type: 'arrow', x: 150, y: 275, points: [0, -100, 100, -145], stroke: '#be4bdb', strokeWidth: 2 },
      { id: nanoid(), type: 'arrow', x: 150, y: 275, points: [0, 0, 100, -45], stroke: '#be4bdb', strokeWidth: 2 },
      { id: nanoid(), type: 'arrow', x: 150, y: 275, points: [0, 100, 100, 55], stroke: '#be4bdb', strokeWidth: 2 },
      { id: nanoid(), type: 'arrow', x: 370, y: 230, points: [0, 0, 80, 0], stroke: '#1971c2', strokeWidth: 2 }
    ]
  },
  {
    id: 'database-er',
    name: 'Database ER Schema',
    description: 'Relational database schema with entities and relationships.',
    elements: [
      { id: nanoid(), type: 'rect', x: 50, y: 50, width: 140, height: 160, stroke: '#1c7ed6', strokeWidth: 2, fill: '#1c7ed605', text: 'Users\n---\nid: UUID\nemail: string\nname: string\ncreated_at: date' },
      { id: nanoid(), type: 'rect', x: 300, y: 50, width: 140, height: 160, stroke: '#1c7ed6', strokeWidth: 2, fill: '#1c7ed605', text: 'Orders\n---\nid: UUID\nuser_id: foreign\namount: decimal\nstatus: enum' },
      { id: nanoid(), type: 'rect', x: 550, y: 50, width: 140, height: 160, stroke: '#1c7ed6', strokeWidth: 2, fill: '#1c7ed605', text: 'Order_Items\n---\nid: UUID\norder_id: foreign\nproduct_id: foreign\nqty: int' },
      { id: nanoid(), type: 'arrow', x: 190, y: 130, points: [0, 0, 110, 0], stroke: '#1c7ed6', strokeWidth: 1.5, text: '1:N' },
      { id: nanoid(), type: 'arrow', x: 440, y: 130, points: [0, 0, 110, 0], stroke: '#1c7ed6', strokeWidth: 1.5, text: '1:N' },
      { id: nanoid(), type: 'sticky', x: 300, y: 250, width: 200, height: 80, stroke: 'transparent', strokeWidth: 0, fill: '#fff9db', text: 'TODO: Add product table and inventory logic.' }
    ]
  },
  {
    id: 'marketing-funnel',
    name: 'Marketing Funnel',
    description: 'Standard 4-stage conversion funnel design.',
    elements: [
      { id: nanoid(), type: 'triangle', x: 100, y: 50, width: 400, height: 80, stroke: '#f03e3e', strokeWidth: 2, fill: '#f03e3e20', text: 'AWARENESS (10k)', rotation: 180 },
      { id: nanoid(), type: 'rect', x: 150, y: 130, width: 300, height: 70, stroke: '#f03e3e', strokeWidth: 2, fill: '#f03e3e15', text: 'INTEREST (5k)' },
      { id: nanoid(), type: 'rect', x: 200, y: 200, width: 200, height: 60, stroke: '#f03e3e', strokeWidth: 2, fill: '#f03e3e10', text: 'DESIRE (1k)' },
      { id: nanoid(), type: 'rect', x: 250, y: 260, width: 100, height: 50, stroke: '#f03e3e', strokeWidth: 2, fill: '#f03e3e05', text: 'ACTION (200)' },
      { id: nanoid(), type: 'arrow', x: 300, y: 320, points: [0, 0, 0, 50], stroke: '#f03e3e', strokeWidth: 2, text: 'Converted' },
      { id: nanoid(), type: 'emoji', x: 285, y: 380, width: 30, height: 30, stroke: 'transparent', strokeWidth: 0, text: '🎉' }
    ]
  },
  {
    id: 'k8s-cluster',
    name: 'Kubernetes Cluster',
    description: 'High-level overview of a K8s control plane and worker nodes.',
    elements: [
      { id: nanoid(), type: 'cloud', x: 50, y: 50, width: 500, height: 400, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c205', text: 'Kubernetes Cluster' },
      { id: nanoid(), type: 'rect', x: 100, y: 100, width: 150, height: 100, stroke: '#099268', strokeWidth: 2, fill: '#09926810', text: 'Control Plane\n(API, Scheduler)', cornerRadius: 8 },
      { id: nanoid(), type: 'rect', x: 300, y: 100, width: 120, height: 80, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c210', text: 'Worker Node 1', cornerRadius: 4 },
      { id: nanoid(), type: 'rect', x: 300, y: 200, width: 120, height: 80, stroke: '#1971c2', strokeWidth: 2, fill: '#1971c210', text: 'Worker Node 2', cornerRadius: 4 },
      { id: nanoid(), type: 'process', x: 450, y: 120, width: 60, height: 40, stroke: '#f08c00', strokeWidth: 1, fill: '#f08c0010', text: 'Pod A' },
      { id: nanoid(), type: 'process', x: 450, y: 220, width: 60, height: 40, stroke: '#f08c00', strokeWidth: 1, fill: '#f08c0010', text: 'Pod B' },
      { id: nanoid(), type: 'arrow', x: 250, y: 150, points: [0, 0, 50, 0], stroke: '#1971c2', strokeWidth: 1.5 },
      { id: nanoid(), type: 'arrow', x: 250, y: 150, points: [0, 0, 50, 100], stroke: '#1971c2', strokeWidth: 1.5 }
    ]
  },
  // === NEW TEMPLATES ===
  {
    id: 'kanban-board',
    name: 'Kanban Sprint Board',
    description: 'Agile sprint board with To Do, In Progress, Review, Done columns.',
    elements: [
      // Column headers
      { id: nanoid(), type: 'frame', x: 30, y: 30, width: 160, height: 400, stroke: '#6366f1', strokeWidth: 1.5, fill: '#6366f108', text: 'To Do' },
      { id: nanoid(), type: 'frame', x: 210, y: 30, width: 160, height: 400, stroke: '#f59e0b', strokeWidth: 1.5, fill: '#f59e0b08', text: 'In Progress' },
      { id: nanoid(), type: 'frame', x: 390, y: 30, width: 160, height: 400, stroke: '#3b82f6', strokeWidth: 1.5, fill: '#3b82f608', text: 'Review' },
      { id: nanoid(), type: 'frame', x: 570, y: 30, width: 160, height: 400, stroke: '#10b981', strokeWidth: 1.5, fill: '#10b98108', text: 'Done' },
      // Cards - To Do
      { id: nanoid(), type: 'sticky', x: 40, y: 60, width: 140, height: 70, stroke: 'transparent', strokeWidth: 0, fill: '#ede9fe', text: '🎨 Design new landing page #12' },
      { id: nanoid(), type: 'sticky', x: 40, y: 142, width: 140, height: 70, stroke: 'transparent', strokeWidth: 0, fill: '#ede9fe', text: '🐛 Fix login redirect bug #14' },
      { id: nanoid(), type: 'sticky', x: 40, y: 224, width: 140, height: 70, stroke: 'transparent', strokeWidth: 0, fill: '#ede9fe', text: '📦 Update dependencies #15' },
      // Cards - In Progress
      { id: nanoid(), type: 'sticky', x: 220, y: 60, width: 140, height: 70, stroke: 'transparent', strokeWidth: 0, fill: '#fef3c7', text: '⚡ Optimize DB queries #9' },
      { id: nanoid(), type: 'sticky', x: 220, y: 142, width: 140, height: 70, stroke: 'transparent', strokeWidth: 0, fill: '#fef3c7', text: '🔐 Implement OAuth2 #10' },
      // Cards - Review
      { id: nanoid(), type: 'sticky', x: 400, y: 60, width: 140, height: 70, stroke: 'transparent', strokeWidth: 0, fill: '#dbeafe', text: '📊 Analytics dashboard #7' },
      // Cards - Done
      { id: nanoid(), type: 'sticky', x: 580, y: 60, width: 140, height: 70, stroke: 'transparent', strokeWidth: 0, fill: '#d1fae5', text: '✅ User profile page #5' },
      { id: nanoid(), type: 'sticky', x: 580, y: 142, width: 140, height: 70, stroke: 'transparent', strokeWidth: 0, fill: '#d1fae5', text: '✅ Email notifications #6' },
    ]
  },
  {
    id: 'mind-map',
    name: 'Mind Map',
    description: 'Central idea with branching topics and subtopics.',
    elements: [
      // Center
      { id: nanoid(), type: 'circle', x: 320, y: 200, radius: 60, stroke: '#8b5cf6', strokeWidth: 3, fill: '#8b5cf620', text: 'Product\nStrategy' },
      // Main branches
      { id: nanoid(), type: 'rect', x: 50, y: 80, width: 110, height: 45, stroke: '#3b82f6', strokeWidth: 2, fill: '#3b82f620', text: 'Market Research', cornerRadius: 22 },
      { id: nanoid(), type: 'rect', x: 50, y: 190, width: 110, height: 45, stroke: '#10b981', strokeWidth: 2, fill: '#10b98120', text: 'User Personas', cornerRadius: 22 },
      { id: nanoid(), type: 'rect', x: 50, y: 300, width: 110, height: 45, stroke: '#f59e0b', strokeWidth: 2, fill: '#f59e0b20', text: 'Roadmap', cornerRadius: 22 },
      { id: nanoid(), type: 'rect', x: 580, y: 80, width: 110, height: 45, stroke: '#ef4444', strokeWidth: 2, fill: '#ef444420', text: 'Competitors', cornerRadius: 22 },
      { id: nanoid(), type: 'rect', x: 580, y: 190, width: 110, height: 45, stroke: '#ec4899', strokeWidth: 2, fill: '#ec489920', text: 'Metrics KPIs', cornerRadius: 22 },
      { id: nanoid(), type: 'rect', x: 580, y: 300, width: 110, height: 45, stroke: '#14b8a6', strokeWidth: 2, fill: '#14b8a620', text: 'Launch Plan', cornerRadius: 22 },
      // Sub-nodes left
      { id: nanoid(), type: 'rect', x: 30, y: 20, width: 80, height: 30, stroke: '#3b82f6', strokeWidth: 1, fill: '#3b82f610', text: 'Surveys', cornerRadius: 15 },
      { id: nanoid(), type: 'rect', x: 30, y: 140, width: 80, height: 30, stroke: '#10b981', strokeWidth: 1, fill: '#10b98110', text: 'Interviews', cornerRadius: 15 },
      { id: nanoid(), type: 'rect', x: 30, y: 360, width: 80, height: 30, stroke: '#f59e0b', strokeWidth: 1, fill: '#f59e0b10', text: 'Q1 Goals', cornerRadius: 15 },
      // Connecting arrows
      { id: nanoid(), type: 'line', x: 160, y: 103, points: [0, 0, 160, 110], stroke: '#3b82f640', strokeWidth: 2 },
      { id: nanoid(), type: 'line', x: 160, y: 213, points: [0, 0, 160, 0], stroke: '#10b98140', strokeWidth: 2 },
      { id: nanoid(), type: 'line', x: 160, y: 323, points: [0, 0, 160, -110], stroke: '#f59e0b40', strokeWidth: 2 },
      { id: nanoid(), type: 'line', x: 440, y: 213, points: [0, 0, 140, -130], stroke: '#ef444440', strokeWidth: 2 },
      { id: nanoid(), type: 'line', x: 440, y: 213, points: [0, 0, 140, 0], stroke: '#ec489940', strokeWidth: 2 },
      { id: nanoid(), type: 'line', x: 440, y: 213, points: [0, 0, 140, 110], stroke: '#14b8a640', strokeWidth: 2 },
    ]
  },
  {
    id: 'mobile-wireframe',
    name: 'Mobile App Wireframe',
    description: 'Three key screens: Onboarding, Home, and Profile.',
    elements: [
      // --- Screen 1: Onboarding ---
      { id: nanoid(), type: 'frame', x: 30, y: 30, width: 200, height: 400, stroke: '#6366f1', strokeWidth: 1.5, fill: '#0a0a1a', text: 'Onboarding' },
      { id: nanoid(), type: 'rect', x: 75, y: 80, width: 110, height: 120, stroke: '#6366f120', strokeWidth: 1, fill: '#6366f110', text: '🖼️ Hero Image', cornerRadius: 8 },
      { id: nanoid(), type: 'text', x: 55, y: 215, width: 150, height: 30, stroke: '#ffffff', strokeWidth: 0, text: 'Welcome to App', fontSize: 14, fontStyle: 'bold' },
      { id: nanoid(), type: 'text', x: 55, y: 248, width: 150, height: 40, stroke: '#ffffff80', strokeWidth: 0, text: 'The best tool for your workflow.', fontSize: 10 },
      { id: nanoid(), type: 'rect', x: 55, y: 300, width: 150, height: 40, stroke: '#6366f1', strokeWidth: 0, fill: '#6366f1', text: 'Get Started →', cornerRadius: 20, fontSize: 12 },
      { id: nanoid(), type: 'rect', x: 55, y: 355, width: 150, height: 36, stroke: '#6366f150', strokeWidth: 1, fill: 'transparent', text: 'Sign In', cornerRadius: 18, fontSize: 12 },
      // --- Screen 2: Home ---
      { id: nanoid(), type: 'frame', x: 260, y: 30, width: 200, height: 400, stroke: '#10b981', strokeWidth: 1.5, fill: '#0a0a1a', text: 'Home Feed' },
      { id: nanoid(), type: 'rect', x: 270, y: 55, width: 180, height: 35, stroke: '#ffffff10', strokeWidth: 1, fill: '#ffffff08', text: '🔍  Search...', cornerRadius: 17 },
      { id: nanoid(), type: 'rect', x: 270, y: 105, width: 180, height: 100, stroke: '#10b98130', strokeWidth: 1, fill: '#10b98110', text: '🃏 Card Item', cornerRadius: 8 },
      { id: nanoid(), type: 'rect', x: 270, y: 215, width: 180, height: 100, stroke: '#10b98130', strokeWidth: 1, fill: '#10b98110', text: '🃏 Card Item', cornerRadius: 8 },
      { id: nanoid(), type: 'rect', x: 270, y: 324, width: 180, height: 36, stroke: '#ffffff10', strokeWidth: 1, fill: '#ffffff08', text: '🏠  Feed    🔔  Alerts    👤  Me', cornerRadius: 18 },
      // --- Screen 3: Profile ---
      { id: nanoid(), type: 'frame', x: 490, y: 30, width: 200, height: 400, stroke: '#f59e0b', strokeWidth: 1.5, fill: '#0a0a1a', text: 'Profile' },
      { id: nanoid(), type: 'circle', x: 545, y: 90, radius: 35, stroke: '#f59e0b', strokeWidth: 2, fill: '#f59e0b20', text: 'AV' },
      { id: nanoid(), type: 'text', x: 500, y: 165, width: 180, height: 20, stroke: '#ffffff', strokeWidth: 0, text: 'Alex Vasquez', fontSize: 13, fontStyle: 'bold' },
      { id: nanoid(), type: 'text', x: 500, y: 188, width: 180, height: 16, stroke: '#ffffff60', strokeWidth: 0, text: '@alexv · 234 posts', fontSize: 10 },
      { id: nanoid(), type: 'rect', x: 500, y: 215, width: 180, height: 36, stroke: '#f59e0b50', strokeWidth: 1, fill: '#f59e0b15', text: 'Edit Profile', cornerRadius: 18 },
      { id: nanoid(), type: 'rect', x: 500, y: 265, width: 180, height: 40, stroke: '#ffffff08', strokeWidth: 1, fill: '#ffffff05', text: '⚙️  Settings', cornerRadius: 8 },
      { id: nanoid(), type: 'rect', x: 500, y: 315, width: 180, height: 40, stroke: '#ffffff08', strokeWidth: 1, fill: '#ffffff05', text: '🔔  Notifications', cornerRadius: 8 },
    ]
  },
  {
    id: 'agile-story-map',
    name: 'Agile User Story Map',
    description: 'Two-dimensional story map with activities, tasks, and releases.',
    elements: [
      // Header row - Activities
      { id: nanoid(), type: 'rect', x: 30, y: 30, width: 130, height: 45, stroke: '#6366f1', strokeWidth: 2, fill: '#6366f130', text: '🧭 Discover', cornerRadius: 8 },
      { id: nanoid(), type: 'rect', x: 180, y: 30, width: 130, height: 45, stroke: '#8b5cf6', strokeWidth: 2, fill: '#8b5cf630', text: '✏️ Define', cornerRadius: 8 },
      { id: nanoid(), type: 'rect', x: 330, y: 30, width: 130, height: 45, stroke: '#3b82f6', strokeWidth: 2, fill: '#3b82f630', text: '🏗️ Build', cornerRadius: 8 },
      { id: nanoid(), type: 'rect', x: 480, y: 30, width: 130, height: 45, stroke: '#10b981', strokeWidth: 2, fill: '#10b98130', text: '🚀 Launch', cornerRadius: 8 },
      // Task row - user tasks
      { id: nanoid(), type: 'rect', x: 30, y: 100, width: 130, height: 35, stroke: '#6366f150', strokeWidth: 1, fill: '#6366f110', text: 'User research', cornerRadius: 4 },
      { id: nanoid(), type: 'rect', x: 180, y: 100, width: 130, height: 35, stroke: '#8b5cf650', strokeWidth: 1, fill: '#8b5cf610', text: 'Write specs', cornerRadius: 4 },
      { id: nanoid(), type: 'rect', x: 330, y: 100, width: 130, height: 35, stroke: '#3b82f650', strokeWidth: 1, fill: '#3b82f610', text: 'Build MVP', cornerRadius: 4 },
      { id: nanoid(), type: 'rect', x: 480, y: 100, width: 130, height: 35, stroke: '#10b98150', strokeWidth: 1, fill: '#10b98110', text: 'Beta release', cornerRadius: 4 },
      // Release 1 label
      { id: nanoid(), type: 'text', x: 10, y: 160, width: 80, height: 20, stroke: '#f59e0b', strokeWidth: 0, text: 'Release 1', fontSize: 10, fontStyle: 'bold' },
      { id: nanoid(), type: 'line', x: 0, y: 160, points: [0, 10, 640, 10], stroke: '#f59e0b40', strokeWidth: 1 },
      // Release 1 stories
      { id: nanoid(), type: 'sticky', x: 30, y: 170, width: 125, height: 55, stroke: 'transparent', strokeWidth: 0, fill: '#ede9fe', text: 'As a user, I can sign up with email' },
      { id: nanoid(), type: 'sticky', x: 180, y: 170, width: 125, height: 55, stroke: 'transparent', strokeWidth: 0, fill: '#ede9fe', text: 'User can view product list' },
      { id: nanoid(), type: 'sticky', x: 330, y: 170, width: 125, height: 55, stroke: 'transparent', strokeWidth: 0, fill: '#dbeafe', text: 'Basic CRUD for items' },
      // Release 2 label
      { id: nanoid(), type: 'text', x: 10, y: 250, width: 80, height: 20, stroke: '#10b981', strokeWidth: 0, text: 'Release 2', fontSize: 10, fontStyle: 'bold' },
      { id: nanoid(), type: 'line', x: 0, y: 250, points: [0, 10, 640, 10], stroke: '#10b98140', strokeWidth: 1 },
      { id: nanoid(), type: 'sticky', x: 30, y: 260, width: 125, height: 55, stroke: 'transparent', strokeWidth: 0, fill: '#d1fae5', text: 'OAuth social login' },
      { id: nanoid(), type: 'sticky', x: 180, y: 260, width: 125, height: 55, stroke: 'transparent', strokeWidth: 0, fill: '#d1fae5', text: 'Advanced search & filters' },
      { id: nanoid(), type: 'sticky', x: 330, y: 260, width: 125, height: 55, stroke: 'transparent', strokeWidth: 0, fill: '#fef3c7', text: 'Analytics dashboard' },
      { id: nanoid(), type: 'sticky', x: 480, y: 260, width: 125, height: 55, stroke: 'transparent', strokeWidth: 0, fill: '#fef3c7', text: 'Paid plan checkout' },
    ]
  },
];
