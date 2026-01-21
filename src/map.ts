/**
 * Map utilities for India state-level visualization
 */

import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature } from 'geojson';

export interface StateFeature extends Feature {
  properties: {
    st_nm: string;
    st_code: string;
    id?: string;
  };
}

export interface StateMetadata {
  id: string;
  name: string;
  centroid: [number, number];
  regionGroup?: string;
}

export interface DistrictFeature extends Feature {
  properties: {
    dt_nm?: string;
    dt_code?: string;
    st_nm?: string;
    st_code?: string;
    id?: string;
  };
}

export interface DistrictMetadata {
  id: string;
  name: string;
  stateId: string;
  stateName: string;
  centroid: [number, number];
}

let indiaTopology: Topology | null = null;
let stateFeatures: StateFeature[] = [];
let districtFeatures: DistrictFeature[] = [];
let stateMetadataMap: Map<string, StateMetadata> = new Map();
let districtMetadataMap: Map<string, DistrictMetadata> = new Map();
let stateToDistrictsMap: Map<string, DistrictMetadata[]> = new Map();
let projection: d3.GeoProjection | null = null;
let pathGenerator: d3.GeoPath | null = null;

/**
 * Load and parse the India TopoJSON
 */
export async function loadIndiaMap(): Promise<void> {
  try {
    const response = await fetch('/india.json');
    const topology = await response.json() as Topology;
    indiaTopology = topology;

    // Extract state features from the topology
    const statesCollection = topology.objects.states as GeometryCollection;
    const features = feature(topology, statesCollection) as FeatureCollection;
    stateFeatures = features.features as StateFeature[];

    // Extract district features from the topology
    const districtsCollection = topology.objects.districts as GeometryCollection;
    if (districtsCollection) {
      const districtFeaturesCollection = feature(topology, districtsCollection) as FeatureCollection;
      districtFeatures = districtFeaturesCollection.features as DistrictFeature[];
    }

    // Set up projection - using geoIdentity since TopoJSON might already be projected
    // If not, we'll use a suitable projection for India
    const bounds = d3.geoBounds(features);
    const width = 1000;
    const height = 1000;
    
    projection = d3.geoMercator()
      .scale(1200)
      .center([80, 22])
      .translate([width / 2, height / 2]);

    pathGenerator = d3.geoPath().projection(projection);

    // Build state metadata map with centroids
    stateFeatures.forEach((feature) => {
      if (!feature.properties) return;
      
      const stateName = feature.properties.st_nm;
      const stateCode = feature.properties.st_code;
      const stateId = `IN_${stateCode}`;
      
      // Calculate centroid
      const centroid = pathGenerator!.centroid(feature) as [number, number];
      
      // Determine region group (rough approximation)
      const regionGroup = getRegionGroup(stateName);
      
      stateMetadataMap.set(stateId, {
        id: stateId,
        name: stateName,
        centroid,
        regionGroup
      });
    });

    // Build district metadata map with centroids
    districtFeatures.forEach((feature) => {
      if (!feature.properties) return;
      
      // TopoJSON uses "district" property, not "dt_nm"
      const districtName = (feature.properties.district as string) || 
                          (feature.properties.dt_nm as string) || 
                          (feature.properties.name as string) || '';
      const districtCode = (feature.properties.dt_code as string) || '';
      const stateName = (feature.properties.st_nm as string) || '';
      const stateCode = (feature.properties.st_code as string) || '';
      const stateId = `IN_${stateCode}`;
      const districtId = `DIST_${stateCode}_${districtCode}`;
      
      if (!districtName || !districtCode) {
        console.warn('Skipping district with missing name or code:', feature.properties);
        return;
      }
      
      // Calculate centroid
      const centroid = pathGenerator!.centroid(feature) as [number, number];
      
      const districtMetadata: DistrictMetadata = {
        id: districtId,
        name: districtName,
        stateId,
        stateName,
        centroid
      };
      
      districtMetadataMap.set(districtId, districtMetadata);
      
      // Build state -> districts mapping
      if (!stateToDistrictsMap.has(stateId)) {
        stateToDistrictsMap.set(stateId, []);
      }
      stateToDistrictsMap.get(stateId)!.push(districtMetadata);
    });
  } catch (error) {
    console.error('Failed to load India map:', error);
    throw error;
  }
}

/**
 * Get region group for a state (rough approximation)
 */
function getRegionGroup(stateName: string): string {
  const name = stateName.toLowerCase();
  if (name.includes('tamil') || name.includes('kerala') || name.includes('karnataka') || 
      name.includes('andhra') || name.includes('telangana')) {
    return 'South';
  } else if (name.includes('punjab') || name.includes('haryana') || name.includes('delhi') ||
             name.includes('rajasthan') || name.includes('uttar') || name.includes('himachal')) {
    return 'North';
  } else if (name.includes('west bengal') || name.includes('odisha') || name.includes('bihar') ||
             name.includes('jharkhand')) {
    return 'East';
  } else if (name.includes('maharashtra') || name.includes('gujarat') || name.includes('goa')) {
    return 'West';
  } else if (name.includes('assam') || name.includes('manipur') || name.includes('nagaland') ||
             name.includes('meghalaya') || name.includes('tripura') || name.includes('arunachal')) {
    return 'Northeast';
  }
  return 'Other';
}

/**
 * Render the India map to an SVG element
 */
export function renderMap(svgElement: SVGSVGElement): void {
  if (!pathGenerator || !stateFeatures.length) {
    throw new Error('Map not loaded. Call loadIndiaMap() first.');
  }

  const svg = d3.select(svgElement);
  
  // Clear existing content but preserve structure
  svg.select('.map-group').selectAll('*').remove();
  
  // Get or create map group (for zooming)
  let mapGroup = svg.select('.map-group');
  if (mapGroup.empty()) {
    mapGroup = svg.append('g').attr('class', 'map-group');
  }

  // Add a group for state paths inside map-group
  const statesGroup = mapGroup.append('g').attr('class', 'states');
  
  // Add a group for district paths (initially hidden, shown when highlighting)
  const districtsGroup = mapGroup.append('g').attr('class', 'districts').attr('opacity', 0);

  // Render each state
  statesGroup.selectAll('path')
    .data(stateFeatures)
    .enter()
    .append('path')
    .attr('d', pathGenerator!)
    .attr('class', 'state')
    .attr('id', (d) => {
      const code = d.properties?.st_code || '';
      return `IN_${code}`;
    })
    .attr('data-state-name', (d) => d.properties?.st_nm || '');

  // Render districts (for highlighting)
  districtsGroup.selectAll('path')
    .data(districtFeatures)
    .enter()
    .append('path')
    .attr('d', pathGenerator!)
    .attr('class', 'district')
    .attr('id', (d) => {
      const stateCode = (d.properties?.st_code as string) || '';
      const districtCode = (d.properties?.dt_code as string) || '';
      return `DIST_${stateCode}_${districtCode}`;
    })
    .attr('data-district-name', (d) => {
      return (d.properties?.district as string) || 
             (d.properties?.dt_nm as string) || 
             (d.properties?.name as string) || '';
    })
    .attr('data-state-id', (d) => {
      const code = (d.properties?.st_code as string) || '';
      return `IN_${code}`;
    });
}

/**
 * Get state metadata by ID
 */
export function getStateMetadata(stateId: string): StateMetadata | undefined {
  return stateMetadataMap.get(stateId);
}

/**
 * Get state metadata by name (with fuzzy matching)
 */
export function findStateByName(stateName: string): StateMetadata | undefined {
  const normalized = normalizeStateName(stateName);
  
  for (const [id, metadata] of stateMetadataMap.entries()) {
    if (normalizeStateName(metadata.name) === normalized) {
      return metadata;
    }
  }
  
  // Try fuzzy matching
  for (const [id, metadata] of stateMetadataMap.entries()) {
    const metaName = normalizeStateName(metadata.name);
    if (metaName.includes(normalized) || normalized.includes(metaName)) {
      return metadata;
    }
  }
  
  return undefined;
}

/**
 * Normalize state name for matching
 */
function normalizeStateName(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/and/g, '')
    .trim();
}

/**
 * Get centroid for a state
 */
export function getStateCentroid(stateId: string): [number, number] | null {
  const metadata = getStateMetadata(stateId);
  return metadata?.centroid || null;
}

/**
 * Get all state features
 */
export function getStateFeatures(): StateFeature[] {
  return stateFeatures;
}

/**
 * Get path generator for drawing connections
 */
export function getPathGenerator(): d3.GeoPath | null {
  return pathGenerator;
}

/**
 * Get district metadata by ID
 */
export function getDistrictMetadata(districtId: string): DistrictMetadata | undefined {
  return districtMetadataMap.get(districtId);
}

/**
 * Find district by name within a state (with fuzzy matching)
 */
export function findDistrictByName(districtName: string, stateId: string): DistrictMetadata | undefined {
  const districts = stateToDistrictsMap.get(stateId);
  if (!districts) return undefined;
  
  const normalized = normalizeDistrictName(districtName);
  
  // Exact match first
  for (const district of districts) {
    if (normalizeDistrictName(district.name) === normalized) {
      return district;
    }
  }
  
  // Fuzzy match
  for (const district of districts) {
    const districtNameNorm = normalizeDistrictName(district.name);
    if (districtNameNorm.includes(normalized) || normalized.includes(districtNameNorm)) {
      return district;
    }
  }
  
  return undefined;
}

/**
 * Normalize district name for matching
 */
function normalizeDistrictName(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/district/gi, '')
    .replace(/and/g, '')
    .trim();
}

/**
 * Get districts for a state
 */
export function getDistrictsForState(stateId: string): DistrictMetadata[] {
  return stateToDistrictsMap.get(stateId) || [];
}

/**
 * Get centroid for a district
 */
export function getDistrictCentroid(districtId: string): [number, number] | null {
  const metadata = getDistrictMetadata(districtId);
  return metadata?.centroid || null;
}

/**
 * Create a curved path between two points
 */
export function createCurvedPath(
  from: [number, number],
  to: [number, number]
): string {
  const midX = (from[0] + to[0]) / 2;
  const midY = (from[1] + to[1]) / 2;
  
  // Add some curvature
  const controlOffset = 50;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const perpX = -dy;
  const perpY = dx;
  const len = Math.sqrt(perpX * perpX + perpY * perpY);
  const controlX = midX + (perpX / len) * controlOffset;
  const controlY = midY + (perpY / len) * controlOffset;
  
  return `M ${from[0]} ${from[1]} Q ${controlX} ${controlY} ${to[0]} ${to[1]}`;
}
