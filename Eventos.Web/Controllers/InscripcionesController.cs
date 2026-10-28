using Eventos.Web.Models;
using Eventos.Web.Repositorios;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Eventos.Web.Controllers;

public class InscripcionesController : Controller
{
    private readonly InscripcionRepositorio _inscripciones;

    public InscripcionesController(InscripcionRepositorio inscripciones)
    {
        _inscripciones = inscripciones;
    }

    public async Task<IActionResult> Index()
    {
        return View(await _inscripciones.ListarAsync());
    }

    public async Task<IActionResult> Create(int? eventoId)
    {
        await CargarListasAsync(eventoId, null);
        return View(new Inscripcion { EventoId = eventoId ?? 0 });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Inscripcion inscripcion)
    {
        if (ModelState.GetFieldValidationState(nameof(Inscripcion.EventoId)) != ModelValidationState.Invalid
            && ModelState.GetFieldValidationState(nameof(Inscripcion.AsistenteId)) != ModelValidationState.Invalid)
        {
            foreach (var (campo, mensaje) in await ValidarAsync(inscripcion.EventoId, inscripcion.AsistenteId))
            {
                ModelState.AddModelError(campo, mensaje);
            }
        }

        if (ModelState.IsValid)
        {
            await _inscripciones.CrearAsync(inscripcion.EventoId, inscripcion.AsistenteId);
            TempData["Exito"] = "Inscripción confirmada.";
            return RedirectToAction(nameof(Index));
        }

        await CargarListasAsync(inscripcion.EventoId, inscripcion.AsistenteId);
        return View(inscripcion);
    }

    /// <summary>Asistentes activos para el panel de inscripción rápida, marcando quién ya está inscrito.</summary>
    [HttpGet]
    public async Task<IActionResult> Asistentes(int eventoId)
    {
        return Json(await _inscripciones.ListarAsistentesParaEventoAsync(eventoId));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Rapida(int eventoId, int asistenteId)
    {
        var errores = await ValidarAsync(eventoId, asistenteId);
        if (errores.Count > 0)
        {
            return Json(new { ok = false, mensaje = errores[0].Mensaje });
        }

        await _inscripciones.CrearAsync(eventoId, asistenteId);
        var evento = await _inscripciones.ObtenerEventoAsync(eventoId);
        var inscritos = await _inscripciones.ContarConfirmadasAsync(eventoId);
        return Json(new
        {
            ok = true,
            mensaje = "Inscripción confirmada.",
            inscritos,
            cupos = Math.Max((evento?.Aforo ?? 0) - inscritos, 0)
        });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Cancelar(int id)
    {
        if (await _inscripciones.CancelarAsync(id))
        {
            TempData["Exito"] = "La inscripción fue cancelada.";
            TempData["DeshacerUrl"] = Url.Action(nameof(Reactivar), new { id });
        }
        else
        {
            TempData["Error"] = "No se pudo cancelar la inscripción.";
        }

        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Reactivar(int id)
    {
        var motivo = await _inscripciones.ReactivarAsync(id);
        if (motivo is null)
        {
            TempData["Exito"] = "La inscripción volvió a estar confirmada.";
        }
        else
        {
            TempData["Error"] = motivo;
        }

        return RedirectToAction(nameof(Index));
    }

    /// <summary>Reglas de negocio de una inscripción: evento vigente, sin duplicado y con aforo disponible.</summary>
    private async Task<List<(string Campo, string Mensaje)>> ValidarAsync(int eventoId, int asistenteId)
    {
        var errores = new List<(string, string)>();
        var evento = await _inscripciones.ObtenerEventoAsync(eventoId);
        if (evento is null)
        {
            errores.Add((nameof(Inscripcion.EventoId), "El evento seleccionado no existe."));
        }
        else
        {
            if (evento.Fecha < DateTime.Now)
            {
                errores.Add((nameof(Inscripcion.EventoId), "El evento ya pasó, no se puede inscribir."));
            }

            if (await _inscripciones.YaInscritoAsync(eventoId, asistenteId))
            {
                errores.Add((nameof(Inscripcion.AsistenteId), "El asistente ya está inscrito en este evento."));
            }

            if (await _inscripciones.ContarConfirmadasAsync(eventoId) >= evento.Aforo)
            {
                errores.Add((nameof(Inscripcion.EventoId), "El aforo del evento está completo."));
            }
        }

        if (!await _inscripciones.ExisteAsistenteActivoAsync(asistenteId))
        {
            errores.Add((nameof(Inscripcion.AsistenteId), "El asistente seleccionado no existe."));
        }

        return errores;
    }

    private async Task CargarListasAsync(int? eventoId, int? asistenteId)
    {
        var eventos = (await _inscripciones.ListarEventosActivosAsync())
            .Select(e => new { e.Id, Texto = $"{e.Titulo} · {e.Fecha:dd/MM/yyyy HH:mm}" });
        var asistentes = (await _inscripciones.ListarAsistentesActivosAsync())
            .Select(a => new { a.Id, Texto = $"{a.Nombres} · DNI {a.Dni}" });

        ViewBag.Eventos = new SelectList(eventos, "Id", "Texto", eventoId);
        ViewBag.Asistentes = new SelectList(asistentes, "Id", "Texto", asistenteId);
    }
}
