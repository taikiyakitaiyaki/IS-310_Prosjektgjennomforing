namespace IS310.Models;

public class GroupVideo
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Path or URL to the video (e.g. "/assets/videos/gruppevideo.mp4").
    // Left null until a real video file is added to Assets/Videos.
    public string? VideoUrl { get; set; }
}
