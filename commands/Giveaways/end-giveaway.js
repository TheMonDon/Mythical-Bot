const Command = require('../../base/Command.js');

class EndGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'end-giveaway',
      description: 'End a giveaway',
      usage: 'end-giveaway <Message ID>',
      requiredArgs: 1,
      category: 'Giveaways',
      aliases: ['endgiveaway', 'gend', 'giveawayend'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.member.permissions.has('ManageMessages'))
      return this.client.util.errorEmbed(msg, 'You need to have the Manage Messages permission to delete giveaways');

    const query = args.join(' ');

    if (isNaN(query)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Message ID');
    }

    const giveaway = this.client.giveawaysManager.giveaways.find(
      (g) => g.messageId === query && g.guildId === msg.guild.id,
    );

    if (!giveaway) return this.client.util.errorEmbed(msg, `Unable to find a giveaway for \`"${query}"\`.`);
    if (giveaway.ended) return this.client.util.errorEmbed(msg, 'That giveaway has already ended.');

    // Throw the 'are you sure?' text at them.
    const response = await this.client.util.awaitReply(
      msg,
      `Are you sure you want to end the giveaway for \`${giveaway.prize}\`?`,
    );

    // If they respond with yes, continue.
    if (this.client.util.yes.includes(response)) {
      // End the giveaway
      this.client.giveawaysManager
        .end(giveaway.messageId)
        .then(() => {
          // Success message
          return msg.channel.send('The giveaway has ended.');
        })
        .catch((error) => {
          return this.client.util.errorEmbed(msg, error, 'An error occurred');
        });
    }

    // If they respond with no, we inform them that the action has been cancelled.
    else if (this.client.util.no.includes(response)) {
      return msg.reply('Action cancelled.');
    }
  }
}

module.exports = EndGiveaway;
