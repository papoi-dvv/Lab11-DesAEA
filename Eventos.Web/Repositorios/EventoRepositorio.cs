using Eventos.Web.Data;
using Eventos.Web.Models;
using Eventos.Web.ViewModels;
using Microsoft.EntityFrameworkCore;

namespace Eventos.Web.Repositorios;

public class EventoRepositorio
{
    private readonly EventosContext _context;

    public EventoRepositorio(EventosContext context)
    {
        _context = context;
    }

    public async Task<List<EventoLista>> ListarActivosAsync(int? categoriaId, string? precio = null)
    {
        var consulta = _context.Eventos
            .AsNoTracking()
            .Where(e => e.Activo);

        if (categoriaId.HasValue)
        {
            consulta = consulta.Where(e => e.CategoriaId == categoriaId.Value);
        }

        consulta = precio switch
        {
            "gratis" => consulta.Where(e => e.Precio == 0),
            "bajo" => consulta.Where(e => e.Precio > 0 && e.Precio < 30),
            "medio" => consulta.Where(e => e.Precio >= 30 && e.Precio < 100),
            "alto" => consulta.Where(e => e.Precio >= 100),
            _ => consulta
        };

        return await consulta
            .OrderBy(e => e.Fecha)
            .Select(e => new EventoLista
            {
                Evento = e,
                Categoria = e.Categoria!.Nombre,
                Inscritos = e.Inscripciones.Count(i => i.Estado == Inscripcion.Confirmada)
            })
            .ToListAsync();
    }

    public async Task<EventoLista?> ObtenerDetalleAsync(int id)
    {
        return await _context.Eventos
            .AsNoTracking()
            .Where(e => e.Id == id && e.Activo)
            .Select(e => new EventoLista
            {
                Evento = e,
                Categoria = e.Categoria!.Nombre,
                Inscritos = e.Inscripciones.Count(i => i.Estado == Inscripcion.Confirmada)
            })
            .FirstOrDefaultAsync();
    }

    public async Task<Evento?> ObtenerAsync(int id)
    {
        return await _context.Eventos
            .AsNoTracking()
            .Include(e => e.Categoria)
            .FirstOrDefaultAsync(e => e.Id == id && e.Activo);
    }

    public async Task<List<Categoria>> ListarCategoriasActivasAsync()
    {
        return await _context.Categorias
            .AsNoTracking()
            .Where(c => c.Activo)
            .OrderBy(c => c.Nombre)
            .ToListAsync();
    }

    public async Task CrearAsync(Evento evento)
    {
        evento.Activo = true;
        _context.Eventos.Add(evento);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ActualizarAsync(Evento datos)
    {
        var evento = await _context.Eventos.FirstOrDefaultAsync(e => e.Id == datos.Id && e.Activo);
        if (evento is null)
        {
            return false;
        }

        evento.Titulo = datos.Titulo;
        evento.Fecha = datos.Fecha;
        evento.Lugar = datos.Lugar;
        evento.Aforo = datos.Aforo;
        evento.Precio = datos.Precio;
        evento.CategoriaId = datos.CategoriaId;
        evento.Modalidad = datos.Modalidad;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestaurarAsync(int id)
    {
        var evento = await _context.Eventos.FirstOrDefaultAsync(e => e.Id == id && !e.Activo);
        if (evento is null)
        {
            return false;
        }

        evento.Activo = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarLogicoAsync(int id)
    {
        var evento = await _context.Eventos.FirstOrDefaultAsync(e => e.Id == id && e.Activo);
        if (evento is null)
        {
            return false;
        }

        evento.Activo = false;
        await _context.SaveChangesAsync();
        return true;
    }
}
