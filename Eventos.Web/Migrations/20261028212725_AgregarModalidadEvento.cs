using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Eventos.Web.Migrations
{
    /// <inheritdoc />
    public partial class AgregarModalidadEvento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Modalidad",
                table: "Eventos",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Presencial");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Modalidad",
                table: "Eventos");
        }
    }
}
