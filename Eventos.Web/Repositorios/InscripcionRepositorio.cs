using Eventos.Web.Data;
using Eventos.Web.Models;
using Eventos.Web.ViewModels;
using Microsoft.EntityFrameworkCore;

namespace Eventos.Web.Repositorios;

public class InscripcionRepositorio
{
    private readonly EventosContext _context;

    public InscripcionRepositorio(EventosContext context)
    {
        _context = context;
    }

    public async Task<List<Inscripcion>> ListarAsync()
    {
        return await _context.Inscripciones
            .AsNoTracking()
            .Include(i => i.Evento)
            .Include(i => i.Asistente)
            .OrderByDescending(i => i.FechaInscripcion)
            .ToListAsync();
    }

    public async Task<List<Evento>> ListarEventosActivosAsync()
    {
        return await _context.Eventos
            .AsNoTracking()
            .Where(e => e.Activo)
            .OrderBy(e => e.Fecha)
            .ToListAsync();
    }

    public async Task<List<Asistente>> ListarAsistentesActivosAsync()
    {
        return await _context.Asistentes
            .AsNoTracking()
            .Where(a => a.Activo)
            .OrderBy(a => a.Nombres)
            .ToListAsync();
    }

    public async Task<Evento?> ObtenerEventoAsync(int eventoId)
    {
        return await _context.Eventos
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventoId && e.Activo);
    }

    public async Task<bool> ExisteAsistenteActivoAsync(int asistenteId)
    {
        return await _context.Asistentes
            .AsNoTracking()
            .AnyAsync(a => a.Id == asistenteId && a.Activo);
    }

    public async Task<bool> YaInscritoAsync(int eventoId, int asistenteId)
    {
        return await _context.Inscripciones
            .AsNoTracking()
            .AnyAsync(i => i.EventoId == eventoId
                        && i.AsistenteId == asistenteId
                        && i.Estado == Inscripcion.Confirmada);
    }

    public async Task<int> ContarConfirmadasAsync(int eventoId)
    {
        return await _context.Inscripciones
            .AsNoTracking()
            .CountAsync(i => i.EventoId == eventoId && i.Estado == Inscripcion.Confirmada);
    }

    public async Task CrearAsync(int eventoId, int asistenteId)
    {
        _context.Inscripciones.Add(new Inscripcion
        {
            EventoId = eventoId,
            AsistenteId = asistenteId,
            FechaInscripcion = DateTime.Now,
            Estado = Inscripcion.Confirmada
        });
        await _context.SaveChangesAsync();
    }

    public async Task<List<AsistenteOpcion>> ListarAsistentesParaEventoAsync(int eventoId)
    {
        return await _context.Asistentes
            .AsNoTracking()
            .Where(a => a.Activo)
            .OrderBy(a => a.Nombres)
            .Select(a => new AsistenteOpcion(
                a.Id,
                a.Nombres,
                a.Dni,
                a.Inscripciones.Any(i => i.EventoId == eventoId && i.Estado == Inscripcion.Confirmada)))
            .ToListAsync();
    }

    /// <summary>Deshace una cancelación. Devuelve null si se pudo o el motivo si no.</summary>
    public async Task<string?> ReactivarAsync(int id)
    {
        var inscripcion = await _context.Inscripciones
            .Include(i => i.Evento)
            .FirstOrDefaultAsync(i => i.Id == id && i.Estado == Inscripcion.Cancelada);
        if (inscripcion?.Evento is null || !inscripcion.Evento.Activo)
        {
            return "La inscripción ya no se puede reactivar.";
        }

        if (inscripcion.Evento.Fecha < DateTime.Now)
        {
            return "El evento ya pasó.";
        }

        if (await YaInscritoAsync(inscripcion.EventoId, inscripcion.AsistenteId))
        {
            return "El asistente ya tiene otra inscripción confirmada en este evento.";
        }

        if (await ContarConfirmadasAsync(inscripcion.EventoId) >= inscripcion.Evento.Aforo)
        {
            return "El aforo del evento se completó, no se puede reactivar.";
        }

        inscripcion.Estado = Inscripcion.Confirmada;
        await _context.SaveChangesAsync();
        return null;
    }

    public async Task<bool> CancelarAsync(int id)
    {
        var inscripcion = await _context.Inscripciones
            .FirstOrDefaultAsync(i => i.Id == id && i.Estado == Inscripcion.Confirmada);
        if (inscripcion is null)
        {
            return false;
        }

        inscripcion.Estado = Inscripcion.Cancelada;
        await _context.SaveChangesAsync();
        return true;
    }
}
