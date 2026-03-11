import assert from 'node:assert/strict'
import test from 'node:test'

import {
  WELCOME_TIMINGS,
  canStartReveal,
  createRevealParticles,
  finishRevealState,
  getInitialWelcomeState,
  getRevealDiameterPx,
  getWelcomeEntryTarget,
  startRevealState,
} from '../miniprogram/utils/welcome-motion'

test('resolves the welcome entry target to the placeholder home page', () => {
  assert.equal(getWelcomeEntryTarget(), 'pages/index/index')
})

test('creates renderable reveal particle seeds', () => {
  const particles = createRevealParticles()

  assert.equal(particles.length, 8)

  particles.forEach((particle, index) => {
    assert.equal(particle.id, `particle-${index}`)
    assert.ok(particle.sizeRpx >= 12 && particle.sizeRpx <= 28)
    assert.ok(particle.offsetX >= -260 && particle.offsetX <= 260)
    assert.ok(particle.offsetY >= -220 && particle.offsetY <= 180)
    assert.ok(particle.delayMs >= 0)
    assert.ok(particle.durationMs >= 480)
    assert.match(particle.color, /^#/)
  })
})

test('builds the initial welcome state with a locked CTA and prepared particles', () => {
  const state = getInitialWelcomeState()

  assert.equal(state.isButtonVisible, false)
  assert.equal(state.isButtonReady, false)
  assert.equal(state.isRevealing, false)
  assert.equal(state.isPreviewVisible, false)
  assert.equal(state.isHomeActive, false)
  assert.equal(state.particles.length, createRevealParticles().length)
})

test('allows reveal only when the CTA is ready and no reveal is active', () => {
  assert.equal(canStartReveal(false, false), false)
  assert.equal(canStartReveal(true, false), true)
  assert.equal(canStartReveal(true, true), false)
})

test('starts reveal by showing the destination preview before navigation', () => {
  const state = startRevealState()

  assert.equal(state.isButtonReady, false)
  assert.equal(state.isRevealing, true)
  assert.equal(state.isPreviewVisible, true)
  assert.equal(state.isHomeActive, false)
})

test('finishes reveal by handing control to the home state without extra navigation', () => {
  const state = finishRevealState()

  assert.equal(state.isRevealing, false)
  assert.equal(state.isPreviewVisible, true)
  assert.equal(state.isHomeActive, true)
})

test('calculates a reveal diameter large enough to cover the viewport corners', () => {
  const diameter = getRevealDiameterPx(390, 844)

  assert.ok(diameter > 930)
  assert.ok(diameter < 1100)
})

test('keeps the reveal animation deliberately slow enough for the handoff', () => {
  assert.ok(WELCOME_TIMINGS.revealDurationMs >= 1400)
})
