using Eventos.Web.Data;
using Eventos.Web.Models;
using Microsoft.EntityFrameworkCore;

namespace Eventos.Web.Repositorios;

public class CategoriaRepositorio
{
    private readonly EventosContext _context;

    public CategoriaRepositorio(EventosContext context)
    {
        _context = context;
    }

    public async Task<List<Categoria>> ListarActivasAsync()
    {
        return await _context.Categorias
            .AsNoTracking()
            .Where(c => c.Activo)
            .OrderBy(c => c.Nombre)
            .ToListAsync();
    }

    /// <summary>Cantidad de eventos activos por categoría, para mostrarla en el listado.</summary>
    public async Task<Dictionary<int, int>> ContarEventosActivosAsync()
    {
        return await _context.Eventos
            .AsNoTracking()
            .Where(e => e.Activo)
            .GroupBy(e => e.CategoriaId)
            .Select(g => new { g.Key, Total = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Total);
    }

    public async Task<bool> ExisteActivaAsync(string nombre)
    {
        return await _context.Categorias.AsNoTracking().AnyAsync(c => c.Nombre == nombre && c.Activo);
    }

    /// <summary>Crea la categoría; si existía desactivada con el mismo nombre (índice único), la reactiva.</summary>
    public async Task CrearAsync(Categoria categoria)
    {
        var existente = await _context.Categorias.FirstOrDefaultAsync(c => c.Nombre == categoria.Nombre);
        if (existente is null)
        {
            categoria.Activo = true;
            _context.Categorias.Add(categoria);
        }
        else
        {
            existente.Activo = true;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<bool> EliminarLogicoAsync(int id)
    {
        var categoria = await _context.Categorias.FirstOrDefaultAsync(c => c.Id == id && c.Activo);
        if (categoria is null)
        {
            return false;
        }

        categoria.Activo = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestaurarAsync(int id)
    {
        var categoria = await _context.Categorias.FirstOrDefaultAsync(c => c.Id == id && !c.Activo);
        if (categoria is null)
        {
            return false;
        }

        categoria.Activo = true;
        await _context.SaveChangesAsync();
        return true;
    }
}
