using IS310.Models;
using Microsoft.AspNetCore.Mvc;

namespace IS310.Controllers;

public class HomeController : ControllerBase
{
    private readonly string _viewFolder;

    public HomeController(IWebHostEnvironment env)
    {
        _viewFolder = Path.Combine(env.ContentRootPath, "View", "Home");
    }

    [HttpGet("/")]
    public ContentResult Index()
    {
        var teamMembers = new List<GroupMember>
        {
            new() { Name = "Navn Navnesen", Role = "Prosjektleder", Tags = new() { "Eksempel", "Eksempel", "Eksempel" } },
            new() { Name = "Navn Navnesen", Role = "Utvikler", Tags = new() { "Eksempel", "Eksempel" } },
            new() { Name = "Navn Navnesen", Role = "Designer", Tags = new() { "Eksempel", "Eksempel", "Eksempel" } },
            new() { Name = "Navn Navnesen", Role = "Utvikler", Tags = new() { "Eksempel", "Eksempel" } },
            new() { Name = "Navn Navnesen", Role = "Utvikler", Tags = new() { "Eksempel", "Eksempel" } },
            new() { Name = "Navn Navnesen", Role = "Utvikler", Tags = new() { "Eksempel", "Eksempel" } },
            new() { Name = "Navn Navnesen", Role = "Utvikler", Tags = new() { "Eksempel", "Eksempel" } },
            new() { Name = "Navn Navnesen", Role = "QA-tester", Tags = new() { "Eksempel", "Eksempel" } },
            new() { Name = "Navn Navnesen", Role = "Markedsføring", Tags = new() { "Eksempel", "Eksempel" } },
        };

        var teamHtml = string.Join(Environment.NewLine, teamMembers.Select((m, i) =>
        {
            var tagsHtml = string.Join(Environment.NewLine, m.Tags.Select(t => $"<span>{t}</span>"));
            return $"""
                <div class="team-row reveal">
                    <span class="team-row-index">#{i + 1:00}</span>
                    <div class="team-row-media">
                        <div class="team-row-avatar" aria-hidden="true">{m.Name[..1]}</div>
                    </div>
                    <div class="team-row-info">
                        <h3>{m.Name}</h3>
                        <p class="team-row-subtitle">{m.Role}</p>
                        <div class="team-row-tags">
                            {tagsHtml}
                        </div>
                    </div>
                </div>
                """;
        }));

        var html = ReadView("Index.html").Replace("<!--TEAM_MEMBERS-->", teamHtml);
        return HtmlContent(html);
    }

    [HttpGet("/Home/Prosjektbeskrivelse")]
    public ContentResult Prosjektbeskrivelse()
    {
        var project = new ProjectInfo
        {
            Goals = new List<string>
            {
                "Definer hovedmålet med prosjektet",
                "Beskriv delmål og avgrensninger",
                "Forklar hvem prosjektet er laget for"
            },
            Technologies = new List<string> { "ASP.NET Core", "C#", "JavaScript", "HTML/CSS" }
        };

        var goalsHtml = string.Join(Environment.NewLine, project.Goals.Select(g => $"<li>{g}</li>"));
        var techHtml = string.Join(Environment.NewLine, project.Technologies.Select(t => $"<li>{t}</li>"));

        var html = ReadView("Prosjektbeskrivelse.html")
            .Replace("<!--PROJECT_GOALS-->", goalsHtml)
            .Replace("<!--PROJECT_TECHNOLOGIES-->", techHtml);

        return HtmlContent(html);
    }

    [HttpGet("/Home/GruppeVideo")]
    public ContentResult GruppeVideo()
    {
        var video = new GroupVideo { VideoUrl = null };

        var videoSection = !string.IsNullOrEmpty(video.VideoUrl)
            ? $"""<div class="video-wrapper reveal"><video controls src="{video.VideoUrl}"></video></div>"""
            : """
              <div class="video-placeholder reveal">
                  <p>Videoen er ikke lastet opp ennå.</p>
                  <p class="hint">Legg videofilen i <code>Assets/Videos</code> og sett <code>VideoUrl</code> i <code>HomeController.GruppeVideo()</code>.</p>
              </div>
              """;

        var html = ReadView("GruppeVideo.html").Replace("<!--VIDEO_SECTION-->", videoSection);
        return HtmlContent(html);
    }

    private string ReadView(string fileName) =>
        System.IO.File.ReadAllText(Path.Combine(_viewFolder, fileName));

    private static ContentResult HtmlContent(string html) =>
        new() { Content = html, ContentType = "text/html; charset=utf-8" };
}
