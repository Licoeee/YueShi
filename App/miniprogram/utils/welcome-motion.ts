export interface WelcomeParticle {
  id: string
  sizeRpx: number
  offsetX: number
  offsetY: number
  delayMs: number
  durationMs: number
  color: string
}

export interface WelcomeStateSnapshot {
  isButtonVisible: boolean
  isButtonReady: boolean
  isRevealing: boolean
  particles: WelcomeParticle[]
}

interface WelcomeParticleSeed {
  sizeRpx: number
  offsetX: number
  offsetY: number
  delayMs: number
  durationMs: number
  color: string
}

export const WELCOME_TIMINGS = {
  buttonRevealDelayMs: 120,
  buttonReadyDelayMs: 580,
  revealDurationMs: 760,
} as const

const REVEAL_PARTICLE_SEEDS: WelcomeParticleSeed[] = [
  { sizeRpx: 16, offsetX: -220, offsetY: -128, delayMs: 30, durationMs: 620, color: '#fff4f2' },
  { sizeRpx: 18, offsetX: -164, offsetY: -182, delayMs: 60, durationMs: 660, color: '#ffd8cc' },
  { sizeRpx: 14, offsetX: -86, offsetY: -208, delayMs: 90, durationMs: 600, color: '#ffd1dc' },
  { sizeRpx: 24, offsetX: 112, offsetY: -168, delayMs: 45, durationMs: 720, color: '#ffe4cf' },
  { sizeRpx: 20, offsetX: 206, offsetY: -92, delayMs: 80, durationMs: 700, color: '#feb47b' },
  { sizeRpx: 12, offsetX: -192, offsetY: 72, delayMs: 100, durationMs: 560, color: '#ff9c8a' },
  { sizeRpx: 22, offsetX: 142, offsetY: 128, delayMs: 120, durationMs: 760, color: '#fff5f7' },
  { sizeRpx: 18, offsetX: 228, offsetY: 88, delayMs: 150, durationMs: 680, color: '#ffd1dc' },
]

export function getWelcomeEntryTarget(): string {
  return 'pages/index/index'
}

export function createRevealParticles(): WelcomeParticle[] {
  return REVEAL_PARTICLE_SEEDS.map((seed, index) => ({
    id: `particle-${index}`,
    sizeRpx: seed.sizeRpx,
    offsetX: seed.offsetX,
    offsetY: seed.offsetY,
    delayMs: seed.delayMs,
    durationMs: seed.durationMs,
    color: seed.color,
  }))
}

export function getInitialWelcomeState(): WelcomeStateSnapshot {
  return {
    isButtonVisible: false,
    isButtonReady: false,
    isRevealing: false,
    particles: createRevealParticles(),
  }
}

export function canStartReveal(isButtonReady: boolean, isRevealing: boolean): boolean {
  return isButtonReady && !isRevealing
}
