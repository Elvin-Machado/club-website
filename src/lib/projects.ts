import type { Project } from '../types';

/**
 * Data shape for the horizontal project deck and its bottom-sheet details panel.
 * Both the deck and the details sheet render from these entries only.
 */
export interface DeckProject {
  id: string;
  title: string;
  category: string;
  status: string;
  description: string;
  fullDescription: string;
  objective?: string;
  image: string;
  tech: string[];
  tags: string[];
  features: string[];
  url: string;
  repositoryUrl: string;
  /** True for conceptual showcase entries that are easy to swap for real projects. */
  isPlaceholder: boolean;
}

/** Extended detail for real projects, keyed by API project id. */
const DETAIL_CATALOG: Record<string, { category?: string; image?: string; objective?: string; fullDescription?: string; tech?: string[]; tags?: string[]; features?: string[] }> = {
  'i-laundroid': {
    category: 'Web Development',
    image: '/projects/i-laundroid.svg',
    objective: 'Simplify campus laundry logistics so students and administrators spend less time on coordination and more on what matters.',
    fullDescription:
      'A centralized laundry management platform connecting campus life with better logistics. It replaces scattered notes and manual queues with one organised place to request, track, and complete laundry cycles.\n\nThe platform brings students and administrators onto a shared view, so pickups, deliveries, and order status stay clear for everyone involved.',
    tech: ['Full-stack web', 'Databases', 'APIs'],
    tags: ['Campus', 'Logistics', 'Web App'],
    features: ['Centralised booking and order tracking', 'Campus-wide pickup and delivery coordination', 'Student and administrator dashboards', 'Status updates for every stage of a cycle'],
  },
};

const PLACEHOLDER_NOTE =
  'Conceptual showcase — a placeholder to be replaced once the club ships a real project.';

/**
 * Placeholder projects give the deck a finished look while recruitment organises
 * the next build. Swap or delete an entry here to remove one.
 */
const PLACEHOLDER_PROJECTS: DeckProject[] = [
  {
    id: 'orbital',
    title: 'ORBITAL',
    category: 'Space Technology',
    status: 'Conceptual showcase',
    description: 'A conceptual platform for visualizing orbital objects, satellite trajectories, and space mission data.',
    objective: 'Make the orbits racing above us legible: a visual tool for exploring satellites, trajectories, and mission data.',
    fullDescription:
      'ORBITAL is a conceptual platform designed to turn dense space-mission data into an interactive, explorable sky.\n\nIt visualizes orbital objects and satellite trajectories in real time, letting viewers follow active constellations, observe ground tracks, and browse mission telemetry without needing a space-ops background. It is an exercise in visualization and research tooling — not an active club mission.',
    image: '/projects/orbital.svg',
    tech: ['React / TypeScript', 'WebGL', 'Data Visualization'],
    tags: ['Space Tech', 'Visualization', 'Research'],
    features: ['Live orbital-track models', 'Satellite and constellation browser', 'Mission data overlays', 'Research-friendly visualizations'],
    url: '',
    repositoryUrl: '',
    isPlaceholder: true,
  },
  {
    id: 'sentinel',
    title: 'SENTINEL',
    category: 'AI & Intelligent Systems',
    status: 'Conceptual showcase',
    description: 'A conceptual AI-powered monitoring system designed to analyze incoming data, identify unusual patterns, and provide actionable insights.',
    objective: 'Watch streams of data and surface the anomalies that matter before they become problems.',
    fullDescription:
      'SENTINEL is a conceptual intelligent monitoring system that continuously analyzes incoming data, flags unusual patterns, and distills them into actionable insights.\n\nBuilt around anomaly detection and automation, it is designed as a research scaffold for studying how machine-learning models can summarize noisy streams — a learning exercise rather than a deployed service.',
    image: '/projects/sentinel.svg',
    tech: ['Python', 'Machine Learning', 'Data Pipelines'],
    tags: ['Artificial Intelligence', 'Data Science', 'Automation'],
    features: ['Streaming anomaly detection', 'Pattern summarization', 'Automated insight reports', 'Explainable model outputs'],
    url: '',
    repositoryUrl: '',
    isPlaceholder: true,
  },
];

/** Build the deck from backend projects, enriched with catalog details plus placeholders. */
export function buildDeckProjects(projects: Project[]): DeckProject[] {
  const real = projects
    .filter(project => project.published !== false)
    .map((project): DeckProject => {
      const detail = DETAIL_CATALOG[project.id] ?? {};
      return {
        id: project.id,
        title: project.title,
        category: detail.category ?? project.domain ?? 'Nucleus project',
        status: project.status ?? 'Club project',
        description: project.description,
        objective: detail.objective,
        fullDescription: detail.fullDescription ?? project.description,
        image: detail.image ?? '/projects/project-cover.svg',
        tech: detail.tech ?? [],
        tags: detail.tags ?? [project.domain ?? 'Nucleus'],
        features: detail.features ?? [],
        url: project.url ?? '',
        repositoryUrl: project.repositoryUrl ?? '',
        isPlaceholder: false,
      };
    });

  if (!real.length) return [];
  return [...real, ...PLACEHOLDER_PROJECTS.map(project => ({ ...project, fullDescription: `${project.fullDescription}\n\n${PLACEHOLDER_NOTE}` }))];
}