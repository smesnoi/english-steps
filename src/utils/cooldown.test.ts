import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createCooldown } from './cooldown';

// Запуск: npm test  (tsx --test ...)

/** Управляемые «часы» вместо Date.now. */
function clock(start = 1_000_000) {
  let time = start;
  return { now: () => time, advance: (ms: number) => { time += ms; } };
}

describe('createCooldown', () => {
  it('до запуска паузы нет', () => {
    const { now } = clock();
    const cooldown = createCooldown(30_000, now);

    assert.equal(cooldown.until(), 0);
    assert.equal(cooldown.remainingMs(), 0);
  });

  it('после start пауза идёт ровно durationMs и заканчивается сама', () => {
    const time = clock();
    const cooldown = createCooldown(30_000, time.now);

    cooldown.start();
    assert.equal(cooldown.remainingMs(), 30_000);
    assert.equal(cooldown.until(), 1_030_000);

    time.advance(12_000);
    assert.equal(cooldown.remainingMs(), 18_000);
    time.advance(17_999);
    assert.equal(cooldown.remainingMs(), 1);
    time.advance(1);
    assert.equal(cooldown.remainingMs(), 0);
    time.advance(60_000);
    assert.equal(cooldown.remainingMs(), 0, 'остаток не уходит в минус');
  });

  it('повторный start начинает отсчёт заново', () => {
    const time = clock();
    const cooldown = createCooldown(30_000, time.now);

    cooldown.start();
    time.advance(20_000);
    cooldown.start();

    assert.equal(cooldown.remainingMs(), 30_000);
  });

  it('until — стабильное число между вызовами без start (нужно для useSyncExternalStore)', () => {
    const time = clock();
    const cooldown = createCooldown(5_000, time.now);
    cooldown.start();
    const first = cooldown.until();
    time.advance(2_000);

    assert.equal(cooldown.until(), first);
  });

  it('подписчики узнают о запуске; после отписки — нет', () => {
    const cooldown = createCooldown(1_000, clock().now);
    let calls = 0;
    const unsubscribe = cooldown.subscribe(() => {
      calls += 1;
    });

    cooldown.start();
    cooldown.start();
    assert.equal(calls, 2);

    unsubscribe();
    cooldown.start();
    assert.equal(calls, 2);
  });

  it('нулевая и отрицательная длительность — пауза сразу закончена', () => {
    for (const duration of [0, -500]) {
      const cooldown = createCooldown(duration, clock().now);
      cooldown.start();
      assert.equal(cooldown.remainingMs(), 0, String(duration));
    }
  });

  it('независимые паузы не влияют друг на друга; общую можно разделить между потребителями', () => {
    const time = clock();
    const shared = createCooldown(30_000, time.now);
    const other = createCooldown(30_000, time.now);

    shared.start();
    const seenByFirst = shared.remainingMs();
    const seenBySecond = shared.remainingMs();

    assert.equal(seenByFirst, seenBySecond);
    assert.equal(other.remainingMs(), 0);
  });
});
