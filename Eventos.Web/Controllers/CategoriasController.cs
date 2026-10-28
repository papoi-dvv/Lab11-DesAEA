using Eventos.Web.Models;
using Eventos.Web.Repositorios;
using Microsoft.AspNetCore.Mvc;

namespace Eventos.Web.Controllers;

public class CategoriasController : Controller
{
    private readonly CategoriaRepositorio _categorias;

    public CategoriasController(CategoriaRepositorio categorias)
    {
        _categorias = categorias;
    }

    public async Task<IActionResult> Index()
    {
        ViewBag.Conteo = await _categorias.ContarEventosActivosAsync();
        return View(await _categorias.ListarActivasAsync());
    }

    public IActionResult Create()
    {
        return View(new Categoria());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Categoria categoria)
    {
        categoria.Nombre = categoria.Nombre?.Trim() ?? string.Empty;

        if (categoria.Nombre.Length > 0 && await _categorias.ExisteActivaAsync(categoria.Nombre))
        {
            ModelState.AddModelError(nameof(Categoria.Nombre), "Ya existe una categoría con este nombre.");
        }

        if (ModelState.IsValid)
        {
            await _categorias.CrearAsync(categoria);
            TempData["Exito"] = $"La categoría «{categoria.Nombre}» fue creada.";
            return RedirectToAction(nameof(Index));
        }

        return View(categoria);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        if (await _categorias.EliminarLogicoAsync(id))
        {
            TempData["Exito"] = "La categoría fue eliminada.";
            TempData["DeshacerUrl"] = Url.Action(nameof(Restaurar), new { id });
        }
        else
        {
            TempData["Error"] = "No se encontró la categoría.";
        }

        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Restaurar(int id)
    {
        if (await _categorias.RestaurarAsync(id))
        {
            TempData["Exito"] = "La categoría fue restaurada.";
        }
        else
        {
            TempData["Error"] = "No se pudo restaurar la categoría.";
        }

        return RedirectToAction(nameof(Index));
    }
}
