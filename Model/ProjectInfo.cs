namespace IS310.Models;

public class ProjectInfo
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Goals { get; set; } = new();
    public List<string> Technologies { get; set; } = new();
}
