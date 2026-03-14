import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCakeMasonryColumns,
  getCakeDetailById,
  resolveCakeFeed,
} from '../miniprogram/utils/customer-cake-catalog'

test('returns a cake detail record by product id', () => {
  const cake = getCakeDetailById('cake-cloud')

  assert.equal(cake.title, '云朵鲜奶生日蛋糕')
  assert.equal(cake.detailImages.length > 0, true)
})

test('filters by keyword and sorts by monthly sales', () => {
  const cakes = resolveCakeFeed({ keyword: '云朵', sortMode: 'sales-desc' })

  assert.equal(cakes.length, 1)
  assert.equal(cakes[0]?.id, 'cake-cloud')
})

test('splits cards into two waterfall columns using image height as the balancing weight', () => {
  const [leftColumn, rightColumn] = buildCakeMasonryColumns(
    resolveCakeFeed({ keyword: '', sortMode: 'sales-desc' }),
  )

  assert.equal(leftColumn.length > 0, true)
  assert.equal(rightColumn.length > 0, true)
})

test('keeps customer cake media sources package-local to avoid unstable network loads', () => {
  const cakes = resolveCakeFeed({ keyword: '', sortMode: 'sales-desc' })

  cakes.forEach((cake) => {
    assert.match(cake.coverImage, /^\/assets\//)
    cake.gallery.forEach((image) => {
      assert.match(image.url, /^\/assets\//)
    })
    cake.detailImages.forEach((image) => {
      assert.match(image.url, /^\/assets\//)
    })
  })
})
