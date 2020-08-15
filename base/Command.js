class Command {

  constructor (client, {
    name = null,
    description = 'No description provided.',
    longDescription = 'No long description provided.',
    category = 'Miscellaneous',
    usage = 'No usage provided.',
    enabled = true,
    guildOnly = false,
    aliases = new Array(),
    permLevel = 'User'
  }) {
    this.client = client;
    this.conf = { enabled, guildOnly, aliases, permLevel };
    this.help = { name, description, longDescription, category, usage };
  }
}
module.exports = Command;
