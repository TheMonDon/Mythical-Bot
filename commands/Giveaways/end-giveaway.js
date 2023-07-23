const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class EndGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'end-giveaway',
      description: 'End a giveaway',
      usage: 'end-giveaway <Message ID>',
      requiredArgs: 1,
      category: 'Giveaways',
      aliases: ['endgiveaway', 'gend'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.member.permissions.has('ManageMessages'))
      return this.client.util.errorEmbed(msg, 'You need to have the Manage Nessages permission to delete giveaways');

    const query = args.join(' ');

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedErrorColor);

    if (isNaN(query)) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    const giveaway = this.client.giveawaysManager.giveaways.find(
      (g) => g.messageId === query && g.guildId === msg.guild.id,
    );

    if (!giveaway) return this.client.util.errorEmbed(msg, `Unable to find a giveaway for \`"${query}"\`.`);
    if (giveaway.ended) return this.client.util.errorEmbed(msg, 'That giveaway has already ended.');

    // End the giveaway
    this.client.giveawaysManager
      .end(giveaway.messageId)
      .then(() => {
        // Success message
        msg.channel.send('Giveaway ended!');
      })
      .catch((e) => {
        ErrorEmbed.setTitle(e);
        return msg.channel.send(ErrorEmbed);
      });
  }
}

module.exports = EndGiveaway;
