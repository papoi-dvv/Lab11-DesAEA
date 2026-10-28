using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Eventos.Web.Models;

public class Inscripcion
{
    public const string Confirmada = "Confirmada";
    public const string Cancelada = "Cancelada";

    [Key]
    public int Id { get; set; }

    [Display(Name = "Evento")]
    [Range(1, int.MaxValue, ErrorMessage = "Seleccione un evento")]
    public int EventoId { get; set; }

    [Display(Name = "Asistente")]
    [Range(1, int.MaxValue, ErrorMessage = "Seleccione un asistente")]
    public int AsistenteId { get; set; }

    [Display(Name = "Fecha de inscripción")]
    public DateTime FechaInscripcion { get; set; } = DateTime.Now;

    [Required]
    [StringLength(20)]
    public string Estado { get; set; } = Confirmada;

    [ForeignKey(nameof(EventoId))]
    public Evento? Evento { get; set; }

    [ForeignKey(nameof(AsistenteId))]
    public Asistente? Asistente { get; set; }
}
