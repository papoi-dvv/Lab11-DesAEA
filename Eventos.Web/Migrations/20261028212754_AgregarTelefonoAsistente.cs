using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Eventos.Web.Migrations
{
    /// <inheritdoc />
    public partial class AgregarTelefonoAsistente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Telefono",
                table: "Asistentes",
                type: "nvarchar(9)",
                maxLength: 9,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Telefono",
                table: "Asistentes");
        }
    }
}
