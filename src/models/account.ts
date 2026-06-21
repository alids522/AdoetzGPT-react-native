// UserAccount — port of lib/models.dart.
import { boolValue, stringValue, type Json } from './coerce';

export class UserAccount {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string | null = null,
    public readonly displayName: string | null = null,
    public readonly isGuest: boolean = false,
  ) {}

  get label(): string {
    return this.displayName != null && this.displayName.length > 0 ? this.displayName : this.username;
  }

  static guest(): UserAccount {
    return new UserAccount('guest-local', 'guest', null, 'Guest', true);
  }

  static fromJson(json?: Json | null): UserAccount {
    if (!json) return UserAccount.guest();
    const isGuest = boolValue(json.isGuest);
    const username = stringValue(
      json.username,
      stringValue(
        json.email,
        stringValue(json.displayName, isGuest ? 'guest' : 'user'),
      ),
    );
    return new UserAccount(
      stringValue(json.id, `${isGuest ? 'guest' : 'user'}-${username}`),
      username,
      json.email == null ? null : stringValue(json.email),
      stringValue(json.displayName, isGuest ? 'Guest' : username),
      isGuest,
    );
  }

  toJson(): Json {
    const out: Json = {
      id: this.id,
      username: this.username,
      displayName: this.displayName ?? this.username,
    };
    if (this.email != null) out.email = this.email;
    if (this.isGuest) out.isGuest = true;
    return out;
  }
}
