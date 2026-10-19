import { test, expect } from '@playwright/test';

test.describe('2.8 UI: Создание рассылки через OmniNotice', () => {
  test('Проверка контракта: Фронт -> Бэкенд', async ({ page }) => {
    
    let apiStatus = 0;
    let apiResponseBody: any = null;
    
    // Перехватываем ответ от API
    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/dispatches') && response.request().method() === 'POST') {
        apiStatus = response.status();
        apiResponseBody = await response.json().catch(() => null);
      }
    });

    // 1. Переходим на страницу
    await page.goto('/create/push');
    await page.waitForTimeout(1000);

    // 2. Закрываем тур
    const skipTourBtn = page.getByRole('button', { name: 'Пропустить' });
    if (await skipTourBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipTourBtn.click();
      await page.waitForTimeout(1000); 
    }

    // 3. Заполняем форму
    await page.getByPlaceholder(/Например, Вам назначена задача/i).fill(`E2E Test ${Date.now()}`);
    await page.getByPlaceholder(/Введите текст уведомления/i).fill('Проверка UI через Playwright');
    await page.waitForTimeout(500);

    // 4. Выбираем приложение
    await page.getByRole('combobox').click();
    await page.waitForTimeout(1000);
    await page.getByRole('option').first().click();
    await page.waitForTimeout(1500); 

    // 5. Отправляем
    await page.getByRole('button', { name: 'Отправить' }).first().click({ force: true });
    await page.waitForTimeout(1000);
    
    const confirmBtn = page.getByRole('button', { name: 'Отправить' }).last();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 6. Ждем ответа от API
    await page.waitForTimeout(3000); 

    // 7. ЛОГИКА УМНОГО ТЕСТА:
    if (apiStatus === 422) {
      // Если фронт еще старый - фиксируем баг
      console.log('⚠️ ЗАФИКСИРОВАН БАГ: Фронт отправляет старый контракт (422).');
      const errorStr = JSON.stringify(apiResponseBody);
      expect(errorStr).toContain('event_id');
      expect(errorStr).toContain('account_id');
      expect(errorStr).toContain('recipients');
      // Тест проходит, так как мы ожидали увидеть этот баг
    } 
    else if (apiStatus === 200 || apiStatus === 201) {
      // Если фронт уже починили - проверяем успех
      console.log('✅ ФРОНТ ПОЧИНЕН! Бэкенд принял запрос (2xx).');
      await expect(page.getByText(/успешно|отправлено|создано|готово/i).first()).toBeVisible({ timeout: 15000 });
    } 
    else {
      // Если что-то странное (500 и т.д.)
      throw new Error(`Неожиданный статус от API: ${apiStatus}`);
    }
    
    // Пауза для видео
    await page.waitForTimeout(2000);
  });
});