import { test, expect } from '@playwright/test';

test.describe('UI OmniNotice: Проверка багов', () => {
  test('BUG: Отправка рассылки падает с 422 (отсутствует event_id)', async ({ page }) => {
    
    // Перехватываем ответ от API, чтобы проверить текст ошибки
    let apiErrorResponse: any = null;
    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/dispatches') && response.request().method() === 'POST') {
        if (response.status() === 422) {
          apiErrorResponse = await response.json();
        }
      }
    });

    // 1. Переходим на страницу Push-рассылки
    await page.goto('/create/push');
    await page.waitForTimeout(1000);

    // 2. Закрываем onboarding-модалку
    const skipTourBtn = page.getByRole('button', { name: 'Пропустить' });
    if (await skipTourBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipTourBtn.click();
      await page.waitForTimeout(1000); 
    }

    // 3. Заполняем форму
    await page.getByPlaceholder(/Например, Вам назначена задача/i).fill(`E2E Test ${Date.now()}`);
    await page.getByPlaceholder(/Введите текст уведомления/i).fill('Проверка UI бага');
    
    // 4. Выбираем приложение "Сигма"
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /Сигма/i }).first().click();
    await page.waitForTimeout(1500); 

    // 5. Отправляем
    await page.getByRole('button', { name: 'Отправить' }).first().click({ force: true });
    await page.waitForTimeout(1000);

    // 6. Подтверждаем отправку
    const confirmBtn = page.getByRole('button', { name: 'Отправить' }).last();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 7. ПРОВЕРКА БАГА: Ждем появления красной плашки об ошибке
    await expect(page.getByText('При отправке произошла ошибка').first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000); // Ждем, пока перехватится ответ

    // 8. Убеждаемся, что причина именно в отсутствии event_id
    expect(apiErrorResponse).not.toBeNull();
    expect(apiErrorResponse.detail.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(apiErrorResponse)).toContain('event_id');
    
    console.log('✅ БАГ ПОДТВЕРЖДЕН: Бэкенд вернул 422 (missing event_id), фронт показал ошибку.');
    
    // Пауза для красивого видео
    await page.waitForTimeout(2000);
  });
});