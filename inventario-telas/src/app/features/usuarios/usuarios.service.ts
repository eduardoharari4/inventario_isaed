import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Invitacion, Profile, Rol } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  constructor(private supabase: SupabaseService) {}

  async listarPerfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return data as Profile[];
  }

  async listarInvitaciones(): Promise<Invitacion[]> {
    const { data, error } = await this.supabase.client
      .from('invitaciones')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Invitacion[];
  }

  async invitar(email: string, rol: Rol): Promise<void> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const { error } = await this.supabase.client.from('invitaciones').insert({
      email: email.toLowerCase().trim(),
      rol,
      invitado_por: userData.user?.id ?? null
    });
    if (error) throw error;
  }

  async cancelarInvitacion(email: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('invitaciones')
      .delete()
      .eq('email', email);
    if (error) throw error;
  }

  async cambiarRol(perfilId: string, rol: Rol): Promise<void> {
    const { error } = await this.supabase.client
      .from('profiles')
      .update({ rol })
      .eq('id', perfilId);
    if (error) throw error;
  }
}
