const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class EndGiveaway extends Command {
  constructor (client) {
    super(client, {
      name: 'end-giveaway',
      description: 'End a giveaway',
      usage: 'end-giveaway <Message ID>',
      category: 'Giveaways',
      aliases: ['endgiveaway', 'gend'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}reroll-giveaway <Message ID>`;
    if (!args || args.length < 1) return msg.channel.send(usage);

    if (!msg.member.permissions.has('MANAGE_MESSAGES')) {
      return msg.channel.send(':x: You need to have the manage messages permissions to end giveaways');
    }

    const query = args.join(' ');

    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Invalid Message ID')
      .setColor('#FF0000');

    if (isNaN(query)) {
      ErrorEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [ErrorEmbed] });
    }

    const giveaway = this.client.giveawaysManager.giveaways.find((g) => g.messageId === query && g.guildId === msg.guild.id);

    // If no giveaway was found
    if (!giveaway) {
      ErrorEmbed.setTitle('Unable to find a giveaway for `' + query + '`.');
      return msg.channel.send(ErrorEmbed);
    }

    if (giveaway.ended) {
      ErrorEmbed.setTitle('The giveaway already ended.');
      return msg.channel.send(ErrorEmbed);
    }

    // End the giveaway
    this.client.giveawaysManager.end(giveaway.messageId)
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
