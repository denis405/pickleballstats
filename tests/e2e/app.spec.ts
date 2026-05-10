import { expect, test } from '@playwright/test'

test('creates players, generates a round, and records a score', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Players' }).click()

  for (const name of ['Ana', 'Ben', 'Chloe', 'Diego']) {
    await page.getByPlaceholder('Player name').fill(name)
    await page.getByRole('button', { name: 'Add' }).click()
  }

  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByRole('button', { name: 'Select active' }).click()
  await page.getByRole('button', { name: 'Generate round' }).click()

  await expect(page.getByText('Current round')).toBeVisible()
  await page.getByRole('button', { name: 'Increase A' }).click()
  await page.getByRole('button', { name: 'Increase A' }).click()
  await page.getByRole('button', { name: 'Increase B' }).click()
  await page.getByRole('button', { name: 'Finish match' }).click()

  await expect(page.getByText('Team A')).toBeVisible()
  await page.getByRole('button', { name: 'Stats' }).click()
  await expect(page.getByText('Match history')).toBeVisible()
})
