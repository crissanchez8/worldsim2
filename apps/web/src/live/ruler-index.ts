// Titular de cada polity a la fecha (D50: sale de los eventos `ruler.succeeded`, no del estado de
// la cabeza, que va por delante). Índice incremental: cada año del log se mira una vez.
import type { events } from '@ws/core';

export interface Reign {
  /** Estado (k) en que empezó: fin del año de la sucesión. */
  readonly fromK: number;
  readonly person: number;
}

export class RulerIndex {
  private scanned = 0;
  private readonly byPolity = new Map<number, Reign[]>();
  private readonly byPerson = new Map<number, number[]>();

  /** Mira los años nuevos del log (`log[k − 1]` = eventos del año k). */
  update(log: readonly (readonly events.GameEvent[])[]): void {
    for (let i = this.scanned; i < log.length; i++) {
      for (const e of log[i] ?? []) {
        if (e.type !== 'ruler.succeeded') continue;
        const person = e.actors.find((a) => a.kind === 'person')?.id ?? 0;
        const polity = e.actors.find((a) => a.kind === 'polity')?.id ?? 0;
        if (person === 0 || polity === 0) continue;
        const reigns = this.byPolity.get(polity) ?? [];
        reigns.push({ fromK: i + 1, person });
        this.byPolity.set(polity, reigns);
        const ruled = this.byPerson.get(person) ?? [];
        if (!ruled.includes(polity)) ruled.push(polity);
        this.byPerson.set(person, ruled);
      }
    }
    this.scanned = log.length;
  }

  /** Titular de la polity en el estado k (0 = ninguno registrado). */
  rulerAt(polity: number, k: number): number {
    const reigns = this.byPolity.get(polity) ?? [];
    let person = 0;
    for (const r of reigns) {
      if (r.fromK > k) break;
      person = r.person;
    }
    return person;
  }

  /** Gobernantes de la polity hasta el estado k, en orden. */
  reignsUntil(polity: number, k: number): readonly Reign[] {
    return (this.byPolity.get(polity) ?? []).filter((r) => r.fromK <= k);
  }

  /** Polities que gobernó la persona (en algún momento registrado). */
  ruledBy(person: number): readonly number[] {
    return this.byPerson.get(person) ?? [];
  }
}
