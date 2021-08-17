class Command {
  constructor (client, {
    name = null,
    description = 'No description provided.',
    longDescription = 'No long description provided.',
    category = 'Miscellaneous',
    usage = 'No usage provided.',
    enabled = true,
    guildOnly = false,
    aliases = [],
    permLevel = 'User',
    nsfw = false,
    requiredArgs = 0
  }) {
    this.client = client;
    this.conf = { enabled, guildOnly, aliases, permLevel, nsfw, requiredArgs };
    this.help = { name, description, longDescription, category, usage };
  }
}

module.exports = Command;
