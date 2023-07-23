const Command = require('../../base/Command.js');
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
    if (!msg.member.permissions.has('ManageMessages'))
      return this.client.util.errorEmbed(msg, 'You need to have the Manage Nessages permission to start giveaways');

    const duration = ms(args[0]);
    const winnerCount = parseInt(args[1]);
    const channel = this.client.util.getChannel(msg, args[2]);
    args.shift();
    args.shift();
    args.shift();
    const prize = args.join(' ');

    if (isNaN(winnerCount))
      return this.client.util.errorEmbed(msg, 'Winner amount is not a number', 'Invalid Winner Count');

    if (winnerCount < 1) {
      return this.client.util.errorEmbed(msg, 'Giveaways must have at least 1 winner.', 'Invalid Winner Count');
    } else if (winnerCount > 50) {
      return this.client.util.errorEmbed(msg, 'Giveaways can not have more than 50 winners.', 'Invalid Winner Count');
    }

    if (duration < '10s') {
      return this.client.util.errorEmbed(msg, 'Giveaways must be at least 10 seconds long.', 'Invalid Duration');
    } else if (duration > '42d') {
      return this.client.util.errorEmbed(msg, 'Giveaways cannot be longer than 6 weeks (42d)', 'Invalid Duration');
    }

    if (!channel) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.conf, 'Invalid Channel');

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
