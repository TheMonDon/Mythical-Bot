const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const ms = require('ms');
const db = require('quick.db');

class StartGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'start-giveaway',
      description: 'Start a giveaway',
      usage: 'start-giveaway <Duration> <Winners> <Channel> <Prize>',
      requiredArgs: 4,
      category: 'Giveaways',
      aliases: ['gcreate', 'startgiveaway', 'gstart'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Start-Giveaway <Duration> <Winners> <Channel> <Prize>`;

    if (!msg.member.permissions.has('ManageMessages')) {
      return msg.channel.send(':x: You need to have the Manage Messages permissions to start giveaways');
    }

    const duration = ms(args[0]);
    const winnerCount = parseInt(args[1]);
    const channel = this.client.util.getChannel(msg, args[2]);
    args.shift();
    args.shift();
    args.shift();
    const prize = args.join(' ');

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const ErrorEmbed = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Incorrect Parameter')
      .setColor(msg.settings.embedErrorColor);

    if (isNaN(winnerCount)) {
      ErrorEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [ErrorEmbed] });
    }

    if (winnerCount < 1) {
      ErrorEmbed.setDescription('Giveaways must have at least 1 winner.');
      return msg.channel.send({ embeds: [ErrorEmbed] });
    } else if (winnerCount > 50) {
      ErrorEmbed.setDescription('Giveaways can not have more than 50 winners.');
      return msg.channel.send({ embeds: [ErrorEmbed] });
    }

    if (duration < '10s') {
      ErrorEmbed.setDescription('Giveaways must be at least 10 seconds long.');
      return msg.channel.send({ embeds: [ErrorEmbed] });
    } else if (duration > '42d') {
      ErrorEmbed.setDescription('Giveaways cannot be longer than 6 weeks (42d).');
      return msg.channel.send({ embeds: [ErrorEmbed] });
    }

    if (!channel) {
      ErrorEmbed.setDescription('I could not find that channel, please try again.');
      return msg.channel.send({ embeds: [ErrorEmbed] });
    }

    // Start the giveaway
    this.client.giveawaysManager.start(channel, {
      // The giveaway duration
      duration,
      // The giveaway prize
      prize,
      // The giveaway winner count
      winnerCount,
      // Who hosts this giveaway
      hostedBy: msg.member,
      // Messages
      messages: {
        giveaway: '',
        giveawayEnded: '',
        noWinner: 'Giveaway cancelled, no valid participants.',
        winners: 'Winners:',
        endedAt: 'Ended at',
        winMessage: {
          content: 'Congratulations, {winners}! You won **{this.prize}**!',
          replyToGiveaway: true,
        },
      },
    });

    db.add('global.giveaways', 1);

    return msg.channel.send(`:tada: Done! The giveaway for ${prize} is starting in ${channel}`);
  }
}

module.exports = StartGiveaway;
