using Eventos.Web.Models;

namespace Eventos.Web.ViewModels;

public class EventoLista
{
    public Evento Evento { get; set; } = null!;
    public string Categoria { get; set; } = string.Empty;
    public int Inscritos { get; set; }
    public int Cupos => Math.Max(Evento.Aforo - Inscritos, 0);
    public int PorcentajeOcupado => Evento.Aforo == 0 ? 0 : Math.Min(Inscritos * 100 / Evento.Aforo, 100);
}

public class BannerEvento
{
    public string Etiqueta { get; set; } = string.Empty;
    public EventoLista Item { get; set; } = null!;
}

public class EventosIndexVM
{
    public List<EventoLista> Eventos { get; set; } = new();
    public List<Categoria> Categorias { get; set; } = new();
    public List<BannerEvento> Banners { get; set; } = new();
    public int? CategoriaId { get; set; }
    public string? Precio { get; set; }
}

public record AsistenteOpcion(int Id, string Nombres, string Dni, bool YaInscrito);
