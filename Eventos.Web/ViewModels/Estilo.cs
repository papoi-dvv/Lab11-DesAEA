using Microsoft.AspNetCore.Html;

namespace Eventos.Web.ViewModels;

/// <summary>Clases CSS e íconos que dependen de los datos: paleta por categoría y color del precio.</summary>
public static class Estilo
{
    private static readonly Dictionary<string, int> Paletas = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Tecnología"] = 0,
        ["Música"] = 1,
        ["Negocios"] = 2
    };

    private static readonly string[] Iconos =
    {
        "<path d=\"M8 8l-5 4 5 4M16 8l5 4-5 4M14 4l-4 16\"/>",
        "<path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/>",
        "<rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18\"/>",
        "<path d=\"M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19l7-7\"/>",
        "<path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z\"/>",
        "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18\"/>"
    };

    private static int Indice(string nombre) =>
        Paletas.TryGetValue(nombre, out var fijo)
            ? fijo
            : 3 + nombre.Aggregate(0, (acc, c) => (acc * 31 + c) % 997) % (Iconos.Length - 3); // las categorías nuevas usan las paletas 3-5 para no repetir las base

    public static string Categoria(string nombre) => $"cat-{Indice(nombre)}";

    public static IHtmlContent Icono(string categoria, string clase = "") =>
        new HtmlString($"<svg class=\"{clase}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">{Iconos[Indice(categoria)]}</svg>");

    public static string Precio(decimal precio) => precio switch
    {
        0 => "precio--gratis",
        < 30 => "precio--bajo",
        < 100 => "precio--medio",
        _ => "precio--alto"
    };

    /// <summary>Texto de cuenta regresiva ("Mañana", "En 5 días"…). El mismo cálculo existe en wwwroot/js/ui.js para refrescarlo en vivo.</summary>
    public static string Faltan(DateTime fecha, DateTime? ahora = null)
    {
        var hoy = ahora ?? DateTime.Now;
        var diff = fecha - hoy;
        if (diff.TotalHours < -3) { return "Finalizado"; }
        if (diff.TotalMinutes < 0) { return "En curso"; }
        if (diff.TotalMinutes < 60) { return $"Empieza en {Math.Max((int)diff.TotalMinutes, 1)} min"; }
        var dias = (fecha.Date - hoy.Date).Days;
        if (dias == 0) { return $"Hoy · en {(int)diff.TotalHours} h"; }
        if (dias == 1) { return "Mañana"; }
        if (dias < 14) { return $"En {dias} días"; }
        if (dias < 60) { return $"En {dias / 7} semanas"; }
        return $"En {dias / 30} meses";
    }

    public static string PrecioTexto(decimal precio) => precio == 0 ? "Gratis" : "S/ " + precio.ToString("N2");
}
