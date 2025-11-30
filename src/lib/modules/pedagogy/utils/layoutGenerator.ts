import { mulberry32 } from '$lib/core/utils/prng';

export interface NodeData {
  id: string;
  title: string;
  type: 'core' | 'social' | 'pragmatic' | 'abstract' | 'complex' | 'spatial';
  status: 'locked' | 'active' | 'mastered';
  x: number;
  y: number;
  parents: string[];
  activated?: boolean; // For "The Bridge" visual effect
  decay?: number; // 0 (Fresh) to 1 (Faded) - For "Trace Decay"
}

/**
 * Generates a deterministic "constellation" layout based on a seed.
 * The layout is organic but consistent for the same seed.
 */
export function generateConstellation(seed: string): NodeData[] {
  // Hash the seed string to get a number for the PRNG
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNum = ((seedNum << 5) - seedNum) + seed.charCodeAt(i);
    seedNum |= 0;
  }
  
  const random = mulberry32(Math.abs(seedNum));

  // Base Nodes Configuration (The "DNA" of the curriculum)
  // We define the topology, but the positions will be jittered/generated
  const baseNodes = [
    { id: 'root', title: 'Sovereign Self', type: 'core', parents: [] },
    
    // Social Branch
    { id: 'soc-1', title: 'Greeting Protocol', type: 'social', parents: ['root'] },
    { id: 'soc-2', title: 'Social Dynamics', type: 'social', parents: ['soc-1'] },
    { id: 'soc-3', title: 'Conflict Res.', type: 'social', parents: ['soc-2'] },

    // Pragmatic Branch
    { id: 'prag-1', title: 'Market Exchange', type: 'pragmatic', parents: ['root'] },
    { id: 'prag-2', title: 'Negotiation', type: 'pragmatic', parents: ['prag-1'] },
    { id: 'prag-3', title: 'Resource Mgmt', type: 'pragmatic', parents: ['prag-2'] },

    // Abstract Branch
    { id: 'abs-1', title: 'Navigation', type: 'spatial', parents: ['root'] },
    { id: 'abs-2', title: 'Temporal Logic', type: 'abstract', parents: ['abs-1'] },
    { id: 'abs-3', title: 'Causality', type: 'abstract', parents: ['abs-1'] },
  ];

  const nodes: NodeData[] = [];
  const center = { x: 50, y: 50 };

  // Helper to add jitter
  const jitter = (amount: number) => (random() - 0.5) * amount;

  // 1. Place Root
  nodes.push({
    ...baseNodes[0],
    status: 'mastered',
    x: center.x,
    y: center.y,
    type: baseNodes[0].type as any
  });

  // 2. Place Branches
  // We'll define rough angles for each branch to ensure separation
  const branchAngles = {
    social: -135, // Top Left (degrees)
    pragmatic: -45, // Top Right
    spatial: 110,   // Bottom Left-ish
    abstract: 70    // Bottom Right-ish
  };

  // Track branch depths to calculate radius
  const branchDepths: Record<string, number> = {};

  for (let i = 1; i < baseNodes.length; i++) {
    const nodeDef = baseNodes[i];
    const parentId = nodeDef.parents[0];
    const parent = nodes.find(n => n.id === parentId);
    
    if (!parent) continue;

    // Determine branch type for angle
    const branchType = nodeDef.type === 'spatial' ? 'spatial' : 
                       nodeDef.type === 'abstract' ? 'abstract' :
                       nodeDef.type === 'social' ? 'social' : 'pragmatic';
    
    // Count existing siblings to fan out
    const siblings = nodes.filter(n => n.parents.includes(parentId));
    const siblingIndex = siblings.length;
    
    // Calculate position
    // Base angle + random variation + sibling fan-out
    const baseAngleRad = (branchAngles[branchType] * Math.PI) / 180;
    
    // Fan out siblings: if there are multiple, spread them
    // We alternate left/right for siblings: 0, +0.3, -0.3, +0.6...
    const fanOffset = siblingIndex === 0 ? 0 : 
                      (siblingIndex % 2 === 0 ? -1 : 1) * Math.ceil(siblingIndex / 2) * 0.4;

    const angleVariation = jitter(0.2); 
    const angle = baseAngleRad + angleVariation + fanOffset;

    // Distance from parent (radius)
    // We want them to radiate out.
    // Distance should be roughly 12-18% of view width
    const distance = 12 + random() * 6; 
    
    const x = parent.x + Math.cos(angle) * distance;
    const y = parent.y + Math.sin(angle) * distance;

    // Determine status (Mock logic)
    // In a real app, this comes from the backend.
    // For now, we'll make the first node of each branch active/mastered
    let status: 'locked' | 'active' | 'mastered' = 'locked';
    if (parentId === 'root') status = 'active';
    if (nodeDef.id === 'soc-1') status = 'mastered';
    if (nodeDef.id === 'soc-2') status = 'active';

    // Trace Decay Simulation
    // Mastered nodes might be decaying if not visited recently
    let decay = 0;
    if (status === 'mastered') {
      decay = 0.3 + (random() * 0.4); // 0.3 to 0.7 decay
    } else if (status === 'active') {
      decay = random() * 0.2; // Slight decay for active
    }

    nodes.push({
      ...nodeDef,
      status,
      x,
      y,
      type: nodeDef.type as any,
      decay
    });
  }

  return nodes;
}

/**
 * Generates new nodes branching from a specific parent.
 * Used for "Sovereign Expansion" where the user chooses which path to cultivate.
 */
export function generateBranchNodes(parent: NodeData, seed: string, existingNodes: NodeData[] = []): NodeData[] {
  // Hash seed + parentId for unique branch generation
  let seedNum = 0;
  const combinedSeed = seed + parent.id;
  for (let i = 0; i < combinedSeed.length; i++) {
    seedNum = ((seedNum << 5) - seedNum) + combinedSeed.charCodeAt(i);
    seedNum |= 0;
  }
  
  const random = mulberry32(Math.abs(seedNum));
  const jitter = (amount: number) => (random() - 0.5) * amount;

  const newNodes: NodeData[] = [];
  const count = 2 + Math.floor(random() * 2); // 2 or 3 new nodes

  // Determine base angle from parent's position relative to (50,50)
  const dx = parent.x - 50;
  const dy = parent.y - 50;
  const parentAngle = Math.atan2(dy, dx);

  // Helper to check collision
  const isTooClose = (x: number, y: number, nodes: NodeData[], minDistance: number = 8) => {
    return nodes.some(n => {
      const dist = Math.sqrt(Math.pow(n.x - x, 2) + Math.pow(n.y - y, 2));
      return dist < minDistance;
    });
  };

  for (let i = 0; i < count; i++) {
    let bestX = parent.x;
    let bestY = parent.y;
    let foundSpot = false;

    // Try multiple times to find a spot
    for (let attempt = 0; attempt < 10; attempt++) {
      // Spread them out in a fan shape
      const angleOffset = (i - (count - 1) / 2) * 0.5; // +/- radians
      const angle = parentAngle + angleOffset + jitter(0.4 + (attempt * 0.1)); // Increase jitter on retry
      
      const distance = 10 + random() * 5 + (attempt * 2); // Increase distance on retry

      const x = parent.x + Math.cos(angle) * distance;
      const y = parent.y + Math.sin(angle) * distance;

      // Check against existing nodes AND new nodes being created
      if (!isTooClose(x, y, [...existingNodes, ...newNodes])) {
        bestX = x;
        bestY = y;
        foundSpot = true;
        break;
      }
    }

    // If we couldn't find a spot, we place it anyway but maybe further out?
    // For now, we use the last attempt's position which is likely the best we got.

    const id = `${parent.id}-sub-${Math.floor(random() * 1000)}`;
    
    // Generate a title based on parent type (Mock)
    const titles = parent.type === 'social' ? ['Deep Listening', 'Empathy', 'Persuasion', 'Charisma'] :
                   parent.type === 'pragmatic' ? ['Bartering', 'Contract Law', 'Supply Chain', 'Logistics'] :
                   parent.type === 'spatial' ? ['Mapping', 'Orienteering', 'Astronomy', 'Geology'] :
                   ['Logic', 'Philosophy', 'Ethics', 'Metaphysics'];
    
    const title = titles[Math.floor(random() * titles.length)];

    newNodes.push({
      id,
      title,
      type: parent.type,
      status: 'locked', // New nodes start locked
      x: bestX,
      y: bestY,
      parents: [parent.id]
    });
  }

  return newNodes;
}
