import * as THREE from 'three';

// Une seule scène par page : construite une fois, puis animée par Engine.
export const scene = new THREE.Scene();

export const world = {
  stations: [], hit: [], screens: [], lamps: [], glow: [], nightFade: [], plants: [], leds: [],
  spots: [], steam: [], clouds: [], chairs: [],
  neon: null, clock: null, dust: null, L: null, nav: null, tank: null, library: null, training: null,
};
