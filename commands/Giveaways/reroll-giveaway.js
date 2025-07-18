const Command = require('../../base/Command.js');

class RerollGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'reroll-giveaway',
      description: 'Reroll a giveaway',
      usage: 'reroll-giveaway <Message ID>',
      requiredArgs: 1,
      category: 'Giveaways',
      aliases: ['reroll', 'rerollgiveaway', 'greroll'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.member.permissions.has('ManageMessages'))
      return this.client.util.errorEmbed(msg, 'You need to have the Manage Messages permission to reroll giveaways');
    const query = args.join('');

    if (isNaN(query)) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    const giveaway = this.client.giveawaysManager.giveaways.find(
      (g) => g.messageId === query && g.guildId === msg.guild.id,
    );

    if (!giveaway) return this.client.util.errorEmbed(msg, `Unable to find a giveaway for \`"${query}"\`.`);
    if (!giveaway.ended) return this.client.util.errorEmbed(msg, 'That giveaway has already ended.');

    // Reroll the giveaway
    this.client.giveawaysManager
      .reroll(giveaway.messageId)
      .then(() => {
        // Success message
        msg.channel.send('Giveaway rerolled!');
      })
      .catch((e) => {
        return this.client.util.errorEmbed(msg, e);
      });
  }
}

module.exports = RerollGiveaway;
