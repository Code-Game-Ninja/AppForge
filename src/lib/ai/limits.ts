import { AIError } from './contracts';

export class AILimits {
  private minute: number[] = [];
  private hour: number[] = [];
  private active = 0;
  constructor(private hourlyLimit = 60, private minuteLimit = 10, private concurrency = 2) {}
  checkRequest(now = Date.now()) {
    this.minute = this.minute.filter(time => time > now - 60_000);
    if (this.minute.length >= this.minuteLimit) throw new AIError('rate_limited', 'The assistant is busy. Try again in a minute.', 429, 60);
    this.minute.push(now);
  }
  acquire(now = Date.now()): () => void {
    this.hour = this.hour.filter(time => time > now - 3_600_000);
    if (this.hour.length >= this.hourlyLimit) throw new AIError('budget_reached', 'The assistant has reached its hourly request limit. Try again later.', 429, Math.max(1, Math.ceil((this.hour[0] + 3_600_000 - now) / 1000)));
    if (this.active >= this.concurrency) throw new AIError('busy', 'Two requests are already being answered. Try again shortly.', 429, 10);
    this.hour.push(now); this.active++;
    let released = false;
    return () => { if (!released) { released = true; this.active--; } };
  }
}
