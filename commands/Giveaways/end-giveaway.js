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
    const usage = `Incorrect Usage: ${msg.settings.prefix}End-Giveaway <Message ID>`;

    if (!msg.member.permissions.has('ManageMessages')) {
      return msg.channel.send(':x: You need to have the Manage Messages permissions to end giveaways');
    }

    const query = args.join(' ');

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Invalid Message ID')
      .setColor(msg.settings.embedErrorColor);

    if (isNaN(query)) {
      ErrorEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [ErrorEmbed] });
    }

    const giveaway = this.client.giveawaysManager.giveaways.find(
      (g) => g.messageId === query && g.guildId === msg.guild.id,
    );

    // If no giveaway was found
    if (!giveaway) {
      ErrorEmbed.setTitle('Unable to find a giveaway for `' + query + '`.');
      return msg.channel.send(ErrorEmbed);
    }

    if (giveaway.ended) {
      ErrorEmbed.setTitle('That giveaway has already ended.');
      return msg.channel.send(ErrorEmbed);
    }

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
