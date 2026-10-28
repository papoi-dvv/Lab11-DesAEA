using Eventos.Web.Models;
using Eventos.Web.Repositorios;
using Eventos.Web.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Eventos.Web.Controllers;

public class EventosController : Controller
{
    private readonly EventoRepositorio _eventos;

    public EventosController(EventoRepositorio eventos)
    {
        _eventos = eventos;
    }

    public async Task<IActionResult> Index(int? categoriaId, string? precio)
    {
        var eventos = await _eventos.ListarActivosAsync(categoriaId, precio);
        // Sin filtros la lista ya contiene todos los eventos: se reutiliza para los banners y se evita una segunda consulta.
        var todos = categoriaId is null && string.IsNullOrEmpty(precio)
            ? eventos
            : await _eventos.ListarActivosAsync(null);

        var modelo = new EventosIndexVM
        {
            Eventos = eventos,
            Categorias = await _eventos.ListarCategoriasActivasAsync(),
            Banners = ArmarBanners(todos),
            CategoriaId = categoriaId,
            Precio = precio
        };
        return View(modelo);
    }

    /// <summary>Banners automáticos del carrusel: lo más próximo, últimos cupos, gratis y premium.</summary>
    private static List<BannerEvento> ArmarBanners(List<EventoLista> todos)
    {
        var proximos = todos
            .Where(i => i.Evento.Fecha >= DateTime.Now && i.Cupos > 0)
            .ToList();
        var banners = new List<BannerEvento>();

        // Cada banner toma el mejor candidato que aún no haya sido elegido por otro.
        void Agregar(string etiqueta, IEnumerable<EventoLista> candidatos)
        {
            var item = candidatos.FirstOrDefault(c => banners.All(b => b.Item.Evento.Id != c.Evento.Id));
            if (item is not null)
            {
                banners.Add(new BannerEvento { Etiqueta = etiqueta, Item = item });
            }
        }

        Agregar("Lo próximo", proximos);
        Agregar("Últimos cupos", proximos.OrderBy(i => i.Cupos));
        Agregar("Gratis para ti", proximos.Where(i => i.Evento.Precio == 0));
        Agregar("Experiencia premium", proximos.OrderByDescending(i => i.Evento.Precio));
        return banners;
    }

    public async Task<IActionResult> Details(int id)
    {
        var detalle = await _eventos.ObtenerDetalleAsync(id);
        if (detalle is null)
        {
            return NotFound();
        }

        return View(detalle);
    }

    public async Task<IActionResult> Create()
    {
        await CargarListasAsync();
        return View(new Evento { Fecha = DateTime.Today.AddDays(7).AddHours(18) });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Evento evento)
    {
        if (ModelState.IsValid)
        {
            await _eventos.CrearAsync(evento);
            TempData["Exito"] = $"El evento «{evento.Titulo}» fue creado.";
            return RedirectToAction(nameof(Index));
        }

        await CargarListasAsync(evento.CategoriaId, evento.Modalidad);
        return View(evento);
    }

    public async Task<IActionResult> Edit(int id)
    {
        var evento = await _eventos.ObtenerAsync(id);
        if (evento is null)
        {
            return NotFound();
        }

        await CargarListasAsync(evento.CategoriaId, evento.Modalidad);
        return View(evento);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Evento evento)
    {
        if (id != evento.Id)
        {
            return BadRequest();
        }

        if (ModelState.IsValid)
        {
            if (!await _eventos.ActualizarAsync(evento))
            {
                return NotFound();
            }

            TempData["Exito"] = $"El evento «{evento.Titulo}» fue actualizado.";
            return RedirectToAction(nameof(Index));
        }

        await CargarListasAsync(evento.CategoriaId, evento.Modalidad);
        return View(evento);
    }

    public async Task<IActionResult> Delete(int id)
    {
        var evento = await _eventos.ObtenerAsync(id);
        if (evento is null)
        {
            return NotFound();
        }

        return View(evento);
    }

    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int id)
    {
        if (await _eventos.EliminarLogicoAsync(id))
        {
            TempData["Exito"] = "El evento fue eliminado.";
            TempData["DeshacerUrl"] = Url.Action(nameof(Restaurar), new { id });
        }
        else
        {
            TempData["Error"] = "No se encontró el evento.";
        }

        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Restaurar(int id)
    {
        if (await _eventos.RestaurarAsync(id))
        {
            TempData["Exito"] = "El evento fue restaurado.";
        }
        else
        {
            TempData["Error"] = "No se pudo restaurar el evento.";
        }

        return RedirectToAction(nameof(Index));
    }

    private async Task CargarListasAsync(int? categoriaId = null, string? modalidad = null)
    {
        var categorias = await _eventos.ListarCategoriasActivasAsync();
        ViewBag.Categorias = new SelectList(categorias, nameof(Categoria.Id), nameof(Categoria.Nombre), categoriaId);
        ViewBag.Modalidades = new SelectList(Evento.Modalidades, modalidad);
    }
}
