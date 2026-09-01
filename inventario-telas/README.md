# Inventario de Telas

Sistema web para llevar el inventario de telas por rollo, generar notas de remisión
(que descuentan el inventario automáticamente), controlar clientes y sus saldos, con
roles de **admin** y **vendedor**.

- **Frontend**: Angular 20 + Angular Material (responsivo, funciona en celular).
- **Backend**: [Supabase](https://supabase.com) (Postgres + autenticación + seguridad
  por roles). No hay servidor propio que mantener.

## 1. Configurar Supabase (una sola vez)

1. Crea una cuenta gratis en [supabase.com](https://supabase.com) y un proyecto nuevo.
2. En el panel del proyecto, ve a **SQL Editor > New query**, pega todo el contenido
   de [`supabase/schema.sql`](./supabase/schema.sql) y dale **Run**. Esto crea todas
   las tablas, la seguridad por roles y las funciones necesarias.
3. Ve a **Project Settings > Data API** y copia:
   - **Project URL**
   - **anon public key** (es seguro usarla en el navegador; la seguridad real la da
     la base de datos, no esta llave).
4. Abre este proyecto y pega esos dos valores en:
   - `src/environments/environment.development.ts` (para cuando pruebas en tu compu)
   - `src/environments/environment.ts` (para cuando publiques la app)

## 2. Crear tu usuario administrador

1. Corre la app (`npm start`) y entra a `http://localhost:4310`.
2. Da clic en **¿No tienes cuenta? Regístrate** y crea tu cuenta (nombre, correo,
   contraseña). Por seguridad, toda cuenta nueva se crea como **vendedor**.
3. En Supabase, ve a **SQL Editor** y corre (cambia el correo):

   ```sql
   update public.profiles
   set rol = 'admin'
   where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
   ```

4. Cierra sesión y vuelve a entrar en la app: ya tendrás acceso de administrador
   (verás "Saldos de clientes" y "Datos de la empresa" en el menú).
5. Para dar de alta a tus vendedores, ellos mismos se registran desde la pantalla de
   login; quedan como "vendedor" automáticamente (no ven saldos ni pagos).
6. Ve a **Datos de la empresa** y llena el nombre, RFC, dirección y teléfono: eso
   aparece impreso en cada remisión.

## 3. Desarrollo local

```bash
npm install
npm start
```

Abre `http://localhost:4310`.

## 4. Publicar en la web (para entrar desde cualquier lugar)

1. Sube este proyecto a un repositorio de GitHub.
2. Crea una cuenta gratis en [Vercel](https://vercel.com) o [Netlify](https://netlify.com).
3. Conecta el repositorio; en la configuración de build usa:
   - **Build command**: `npm run build`
   - **Output directory**: `dist/inventario-telas/browser`
4. Publica. Te dan una URL pública con HTTPS, accesible desde cualquier dispositivo,
   incluido el celular.

## Notas del modelo de negocio

- Cada **rollo** es una unidad de inventario con su propio metraje; no lleva clave
  manual, el sistema le asigna un id.
- Una **remisión** ES la venta: al crearla seleccionas los rollos vendidos (agrupados
  por tela) y el sistema calcula Subtotal + IVA (16%) + Total, descuenta esos rollos
  del inventario, y suma el cargo al saldo del cliente — todo en una sola operación
  atómica en la base de datos (no puede vender el mismo rollo dos veces).
- El **saldo** de un cliente = suma de sus remisiones activas − suma de sus pagos.
  Solo el rol **admin** puede ver saldos y pagos; un vendedor no tiene acceso a esa
  información ni desde la base de datos (no solo está oculta en la pantalla).
- Cancelar una remisión regresa los rollos a "disponible" y ya no cuenta en el saldo.
