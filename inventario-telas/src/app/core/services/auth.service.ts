import { Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly profile = signal<Profile | null>(null);
  /** true mientras se resuelve la sesión inicial al cargar la app. */
  readonly loading = signal(true);

  constructor(private supabase: SupabaseService) {
    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      if (session) {
        this.loadProfile(session.user.id);
      } else {
        this.profile.set(null);
        this.loading.set(false);
      }
    });
  }

  private async loadProfile(userId: string) {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    this.profile.set(data as Profile | null);
    this.loading.set(false);
  }

  isAdmin(): boolean {
    return this.profile()?.rol === 'admin';
  }

  async signIn(email: string, password: string) {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUp(email: string, password: string, nombre: string) {
    const { error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    });
    if (error) throw error;
  }

  async signOut() {
    await this.supabase.client.auth.signOut();
  }
}
