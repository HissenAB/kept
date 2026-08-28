import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UserPreferences {
  useTwentyFourHourTime: boolean;
  moveCompletedChecklistItemsToBottom: boolean;
  richLinkPreviews: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  useTwentyFourHourTime: false,
  moveCompletedChecklistItemsToBottom: true,
  richLinkPreviews: true,
};

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly storageKey = 'kept_user_preferences';
  readonly preferences$ = new BehaviorSubject<UserPreferences>(this.load());

  get value() {
    return this.preferences$.value;
  }

  update(patch: Partial<UserPreferences>) {
    const next = { ...this.value, ...patch };
    this.preferences$.next(next);
    this.save(next);
  }

  private load(): UserPreferences {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { ...DEFAULT_PREFERENCES };
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return {
        useTwentyFourHourTime: parsed.useTwentyFourHourTime === true,
        moveCompletedChecklistItemsToBottom: parsed.moveCompletedChecklistItemsToBottom !== false,
        richLinkPreviews: parsed.richLinkPreviews !== false,
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  private save(value: UserPreferences) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(value));
    } catch {}
  }
}
