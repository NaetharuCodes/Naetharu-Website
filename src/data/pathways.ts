export interface PathwayMeta {
  name: string;
  description: string;
  level: string;
}

export const pathways: Record<string, PathwayMeta> = {
  'az-104': {
    name: 'AZ-104: Azure Administrator',
    description: 'Covers the core administration topics tested in the Microsoft AZ-104 certification exam — storage, networking, identity, compute, monitoring, and scripting.',
    level: 'Associate',
  },
  'az-305': {
    name: 'AZ-305: Azure Solutions Architect',
    description: 'Covers the design and architecture topics tested in the Microsoft AZ-305 certification exam — identity, data, business continuity, application design, networking, and migration.',
    level: 'Expert',
  },
};
