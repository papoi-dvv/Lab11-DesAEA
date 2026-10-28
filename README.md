# Eventos.Web – Lab 11

Aplicación ASP.NET Core MVC (.NET 10) para administrar **eventos, asistentes e inscripciones**, con **Entity Framework Core Code First**: la base `EventosDB` y sus tablas se generan a partir de las clases C# mediante migraciones, sin scripts SQL ni procedimientos almacenados. Todo el acceso a datos se resuelve con LINQ.

## Requisitos

- .NET 10 SDK
- SQL Server (probado con `localhost\SQLEXPRESS`, autenticación de Windows)
- Herramienta `dotnet-ef`: `dotnet tool install --global dotnet-ef`

## Puesta en marcha

1. Revisar la cadena de conexión en `Eventos.Web/appsettings.json` y ajustar `Server` si la instancia es otra. Si SQL Server rechaza el certificado, se mantiene `TrustServerCertificate=True`.

   ```json
   "EventosDB": "Server=localhost\\SQLEXPRESS;Database=EventosDB;Trusted_Connection=True;TrustServerCertificate=True;"
   ```

2. Ejecutar la aplicación desde la carpeta del proyecto:

   ```bash
   cd Eventos.Web
   dotnet run --launch-profile http
   ```

3. Abrir http://localhost:5203.

Al iniciar, la aplicación aplica las migraciones pendientes y carga los datos iniciales **solo si las tablas están vacías**: 3 categorías, 13 eventos y 5 asistentes. No hace falta crear la base a mano.

## Comandos de migración utilizados

Dentro de la carpeta `Eventos.Web`:

```bash
dotnet tool install --global dotnet-ef

dotnet ef migrations add InitialCreate
dotnet ef database update

dotnet ef migrations add AgregarModalidadEvento   # defaultValue cambiado a "Presencial" antes de aplicar
dotnet ef database update

dotnet ef migrations add AgregarTelefonoAsistente
dotnet ef database update
```

Equivalente en Visual Studio (Consola del Administrador de paquetes, con `Microsoft.EntityFrameworkCore.Tools`): `Add-Migration <Nombre>` y `Update-Database`.

La carpeta `Eventos.Web/Migrations` contiene exactamente tres migraciones, más `EventosContextModelSnapshot.cs`.

| Migración | Cambio |
|---|---|
| `InitialCreate` | Tablas `Categorias`, `Eventos`, `Asistentes` e `Inscripciones`, con sus claves foráneas e índices únicos |
| `AgregarModalidadEvento` | `Evento.Modalidad` (obligatoria, máx. 20; `Presencial` o `Virtual`), con valor por defecto `Presencial` para los eventos existentes |
| `AgregarTelefonoAsistente` | `Asistente.Telefono` (opcional, máx. 9 caracteres) |

### Evidencia en SQL Server

```sql
SELECT MigrationId, ProductVersion FROM __EFMigrationsHistory ORDER BY MigrationId;
```

Debe devolver tres filas cuyos `MigrationId` coinciden con los nombres de los archivos de la carpeta `Migrations`.

## Funcionalidades

- **Eventos:** listado con filtro por categoría y por rango de precio, vista en tarjetas o en línea de tiempo, detalle, creación, edición y eliminación lógica con opción de deshacer. Muestra inscritos, cupos disponibles y cuánto falta para que empiece cada evento.
- **Asistentes:** listado y registro, con error en el formulario si el DNI o el correo ya existen.
- **Inscripciones:** listado, cancelación con opción de deshacer y alta con validación de que el evento no haya pasado, de que el asistente no esté ya inscrito y de que haya aforo. También hay un panel de inscripción rápida desde cada evento.
- **Categorías:** alta y eliminación lógica desde la interfaz. Cada categoría recibe automáticamente un color e ícono.
- **Banners:** carrusel automático con lo próximo, últimos cupos, evento gratis y evento premium.
- **Interfaz:** modo claro y oscuro, navegación segmentada con transiciones, toasts, modales de confirmación, dropdown y selector de fecha y hora propios, estados vacíos con ilustración y diseño responsivo.

## Estructura

```
Lab11/
├── README.md
├── .gitignore
└── Eventos.Web/
    ├── Models/          Entidades con Data Annotations (Categoria, Evento, Asistente, Inscripcion)
    ├── Data/            EventosContext (sin Fluent API)
    ├── Migrations/      Las tres migraciones y el snapshot
    ├── Repositorios/    Consultas LINQ async y SaveChangesAsync
    ├── Controllers/     Eventos, Asistentes, Inscripciones y Categorias
    ├── ViewModels/      Modelos de vista y ayudantes de estilo (Estilo.cs)
    ├── Views/           Vistas fuertemente tipadas y parciales (_Aforo, _Cuenta, _Vacio)
    └── wwwroot/         CSS (site, componentes, vistas, interfaz, tema) y JS (ui, dropdown, fecha, banners, inscripcion…)
```

## Decisiones de diseño

- **Repositorios:** los controladores nunca usan `EventosContext`; reciben `EventoRepositorio`, `AsistenteRepositorio`, `InscripcionRepositorio` y `CategoriaRepositorio`, registrados con `AddScoped`.
- **Consultas:** todo es async, las lecturas usan `AsNoTracking()` y no hay SQL escrito a mano (no se usa `FromSqlRaw`).
- **Eliminación lógica:** `Categoria`, `Evento` y `Asistente` se desactivan con `Activo = false`; cancelar una inscripción cambia su `Estado` a `Cancelada`.
- **Esquema sin cambios extra:** los colores por categoría, los banners y la cuenta regresiva se calculan en la aplicación, para mantener las tres migraciones del enunciado.
- **Rendimiento:** compresión Brotli/Gzip, caché de un año para los archivos con `?v=hash`, pool de contextos de EF y una consulta menos en la portada.

## Notas

- Las fuentes (Inter y Sora) se cargan desde Google Fonts, por lo que la primera visita necesita conexión a internet.
- Las transiciones entre páginas usan la API View Transitions (Chrome, Edge, Brave); en otros navegadores solo hay una entrada suave del contenido.
- Para recrear la base desde cero sin tocar los archivos de migración: `dotnet ef database drop` y volver a ejecutar la aplicación o `dotnet ef database update`.
