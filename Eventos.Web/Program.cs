using System.Globalization;
using Eventos.Web.Data;
using Eventos.Web.Models;
using Eventos.Web.Repositorios;
using Microsoft.EntityFrameworkCore;

var cultura = new CultureInfo("es-PE");
CultureInfo.DefaultThreadCurrentCulture = cultura;
CultureInfo.DefaultThreadCurrentUICulture = cultura;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

// Pool de contextos: reutiliza instancias entre peticiones en lugar de crear una nueva cada vez.
builder.Services.AddDbContextPool<EventosContext>(opciones =>
    opciones.UseSqlServer(builder.Configuration.GetConnectionString("EventosDB")));

// Brotli/Gzip: el HTML de la portada baja de ~100 KB a una fracción.
builder.Services.AddResponseCompression(opciones =>
{
    opciones.EnableForHttps = true;
    opciones.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    opciones.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});

// Todo el acceso a datos (LINQ y SaveChangesAsync) vive en los repositorios.
builder.Services.AddScoped<EventoRepositorio>();
builder.Services.AddScoped<AsistenteRepositorio>();
builder.Services.AddScoped<InscripcionRepositorio>();
builder.Services.AddScoped<CategoriaRepositorio>();

// Las llamadas fetch (inscripción rápida) envían el token antifalsificación en este encabezado.
builder.Services.AddAntiforgery(opciones => opciones.HeaderName = "RequestVerificationToken");

var app = builder.Build();

// Datos iniciales: se cargan después de aplicar la migración y solo si la tabla está vacía.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EventosContext>();
    await db.Database.MigrateAsync();

    if (!await db.Categorias.AnyAsync())
    {
        db.Categorias.AddRange(
            new Categoria { Nombre = "Tecnología" },
            new Categoria { Nombre = "Música" },
            new Categoria { Nombre = "Negocios" });
        await db.SaveChangesAsync();
    }

    if (!await db.Eventos.AnyAsync())
    {
        var categorias = await db.Categorias.ToDictionaryAsync(c => c.Nombre, c => c.Id);
        var hoy = DateTime.Today;

        Evento Nuevo(string titulo, int dias, int hora, string lugar, int aforo, decimal precio, string categoria, string modalidad) => new()
        {
            Titulo = titulo,
            Fecha = hoy.AddDays(dias).AddHours(hora),
            Lugar = lugar,
            Aforo = aforo,
            Precio = precio,
            CategoriaId = categorias[categoria],
            Modalidad = modalidad
        };

        db.Eventos.AddRange(
            Nuevo("Cloud Day Lima", 14, 9, "Centro de Convenciones, Miraflores", 120, 45.00m, "Tecnología", "Presencial"),
            Nuevo("Taller de IA Generativa", 7, 19, "Zoom", 3, 0m, "Tecnología", "Virtual"),
            Nuevo("Ciberseguridad para Equipos", 18, 16, "Microsoft Teams", 60, 120.00m, "Tecnología", "Virtual"),
            Nuevo("Workshop Docker y Kubernetes", 25, 10, "Campus Tecsup, Santa Anita", 40, 150.00m, "Tecnología", "Presencial"),
            Nuevo("Hackathon Web Perú", -5, 9, "Coworking San Isidro", 80, 10.00m, "Tecnología", "Presencial"),
            Nuevo("Noche de Jazz en Barranco", 21, 20, "Teatro Barranco", 250, 80.00m, "Música", "Presencial"),
            Nuevo("Festival Electrónico Costa Verde", 45, 17, "Playa Makaha, Miraflores", 1500, 250.00m, "Música", "Presencial"),
            Nuevo("Concierto Acústico Rooftop", 10, 19, "Terraza Pardo, Miraflores", 90, 35.00m, "Música", "Presencial"),
            Nuevo("Sesión de DJs en Vivo", 5, 21, "Twitch", 300, 12.00m, "Música", "Virtual"),
            Nuevo("Meetup de Startups", 30, 18, "Google Meet", 500, 15.50m, "Negocios", "Virtual"),
            Nuevo("Cumbre de Liderazgo", 40, 8, "Hotel Westin, San Isidro", 400, 180.00m, "Negocios", "Presencial"),
            Nuevo("Networking de Desayuno", 12, 8, "Café Haiti, Miraflores", 60, 0m, "Negocios", "Presencial"),
            Nuevo("Pitch Night con Inversionistas", 16, 19, "Hub de Innovación, Surco", 150, 25.00m, "Negocios", "Presencial"));
        await db.SaveChangesAsync();
    }

    if (!await db.Asistentes.AnyAsync())
    {
        db.Asistentes.AddRange(
            new Asistente { Nombres = "Ana Torres Quispe", Dni = "70123456", Correo = "ana.torres@correo.com", Telefono = "987654321" },
            new Asistente { Nombres = "Luis Ramírez Soto", Dni = "45871236", Correo = "luis.ramirez@correo.com", Telefono = "912345678" },
            new Asistente { Nombres = "María Fernández Rojas", Dni = "72639481", Correo = "maria.fernandez@correo.com" },
            new Asistente { Nombres = "Carlos Mendoza Vega", Dni = "41958263", Correo = "carlos.mendoza@correo.com", Telefono = "955112233" },
            new Asistente { Nombres = "Lucía Paredes Cruz", Dni = "76284915", Correo = "lucia.paredes@correo.com" });
        await db.SaveChangesAsync();
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseResponseCompression();
app.UseHttpsRedirection();

// Los archivos con ?v=<hash> (asp-append-version) cambian de URL cuando cambia su contenido, así que
// el navegador puede guardarlos un año sin volver a preguntar al servidor en cada navegación.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = contexto =>
    {
        if (contexto.Context.Request.Query.ContainsKey("v"))
        {
            contexto.Context.Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        }
    }
});

app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Eventos}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
