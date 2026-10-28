using Eventos.Web.Models;
using Eventos.Web.Repositorios;
using Microsoft.AspNetCore.Mvc;

namespace Eventos.Web.Controllers;

public class AsistentesController : Controller
{
    private readonly AsistenteRepositorio _asistentes;

    public AsistentesController(AsistenteRepositorio asistentes)
    {
        _asistentes = asistentes;
    }

    public async Task<IActionResult> Index()
    {
        return View(await _asistentes.ListarActivosAsync());
    }

    public IActionResult Create()
    {
        return View(new Asistente());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Asistente asistente)
    {
        if (!string.IsNullOrWhiteSpace(asistente.Dni) && await _asistentes.ExisteDniAsync(asistente.Dni))
        {
            ModelState.AddModelError(nameof(Asistente.Dni), "Ya existe un asistente con este DNI.");
        }

        if (!string.IsNullOrWhiteSpace(asistente.Correo) && await _asistentes.ExisteCorreoAsync(asistente.Correo))
        {
            ModelState.AddModelError(nameof(Asistente.Correo), "Ya existe un asistente con este correo.");
        }

        if (ModelState.IsValid)
        {
            await _asistentes.CrearAsync(asistente);
            TempData["Exito"] = $"{asistente.Nombres} fue registrado como asistente.";
            return RedirectToAction(nameof(Index));
        }

        return View(asistente);
    }
}
