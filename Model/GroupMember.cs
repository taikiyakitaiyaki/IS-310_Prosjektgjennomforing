namespace IS310.Models;

public class GroupMember
{
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
}
