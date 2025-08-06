/**
 * Понимает области применения и может написать web worker (web/service/shared)
 */

// ------------------------------------------------------------

/**
 * Web Worker — это способ запустить отдельный JS-код в фоновом потоке браузера,
 * чтобы не тормозить пользовательский интерфейс. Всё тяжёлое — «в воркер», чтобы страница не зависала.
 *
 * Программисту доступны три вида воркеров:
 * - Web Worker (dedicated) — отдельный поток только для одной страницы.
 * - Shared Worker — разделяемый сразу между несколькими вкладками/окнами.
 * - Service Worker — фоновый “прокси” между сайтом и сетью, нужен для кеша, работы офлайн, пушей и т.п.
 */

/**
 * 1. Web Worker (dedicated)
 *
 * Когда нужен:
 * Когда надо выполнить какую-то тяжёлую логику (например, обработать массив из 100,000 элементов,
 * почитать архив или рендерить PDF), не блокируя интерфейс.
 *
 * Реальный пример:
 * Пользователь загружает 10 МБ Excel-файл, который надо разобрать и посчитать статистику.
 * Если сделать это в основном потоке — браузер повиснет. Если в воркере — UI всегда отзывчивый.
 */

// types.ts
export interface HeavyRequest {
  data: Array<number>;
}
export interface HeavyResponse {
  result: number;
}

// heavy-calc.ts
export const heavyCalc = (data: Array<number>): number => {
  return data.reduce((sum, num) => (sum + num) * 10 ** 6, 0);
};

// worker.ts
self.onmessage = (e: MessageEvent<HeavyRequest>) => {
  const result = heavyCalc(e.data.data); // тяжелая функция
  const response: HeavyResponse = { result };
  (self as DedicatedWorkerGlobalScope).postMessage(response);
};

// main.ts
const worker = new Worker("worker.ts");
worker.postMessage({ data: [1, 2, 3] } as HeavyRequest);

worker.onmessage = (e: MessageEvent<HeavyResponse>) => {
  console.log("Готово:", e.data.result);
};

/**
 * 2. Shared Worker
 *
 * Когда нужен:
 * - Когда нужно шарить данные/ресурсы между разными вкладками одного сайта.
 *   Например: Синхронизировать состояние чата (push-сообщения).
 * - Один WebSocket на все вкладки (чтобы не плодить лишние соединения и не перегружать сервер).
 *
 * Реальный пример:
 * У пользователя открыто несколько вкладок с одной системой управления.
 * Shared Worker держит одно websocket-соединение; все вкладки общаются через этот поток
 * и видят сообщения одновременно. Позволяет сокращать трафик и синхронизировать работу.
 */

// shared.ts
interface SharedMessage {
  type: "inc" | "dec";
}
interface SharedResponse {
  count: number;
}

let count = 0;
onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  port.onmessage = (evt: MessageEvent<SharedMessage>) => {
    if (evt.data.type === "inc") count++;
    if (evt.data.type === "dec") count--;
    const response: SharedResponse = { count };
    port.postMessage(response);
  };
};

// main.ts (во всех вкладках)
const shared = new SharedWorker("shared.ts");
shared.port.start();
shared.port.postMessage({ type: "inc" } as SharedMessage);
shared.port.onmessage = (e: MessageEvent<SharedResponse>) => {
  console.log("Общее состояние:", e.data.count);
};

/**
 * 3. Service Worker
 *
 * Когда нужен:
 * - Для организации офлайн-режима, кеширования файлов, push-уведомлений, подмены/модификации сетевых запросов.
 * - Service Worker работает даже если вкладка неактивна: это "прослойка" между браузером и сетью.
 *
 * Реальный пример:
 * - Кеширует основные файлы сайта (HTML, CSS, картинки), и сайт открывается даже без интернета.
 * - Показывает пуш-уведомления (“пришло новое сообщение, даже если сайт свернут”).
 * - Любая PWA (прогрессивное веб-приложение) обязана использовать service worker.
 */

// service-worker.ts
self.addEventListener("fetch", (e: FetchEvent) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});

// main.ts
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.ts").then((reg) => {
    reg as ServiceWorkerRegistration;
  });
}

/**
 * Вывод по практике:
 * - Web Worker: Подходит для тяжелых вычислений и обработки данных в фоновом режиме.
 * - Shared Worker: Экономит ресурсы и помогает синхронизировать данные между несколькими вкладками/окнами.
 * - Service Worker: Делает приложение доступным офлайн, ускоряет сайт за счет кеша,
 *   позволяет реализовать push-уведомления и фоновую синхронизацию.
 */
