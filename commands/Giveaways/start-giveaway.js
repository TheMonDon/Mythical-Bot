const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const ms = require('ms');
const { getChannel } = require('../../util/Util.js');
const messages = require('../..//util/messages');
const db = require('quick.db');

class StartGiveaway extends Command {
  constructor (client) {
    super(client, {
      name: 'start-giveaway',
      description: 'Start a giveaway',
      usage: 'start-giveaway <duration> <winners> <channel> <prize>',
      category: 'Giveaways',
      aliases: ['create', 'startgiveaway'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}start-giveaway <length> <winners> <channel> <prize>`;
    if (!args || args.length < 4) return msg.channel.send(usage);

    if (!msg.member.permissions.has('MANAGE_MESSAGES')) {
      return msg.channel.send(':x: You need to have the manage messages permissions to start giveaways');
    }

    const duration = ms(args[0]);
    const winners = parseInt(args[1]);
    const channel = getChannel(msg, args[2]);
    args.shift();
    args.shift();
    args.shift();
    const prize = args.join(' ');

    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setTitle('An error occured.')
      .setColor('#FF0000');

    if (isNaN(winners)) {
      ErrorEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [ErrorEmbed] });
    }

    // Start the giveaway
    this.client.giveawaysManager.start(channel, {
      // The giveaway duration
      duration,
      // The giveaway prize
      prize,
      // The giveaway winner count
      winnerCount: winners,
      // Who hosts this giveaway
      hostedBy: msg.member,
      // Embed color
      embedColor: '#FF0000',
      embedColorEnd: '#000000',
      // Messages
      messages
    });

    db.add('global.giveaways', 1);
  }
}

module.exports = StartGiveaway;
